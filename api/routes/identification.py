from __future__ import annotations

from datetime import datetime
import json
from pathlib import Path
from threading import Lock
from typing import Any, Optional

import cv2
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, Query
import numpy as np
from PIL import Image, ImageOps
from pydantic import BaseModel, Field
import torch
import torch.nn as nn
import torch.nn.functional as F

from ai_models.facenet_partial_integration.inference_pipeline import load_model
from ai_models.facenet_partial_integration.model_def import build_eval_transform
from auth import Auth
from data_access.access import DB
from data_access.session import WorkflowSessionStore


identification_routes = APIRouter()

FACENET_DIR = Path(__file__).resolve().parents[1] / "ai_models" / "facenet_partial_integration"
FACENET_WEIGHTS_PATH = FACENET_DIR / "facenet_partial_state_dict.pth"
FACENET_META_PATH = FACENET_DIR / "model_meta.json"

DEFAULT_MODEL_NAME = "FaceNet"
DEFAULT_MODEL_VERSION = "1.0"
DEFAULT_THRESHOLD = 0.6177526116371155
DEFAULT_EMBEDDING_DIM = 128
DEFAULT_IMAGE_SIZE = 224

if FACENET_META_PATH.exists():
    with open(FACENET_META_PATH, "r", encoding="utf-8") as meta_file:
        meta = json.load(meta_file)
        DEFAULT_THRESHOLD = float(meta.get("threshold", DEFAULT_THRESHOLD))
        DEFAULT_EMBEDDING_DIM = int(meta.get("embedding_dim", DEFAULT_EMBEDDING_DIM))
        DEFAULT_IMAGE_SIZE = int(meta.get("image_size", DEFAULT_IMAGE_SIZE))
        DEFAULT_MODEL_VERSION = str(meta.get("source_run_dir", DEFAULT_MODEL_VERSION))


def _sanitize_filename_component(raw_value: str) -> str:
    sanitized = "".join(char if char.isalnum() else "_" for char in str(raw_value))
    return sanitized.strip("_") or "value"


GRADCAM_CACHE_TOKEN = (
    f"{_sanitize_filename_component(DEFAULT_MODEL_NAME)}_"
    f"{_sanitize_filename_component(DEFAULT_MODEL_VERSION)}_"
    f"{DEFAULT_EMBEDDING_DIM}"
)

_MODEL_CACHE: dict[str, Any] = {"model": None, "device": None, "transform": None}
_MODEL_LOCK = Lock()


class IdentifyRequest(BaseModel):
    annotation_ids: Optional[list[str]] = Field(default=None, alias="annotationIds")
    detections: Optional[list[dict[str, Any]]] = None
    session_id: Optional[str] = Field(default=None, alias="sessionId")
    persist_results: bool = Field(default=True, alias="persistResults")
    reuse_stored_embeddings: bool = Field(default=False, alias="reuseStoredEmbeddings")
    threshold: Optional[float] = None
    top_k: int = Field(default=3, alias="topK")


class CreateIdentityRequest(BaseModel):
    annotation_id: str = Field(alias="annotationId")


class AssignIdentityRequest(BaseModel):
    annotation_id: str = Field(alias="annotationId")
    fish_id: str = Field(alias="fishId")


class UpdateFishAliasRequest(BaseModel):
    fish_alias: Optional[str] = Field(default=None, alias="fishAlias", max_length=80)


class GenerateVisualizationRequest(BaseModel):
    annotation_id: Optional[str] = Field(default=None, alias="annotationId")
    query_annotation_id: Optional[str] = Field(default=None, alias="queryAnnotationId")
    match_annotation_id: Optional[str] = Field(default=None, alias="matchAnnotationId")
    visualization_variant: str = Field(default="gradcam", alias="visualizationVariant")
    force_regenerate: bool = Field(default=False, alias="forceRegenerate")


class AssignPairRequest(BaseModel):
    fish_id: str = Field(alias="fishId")
    pair_fish_id: str = Field(alias="pairFishId")


def _normalize_fish_alias(raw_alias: Optional[str]) -> Optional[str]:
    if raw_alias is None:
        return None
    normalized = str(raw_alias).strip()
    return normalized or None


def _extract_fish_alias(fish_doc: Optional[dict[str, Any]]) -> Optional[str]:
    if not fish_doc:
        return None
    # Support records written before the fish_name -> fish_alias rename.
    return _normalize_fish_alias(fish_doc.get("fish_alias") or fish_doc.get("fish_name"))


def _build_fish_alias_lookup(fish_docs: list[dict[str, Any]]) -> dict[str, Optional[str]]:
    fish_alias_by_id: dict[str, Optional[str]] = {}
    for fish_doc in fish_docs:
        fish_id = str(fish_doc.get("_id")) if fish_doc.get("_id") else None
        if not fish_id:
            continue
        fish_alias_by_id[fish_id] = _extract_fish_alias(fish_doc)
    return fish_alias_by_id


def _hydrate_match_fish_aliases(
    matches: list[dict[str, Any]],
    fish_alias_by_id: dict[str, Optional[str]],
) -> list[dict[str, Any]]:
    hydrated_matches: list[dict[str, Any]] = []
    for match in matches:
        fish_id_raw = match.get("fishId") or match.get("fish_id")
        fish_id = str(fish_id_raw) if fish_id_raw else None
        fish_alias = fish_alias_by_id.get(fish_id) if fish_id else None

        hydrated = dict(match)
        hydrated["fish_alias"] = fish_alias
        hydrated["fishAlias"] = fish_alias
        hydrated_matches.append(hydrated)
    return hydrated_matches


def _canonical_pair_ids(fish_id_1: str, fish_id_2: str) -> tuple[str, str]:
    first_id = str(fish_id_1 or "").strip()
    second_id = str(fish_id_2 or "").strip()
    return tuple(sorted([first_id, second_id]))


def _extract_pair_partner_id(pair_log: dict[str, Any], fish_id: str) -> Optional[str]:
    fish_id_a = str(pair_log.get("fish_id_a") or "")
    fish_id_b = str(pair_log.get("fish_id_b") or "")
    if fish_id == fish_id_a:
        return fish_id_b or None
    if fish_id == fish_id_b:
        return fish_id_a or None
    return None


def _safe_object_id(raw_value: str) -> Optional[ObjectId]:
    try:
        return ObjectId(raw_value)
    except (InvalidId, TypeError):
        return None


def _extract_annotation_ids(request: IdentifyRequest) -> list[str]:
    annotation_ids: list[str] = []
    if request.annotation_ids:
        annotation_ids.extend([annotation_id for annotation_id in request.annotation_ids if annotation_id])

    if request.detections:
        for detection in request.detections:
            annotation_id = detection.get("annotation_id") or detection.get("annotationId")
            if annotation_id:
                annotation_ids.append(annotation_id)

    seen: set[str] = set()
    ordered_unique: list[str] = []
    for annotation_id in annotation_ids:
        if annotation_id not in seen:
            seen.add(annotation_id)
            ordered_unique.append(annotation_id)
    return ordered_unique


def _load_model_bundle() -> tuple[torch.nn.Module, torch.device, Any]:
    cached_model = _MODEL_CACHE.get("model")
    cached_device = _MODEL_CACHE.get("device")
    cached_transform = _MODEL_CACHE.get("transform")
    if cached_model is not None and cached_device is not None and cached_transform is not None:
        return cached_model, cached_device, cached_transform

    with _MODEL_LOCK:
        cached_model = _MODEL_CACHE.get("model")
        cached_device = _MODEL_CACHE.get("device")
        cached_transform = _MODEL_CACHE.get("transform")
        if cached_model is None or cached_device is None or cached_transform is None:
            if not FACENET_WEIGHTS_PATH.exists():
                raise FileNotFoundError(f"Facenet weights not found at {FACENET_WEIGHTS_PATH}")
            model, device = load_model(
                FACENET_WEIGHTS_PATH,
                embedding_dim=DEFAULT_EMBEDDING_DIM,
            )
            transform = build_eval_transform(image_size=DEFAULT_IMAGE_SIZE)
            _MODEL_CACHE["model"] = model
            _MODEL_CACHE["device"] = device
            _MODEL_CACHE["transform"] = transform
    return _MODEL_CACHE["model"], _MODEL_CACHE["device"], _MODEL_CACHE["transform"]


def _compute_confidence(distance: Optional[float], threshold: float) -> float:
    if distance is None:
        return 1.0
    if threshold > 0:
        return max(0.0, min(1.0, 1.0 - (distance / threshold)))
    return float(1.0 / (1.0 + max(distance, 0.0)))


def _crop_annotation(image_path: Path, annotation: dict[str, Any]) -> Image.Image:
    image = Image.open(image_path).convert("RGB")
    image_width, image_height = image.size

    x_min = max(0, int(annotation.get("x_min", 0)))
    y_min = max(0, int(annotation.get("y_min", 0)))
    width = max(1, int(annotation.get("width", 1)))
    height = max(1, int(annotation.get("height", 1)))

    x_max = min(image_width, x_min + width)
    y_max = min(image_height, y_min + height)

    if x_max <= x_min or y_max <= y_min:
        raise ValueError("Invalid annotation box after clipping")

    return image.crop((x_min, y_min, x_max, y_max))


def _save_query_crop(crop_image: Image.Image, user_id: str, annotation_id: str) -> str:
    crop_dir = Path("uploads") / user_id / "crops"
    crop_dir.mkdir(parents=True, exist_ok=True)
    crop_file_path = crop_dir / f"{annotation_id}.jpg"
    crop_image.save(crop_file_path, format="JPEG")
    return f"uploads/{user_id}/crops/{annotation_id}.jpg"


def _normalize_visualization_variant(raw_variant: Optional[str]) -> str:
    variant = str(raw_variant or "gradcam").strip().lower()
    aliases = {
        "gray": "bw",
        "grayscale": "bw",
        "blackwhite": "bw",
        "black_white": "bw",
        "enhance": "enhanced",
        "contrast": "enhanced",
    }
    return aliases.get(variant, variant)


def _get_supported_visualization_variants() -> set[str]:
    return {"gradcam", "bw", "enhanced"}


def _get_visualization_cache_rel_path(user_id: str, annotation_id: str, variant: str) -> str:
    safe_variant = _sanitize_filename_component(variant)
    safe_annotation_id = _sanitize_filename_component(annotation_id)
    return (
        f"uploads/{user_id}/visualizations/{safe_variant}/"
        f"{safe_annotation_id}_{GRADCAM_CACHE_TOKEN}.jpg"
    )


def _resolve_annotation_crop_rel_path(
    *,
    annotation_id: str,
    user_id: str,
    annotations_collection: Any,
    uploads_collection: Any,
) -> tuple[Optional[str], Optional[str]]:
    annotation_oid = _safe_object_id(annotation_id)
    if annotation_oid is None:
        return None, "Invalid annotation id"

    annotation = annotations_collection.find_one({"_id": annotation_oid})
    if annotation is None:
        return None, "Annotation not found"

    upload_id = str(annotation.get("user_upload_id", ""))
    upload_oid = _safe_object_id(upload_id)
    if upload_oid is None:
        return None, "Invalid user_upload_id on annotation"

    upload_doc = uploads_collection.find_one({"_id": upload_oid, "user_id": user_id})
    if upload_doc is None:
        return None, "Annotation does not belong to authenticated user"

    existing_crop_rel_path = f"uploads/{user_id}/crops/{annotation_id}.jpg"
    if Path(existing_crop_rel_path).exists():
        return existing_crop_rel_path, None

    source_image_path = Path("uploads") / user_id / f"{upload_id}.jpg"
    if not source_image_path.exists():
        return None, "Image file not found for annotation"

    try:
        crop_image = _crop_annotation(source_image_path, annotation)
    except ValueError as crop_error:
        return None, str(crop_error)

    return _save_query_crop(crop_image, user_id, annotation_id), None


def _find_last_conv_layer(model: nn.Module) -> Optional[nn.Module]:
    for module in reversed(list(model.modules())):
        if isinstance(module, nn.Conv2d):
            return module
    return None


def _render_gradcam_variant(
    crop_image: Image.Image,
    model: nn.Module,
    device: torch.device,
    transform: Any,
) -> Image.Image:
    target_layer = _find_last_conv_layer(model)
    if target_layer is None:
        raise RuntimeError("No convolutional layer was found for Grad-CAM.")

    input_tensor = transform(crop_image).unsqueeze(0).to(device)
    activations: list[torch.Tensor] = []

    def _capture_activations(_: nn.Module, __: tuple[torch.Tensor, ...], output: torch.Tensor) -> None:
        activations.append(output)

    handle = target_layer.register_forward_hook(_capture_activations)
    try:
        embeddings = model(input_tensor)
    finally:
        handle.remove()

    if not activations:
        raise RuntimeError("Failed to capture Grad-CAM activations.")

    feature_map = activations[0]
    target_dimension = int(torch.argmax(torch.abs(embeddings[0])).item())
    target_score = embeddings[0, target_dimension]

    gradients = torch.autograd.grad(
        outputs=target_score,
        inputs=feature_map,
        retain_graph=False,
        create_graph=False,
        allow_unused=False,
    )[0]

    weights = gradients.mean(dim=(2, 3), keepdim=True)
    cam = torch.relu((weights * feature_map).sum(dim=1, keepdim=True))
    cam = F.interpolate(cam, size=input_tensor.shape[-2:], mode="bilinear", align_corners=False)
    cam = cam.squeeze(0).squeeze(0)

    cam_min = float(cam.min().item())
    cam_max = float(cam.max().item())
    if cam_max > cam_min:
        cam = (cam - cam_min) / (cam_max - cam_min)
    else:
        cam = torch.zeros_like(cam)

    cam_uint8 = (cam.detach().cpu().numpy() * 255).astype(np.uint8)
    heatmap_bgr = cv2.applyColorMap(cam_uint8, cv2.COLORMAP_JET)
    heatmap_rgb = cv2.cvtColor(heatmap_bgr, cv2.COLOR_BGR2RGB)

    base_image = crop_image.resize((cam_uint8.shape[1], cam_uint8.shape[0]), Image.Resampling.BILINEAR)
    base_rgb = np.array(base_image, dtype=np.uint8)
    blended = cv2.addWeighted(base_rgb, 0.5, heatmap_rgb, 0.5, 0)
    return Image.fromarray(blended)


def _render_bw_variant(crop_image: Image.Image) -> Image.Image:
    return ImageOps.grayscale(crop_image).convert("RGB")


def _render_enhanced_variant(crop_image: Image.Image) -> Image.Image:
    rgb_image = np.array(crop_image.convert("RGB"), dtype=np.uint8)
    lab = cv2.cvtColor(rgb_image, cv2.COLOR_RGB2LAB)
    channel_l, channel_a, channel_b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(8, 8))
    enhanced_l = clahe.apply(channel_l)
    enhanced_lab = cv2.merge((enhanced_l, channel_a, channel_b))
    enhanced_rgb = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2RGB)

    blurred = cv2.GaussianBlur(enhanced_rgb, (0, 0), 1.2)
    sharpened = cv2.addWeighted(enhanced_rgb, 1.3, blurred, -0.3, 0)
    return Image.fromarray(np.clip(sharpened, 0, 255).astype(np.uint8))


def _render_visualization_variant(
    *,
    variant: str,
    crop_image: Image.Image,
    model_bundle: Optional[tuple[nn.Module, torch.device, Any]] = None,
) -> Image.Image:
    normalized_variant = _normalize_visualization_variant(variant)
    if normalized_variant == "bw":
        return _render_bw_variant(crop_image)
    if normalized_variant == "enhanced":
        return _render_enhanced_variant(crop_image)
    if normalized_variant == "gradcam":
        if model_bundle is None:
            raise RuntimeError("Grad-CAM requires a loaded model bundle.")
        model, device, transform = model_bundle
        return _render_gradcam_variant(crop_image, model, device, transform)
    raise ValueError(f"Unsupported visualization variant: {variant}")


def _get_or_create_visualization_rel_path(
    *,
    annotation_id: str,
    user_id: str,
    variant: str,
    force_regenerate: bool,
    annotations_collection: Any,
    uploads_collection: Any,
    model_bundle: Optional[tuple[nn.Module, torch.device, Any]] = None,
) -> tuple[Optional[str], Optional[str]]:
    normalized_variant = _normalize_visualization_variant(variant)
    cache_rel_path = _get_visualization_cache_rel_path(user_id, annotation_id, normalized_variant)
    cache_abs_path = Path(cache_rel_path)
    if cache_abs_path.exists() and not force_regenerate:
        return cache_rel_path, None

    crop_rel_path, crop_error = _resolve_annotation_crop_rel_path(
        annotation_id=annotation_id,
        user_id=user_id,
        annotations_collection=annotations_collection,
        uploads_collection=uploads_collection,
    )
    if crop_error:
        return None, crop_error

    if not crop_rel_path:
        return None, "Crop path could not be resolved."

    crop_abs_path = Path(crop_rel_path)
    if not crop_abs_path.exists():
        return None, "Crop image file not found."

    try:
        crop_image = Image.open(crop_abs_path).convert("RGB")
        visualization_image = _render_visualization_variant(
            variant=normalized_variant,
            crop_image=crop_image,
            model_bundle=model_bundle,
        )
        cache_abs_path.parent.mkdir(parents=True, exist_ok=True)
        visualization_image.save(cache_abs_path, format="JPEG", quality=92)
    except Exception as render_error:
        return None, f"Failed to render {normalized_variant}: {render_error}"

    return cache_rel_path, None


def _embed_query_crop(
    crop_image: Image.Image,
    model: torch.nn.Module,
    device: torch.device,
    transform: Any,
) -> torch.Tensor:
    tensor = transform(crop_image).unsqueeze(0).to(device)
    with torch.no_grad():
        embedding = model(tensor)
    return embedding.squeeze(0).cpu().to(torch.float32)


def _load_query_embedding_from_store(
    collection: Any,
    user_id: str,
    annotation_id: str,
) -> tuple[Optional[torch.Tensor], Optional[str]]:
    embedding_doc = collection.find_one(
        {
            "user_id": user_id,
            "annotation_id": annotation_id,
            "ai_model_name": DEFAULT_MODEL_NAME,
            "embedding_dim": DEFAULT_EMBEDDING_DIM,
        },
        sort=[("date_created", -1)],
    )
    if embedding_doc is None:
        return None, None

    embedding_values = embedding_doc.get("embeddings")
    if not isinstance(embedding_values, list) or len(embedding_values) != DEFAULT_EMBEDDING_DIM:
        return None, embedding_doc.get("crop_path")

    try:
        query_embedding = torch.tensor([float(v) for v in embedding_values], dtype=torch.float32)
    except (TypeError, ValueError):
        return None, embedding_doc.get("crop_path")

    return query_embedding, embedding_doc.get("crop_path")


def _upsert_query_embedding(
    collection: Any,
    *,
    user_id: str,
    annotation_id: str,
    source_session_id: Optional[str],
    user_upload_id: str,
    crop_path: Optional[str],
    query_embedding: torch.Tensor,
) -> None:
    now = datetime.utcnow()
    collection.update_one(
        {
            "user_id": user_id,
            "annotation_id": annotation_id,
            "ai_model_name": DEFAULT_MODEL_NAME,
            "embedding_dim": DEFAULT_EMBEDDING_DIM,
        },
        {
            "$set": {
                "source_session_id": source_session_id,
                "user_upload_id": user_upload_id,
                "crop_path": crop_path,
                "embeddings": [float(value) for value in query_embedding.tolist()],
                "ai_model_name": DEFAULT_MODEL_NAME,
                "ai_model_version": DEFAULT_MODEL_VERSION,
                "embedding_dim": DEFAULT_EMBEDDING_DIM,
                "date_modified": now,
            },
            "$setOnInsert": {
                "date_created": now,
            },
        },
        upsert=True,
    )


def _load_gallery_embeddings(
    collection: Any, user_id: str
) -> tuple[torch.Tensor, list[str], list[dict[str, Any]]]:
    pipeline = [
        {
            "$match": {
                "user_id": user_id,
                "fish_id": {"$exists": True, "$nin": [None, ""]},
                "ai_model_name": DEFAULT_MODEL_NAME,
                "embedding_dim": DEFAULT_EMBEDDING_DIM,
            }
        },
        {"$sort": {"fish_id": 1, "date_created": -1}},
        {"$group": {"_id": "$fish_id", "docs": {"$push": "$$ROOT"}}},
        {"$project": {"docs": {"$slice": ["$docs", 5]}}},
        {"$unwind": "$docs"},
        {"$replaceRoot": {"newRoot": "$docs"}},
    ]
    docs = list(collection.aggregate(pipeline))

    gallery_rows: list[list[float]] = []
    gallery_fish_ids: list[str] = []
    gallery_meta: list[dict[str, Any]] = []
    for doc in docs:
        embedding_values = doc.get("embeddings")
        if not isinstance(embedding_values, list):
            continue
        if len(embedding_values) != DEFAULT_EMBEDDING_DIM:
            continue
        user_upload_id = doc.get("user_upload_id")
        annotation_id = doc.get("annotation_id")
        gallery_rows.append([float(value) for value in embedding_values])
        gallery_fish_ids.append(str(doc["fish_id"]))
        gallery_meta.append(
            {
                "fish_id": str(doc["fish_id"]),
                "user_upload_id": str(user_upload_id) if user_upload_id else None,
                "annotation_id": str(annotation_id) if annotation_id else None,
                "crop_path": doc.get("crop_path"),
            }
        )

    if not gallery_rows:
        return torch.empty((0, DEFAULT_EMBEDDING_DIM), dtype=torch.float32), [], []

    return torch.tensor(gallery_rows, dtype=torch.float32), gallery_fish_ids, gallery_meta


def _resolve_match_paths(meta: dict[str, Any], user_id: str) -> tuple[Optional[str], Optional[str]]:
    annotation_id = meta.get("annotation_id")
    upload_id = meta.get("user_upload_id")
    crop_path = meta.get("crop_path")

    thumbnail_path: Optional[str] = None
    if isinstance(crop_path, str) and crop_path:
        thumbnail_path = crop_path
    elif annotation_id:
        derived_crop = f"uploads/{user_id}/crops/{annotation_id}.jpg"
        if Path(derived_crop).exists():
            thumbnail_path = derived_crop

    image_path: Optional[str] = None
    if upload_id:
        image_path = f"uploads/{user_id}/{upload_id}.jpg"
        if thumbnail_path is None:
            thumbnail_path = image_path

    return thumbnail_path, image_path


def _rank_matches(
    query_embedding: torch.Tensor,
    gallery_embeddings: torch.Tensor,
    gallery_fish_ids: list[str],
    gallery_meta: list[dict[str, Any]],
    user_id: str,
    query_annotation_id: Optional[str],
    threshold: float,
    top_k: int,
) -> tuple[Optional[str], Optional[float], list[dict[str, Any]]]:
    if gallery_embeddings.numel() == 0 or len(gallery_fish_ids) == 0:
        return None, None, []

    distances = torch.cdist(query_embedding.unsqueeze(0), gallery_embeddings).squeeze(0)
    ranked_indices = torch.argsort(distances).tolist()

    best_by_fish: dict[str, tuple[float, int]] = {}
    for index in ranked_indices:
        meta = gallery_meta[index] if index < len(gallery_meta) else {}
        candidate_annotation_id = (
            str(meta.get("annotation_id")) if isinstance(meta, dict) and meta.get("annotation_id") else None
        )
        # Do not return the query annotation itself as a match.
        if query_annotation_id and candidate_annotation_id == query_annotation_id:
            continue
        fish_id = gallery_fish_ids[index]
        distance = float(distances[index])
        if fish_id not in best_by_fish:
            best_by_fish[fish_id] = (distance, index)

    if not best_by_fish:
        return None, None, []

    sorted_fish = sorted(best_by_fish.items(), key=lambda pair: pair[1][0])
    top_matches = []
    for fish_id, (distance, index) in sorted_fish[:top_k]:
        meta = gallery_meta[index] if index < len(gallery_meta) else {}
        thumbnail_path, image_path = _resolve_match_paths(meta, user_id)
        match_item: dict[str, Any] = {
            "fishId": fish_id,
            "distance": distance,
            "confidence": _compute_confidence(distance, threshold),
        }
        annotation_id = meta.get("annotation_id") if isinstance(meta, dict) else None
        if annotation_id:
            match_item["annotationId"] = annotation_id
        if thumbnail_path:
            match_item["thumbnailPath"] = thumbnail_path
            match_item["thumbnail_path"] = thumbnail_path
        if image_path:
            match_item["imagePath"] = image_path
            match_item["image_path"] = image_path
        top_matches.append(match_item)

    best_fish_id, (best_distance, _) = sorted_fish[0]
    assigned_id = best_fish_id if best_distance <= threshold else None
    return assigned_id, float(best_distance), top_matches


def _unique_top_matches(matches: Any, top_k: int) -> list[dict[str, Any]]:
    if not isinstance(matches, list):
        return []

    unique: list[dict[str, Any]] = []
    seen_fish_ids: set[str] = set()

    for raw_match in matches:
        if not isinstance(raw_match, dict):
            continue
        fish_id_raw = raw_match.get("fishId") or raw_match.get("fish_id")
        if not fish_id_raw:
            continue
        fish_id = str(fish_id_raw)
        if fish_id in seen_fish_ids:
            continue
        seen_fish_ids.add(fish_id)

        normalized = dict(raw_match)
        normalized["fishId"] = fish_id
        unique.append(normalized)
        if len(unique) >= top_k:
            break

    return unique


def _prune_embeddings(collection: Any, user_id: str, fish_id: str) -> None:
    stale_docs = list(
        collection.find(
            {
                "user_id": user_id,
                "fish_id": fish_id,
                "ai_model_name": DEFAULT_MODEL_NAME,
                "embedding_dim": DEFAULT_EMBEDDING_DIM,
            },
            {"_id": 1},
        )
        .sort("date_created", -1)
        .skip(5)
    )
    if stale_docs:
        stale_ids = [doc["_id"] for doc in stale_docs]
        collection.delete_many({"_id": {"$in": stale_ids}})


def _append_to_gallery(
    gallery_embeddings: torch.Tensor,
    gallery_fish_ids: list[str],
    gallery_meta: list[dict[str, Any]],
    new_embedding: torch.Tensor,
    fish_id: str,
    metadata: dict[str, Any],
) -> tuple[torch.Tensor, list[str], list[dict[str, Any]]]:
    row = new_embedding.unsqueeze(0)
    if gallery_embeddings.numel() == 0:
        gallery_embeddings = row
    else:
        gallery_embeddings = torch.cat([gallery_embeddings, row], dim=0)
    gallery_fish_ids.append(fish_id)
    gallery_meta.append(metadata)
    return gallery_embeddings, gallery_fish_ids, gallery_meta


def _ensure_reid_indexes(db: DB) -> None:
    query_embeddings = db.get_collection("query_embeddings")
    query_embeddings.create_index(
        [("user_id", 1), ("annotation_id", 1), ("ai_model_name", 1), ("embedding_dim", 1)]
    )
    query_embeddings.create_index([("source_session_id", 1)])
    query_embeddings.create_index([("user_upload_id", 1)])

    fish_embeddings = db.get_collection("fish_embeddings")
    fish_embeddings.create_index(
        [("user_id", 1), ("fish_id", 1), ("ai_model_name", 1), ("date_created", -1)]
    )
    fish_embeddings.create_index([("annotation_id", 1)])
    fish_embeddings.create_index([("source_session_id", 1)])

    identification_logs = db.get_collection("identification_logs")
    identification_logs.create_index([("annotation_id", 1)])
    identification_logs.create_index([("session_id", 1), ("date_identified", -1)])
    identification_logs.create_index([("fish_id", 1), ("date_identified", -1)])


def _ensure_pairing_indexes(db: DB) -> None:
    pair_logs = db.get_collection("fish_pair_logs")
    pair_logs.create_index([("user_id", 1), ("session_id", 1), ("date_seen", -1)])
    pair_logs.create_index([("user_id", 1), ("fish_id_a", 1), ("date_seen", -1)])
    pair_logs.create_index([("user_id", 1), ("fish_id_b", 1), ("date_seen", -1)])
    pair_logs.create_index([("user_id", 1), ("session_id", 1), ("fish_id_a", 1), ("fish_id_b", 1)])


def _build_pair_history_payload(
    *,
    fish_id: str,
    pair_logs: list[dict[str, Any]],
    fish_alias_by_id: dict[str, Optional[str]],
    site_name_by_id: dict[str, str],
    current_session_id: Optional[str] = None,
) -> dict[str, Any]:
    pair_timeline: list[dict[str, Any]] = []
    pair_summary_by_fish: dict[str, dict[str, Any]] = {}

    for pair_log in pair_logs:
        partner_id = _extract_pair_partner_id(pair_log, fish_id)
        if not partner_id:
            continue

        session_id = str(pair_log.get("session_id") or "")
        site_id = str(pair_log.get("site_id") or "") if pair_log.get("site_id") else None
        date_seen = pair_log.get("date_seen") or pair_log.get("date_created")
        partner_alias = fish_alias_by_id.get(partner_id)
        site_name = site_name_by_id.get(site_id) if site_id else None

        timeline_item = {
            "pair_fish_id": partner_id,
            "pairFishId": partner_id,
            "pair_fish_alias": partner_alias,
            "pairFishAlias": partner_alias,
            "session_id": session_id or None,
            "sessionId": session_id or None,
            "site_id": site_id,
            "siteId": site_id,
            "site_name": site_name,
            "siteName": site_name,
            "date_seen": date_seen,
            "dateSeen": date_seen,
        }
        pair_timeline.append(timeline_item)

        summary_item = pair_summary_by_fish.get(partner_id)
        if summary_item is None:
            pair_summary_by_fish[partner_id] = {
                "pair_fish_id": partner_id,
                "pairFishId": partner_id,
                "pair_fish_alias": partner_alias,
                "pairFishAlias": partner_alias,
                "co_sightings": 1,
                "coSightings": 1,
                "last_seen_at": date_seen,
                "lastSeenAt": date_seen,
                "last_session_id": session_id or None,
                "lastSessionId": session_id or None,
                "last_site_id": site_id,
                "lastSiteId": site_id,
                "last_site_name": site_name,
                "lastSiteName": site_name,
            }
            continue

        summary_item["co_sightings"] += 1
        summary_item["coSightings"] += 1
        existing_last_seen = summary_item.get("last_seen_at")
        if existing_last_seen is None or (date_seen is not None and date_seen > existing_last_seen):
            summary_item["last_seen_at"] = date_seen
            summary_item["lastSeenAt"] = date_seen
            summary_item["last_session_id"] = session_id or None
            summary_item["lastSessionId"] = session_id or None
            summary_item["last_site_id"] = site_id
            summary_item["lastSiteId"] = site_id
            summary_item["last_site_name"] = site_name
            summary_item["lastSiteName"] = site_name

    pair_summary = list(pair_summary_by_fish.values())
    pair_summary.sort(
        key=lambda item: (
            item.get("last_seen_at") or datetime.min,
            int(item.get("co_sightings") or 0),
            str(item.get("pair_fish_id") or ""),
        ),
        reverse=True,
    )

    current_session_pair = None
    if current_session_id:
        for item in pair_timeline:
            if item.get("sessionId") == current_session_id:
                current_session_pair = item
                break

    last_confirmed_pair = None
    if current_session_id:
        for item in pair_timeline:
            if item.get("sessionId") != current_session_id:
                last_confirmed_pair = item
                break
    elif pair_timeline:
        last_confirmed_pair = pair_timeline[0]

    return {
        "pair_summary": pair_summary,
        "pairSummary": pair_summary,
        "pair_timeline": pair_timeline,
        "pairTimeline": pair_timeline,
        "current_session_pair": current_session_pair,
        "currentSessionPair": current_session_pair,
        "last_confirmed_pair": last_confirmed_pair,
        "lastConfirmedPair": last_confirmed_pair,
    }


@identification_routes.post("/identify")
async def Identify(request: IdentifyRequest, auth_data: dict = Depends(Auth().verify_token)):
    if auth_data.get("user_id") is None:
        return {"status": "failure", "message": auth_data.get("status")}

    annotation_ids = _extract_annotation_ids(request)
    if not annotation_ids:
        return {
            "status": "failure",
            "message": "No annotation IDs found. Provide annotationIds or detections with annotation_id.",
        }

    user_id = auth_data["user_id"]
    requested_session_id = request.session_id
    threshold = float(request.threshold if request.threshold is not None else DEFAULT_THRESHOLD)
    requested_top_k = request.top_k if request.top_k is not None else 3
    top_k = max(1, min(int(requested_top_k), 10))
    session_store = WorkflowSessionStore()
    touched_session_ids: set[str] = set()

    db = DB()
    db.connect()
    try:
        _ensure_reid_indexes(db)
        model = None
        device = None
        transform = None

        annotations_collection = db.get_collection("annotations")
        uploads_collection = db.get_collection("user_uploads")
        fish_collection = db.get_collection("fish")
        query_embeddings_collection = db.get_collection("query_embeddings")
        fish_embeddings_collection = db.get_collection("fish_embeddings")
        identification_logs_collection = db.get_collection("identification_logs")

        fish_docs = list(
            fish_collection.find(
                {"user_id": user_id, "is_active": True},
                {"_id": 1, "fish_alias": 1, "fish_name": 1},
            )
        )
        fish_alias_by_id = _build_fish_alias_lookup(fish_docs)

        gallery_embeddings, gallery_fish_ids, gallery_meta = _load_gallery_embeddings(
            fish_embeddings_collection, user_id
        )
        has_gallery = gallery_embeddings.numel() > 0 and len(gallery_fish_ids) > 0
        identifications: list[dict[str, Any]] = []

        for annotation_id in annotation_ids:
            item_result: dict[str, Any] = {"annotation_id": annotation_id, "annotationId": annotation_id}
            annotation_oid = _safe_object_id(annotation_id)
            if annotation_oid is None:
                item_result["error"] = "Invalid annotation id"
                identifications.append(item_result)
                continue

            annotation = annotations_collection.find_one({"_id": annotation_oid})
            if annotation is None:
                item_result["error"] = "Annotation not found"
                identifications.append(item_result)
                continue

            upload_id = str(annotation.get("user_upload_id", ""))
            upload_oid = _safe_object_id(upload_id)
            if upload_oid is None:
                item_result["error"] = "Invalid user_upload_id on annotation"
                identifications.append(item_result)
                continue

            upload_doc = uploads_collection.find_one({"_id": upload_oid, "user_id": user_id})
            if upload_doc is None:
                item_result["error"] = "Annotation does not belong to authenticated user"
                identifications.append(item_result)
                continue

            annotation_session_id = annotation.get("session_id") or upload_doc.get("session_id")
            if requested_session_id and str(annotation_session_id or "") != requested_session_id:
                item_result["error"] = "Annotation does not belong to selected workflow session"
                identifications.append(item_result)
                continue
            if annotation_session_id:
                touched_session_ids.add(str(annotation_session_id))

            image_rel_path = f"uploads/{user_id}/{upload_id}.jpg"
            query_embedding = None
            crop_rel_path = None

            if request.reuse_stored_embeddings:
                query_embedding, crop_rel_path = _load_query_embedding_from_store(
                    query_embeddings_collection,
                    user_id=user_id,
                    annotation_id=annotation_id,
                )

            if query_embedding is None:
                if model is None or device is None or transform is None:
                    model, device, transform = _load_model_bundle()

                image_path = Path("uploads") / user_id / f"{upload_id}.jpg"
                if not image_path.exists():
                    item_result["error"] = "Image file not found for annotation"
                    identifications.append(item_result)
                    continue

                try:
                    crop_image = _crop_annotation(image_path, annotation)
                except ValueError as box_error:
                    item_result["error"] = str(box_error)
                    identifications.append(item_result)
                    continue

                crop_rel_path = _save_query_crop(crop_image, user_id, annotation_id)
                query_embedding = _embed_query_crop(crop_image, model, device, transform)

            if not crop_rel_path:
                derived_crop_path = f"uploads/{user_id}/crops/{annotation_id}.jpg"
                if Path(derived_crop_path).exists():
                    crop_rel_path = derived_crop_path

            _upsert_query_embedding(
                query_embeddings_collection,
                user_id=user_id,
                annotation_id=annotation_id,
                source_session_id=str(annotation_session_id) if annotation_session_id else None,
                user_upload_id=upload_id,
                crop_path=crop_rel_path,
                query_embedding=query_embedding,
            )

            suggested_fish_id, best_distance, matches = _rank_matches(
                query_embedding=query_embedding,
                gallery_embeddings=gallery_embeddings,
                gallery_fish_ids=gallery_fish_ids,
                gallery_meta=gallery_meta,
                user_id=user_id,
                query_annotation_id=annotation_id,
                threshold=threshold,
                top_k=top_k,
            )
            confidence_value = _compute_confidence(best_distance, threshold) if best_distance is not None else 0.0
            matches = _unique_top_matches(matches, top_k)
            matches_for_log = matches
            matches_for_response = _hydrate_match_fish_aliases(matches, fish_alias_by_id)
            suggestion_reason = "under_threshold"
            if suggested_fish_id is None:
                if not has_gallery:
                    suggestion_reason = "empty_gallery"
                elif matches:
                    suggestion_reason = "above_threshold"
                else:
                    suggestion_reason = "no_candidates"

            existing_log = identification_logs_collection.find_one({"annotation_id": annotation_id})
            assigned_fish_id = (
                str(existing_log.get("fish_id"))
                if existing_log and existing_log.get("fish_id")
                else None
            )
            is_new_identity = (
                bool(existing_log.get("is_new_identity"))
                if existing_log and existing_log.get("fish_id")
                else False
            )
            assigned_fish_alias = fish_alias_by_id.get(assigned_fish_id) if assigned_fish_id else None
            suggested_fish_alias = fish_alias_by_id.get(suggested_fish_id) if suggested_fish_id else None
            if request.persist_results:
                now = datetime.utcnow()
                update_payload = {
                    "suggested_fish_id": suggested_fish_id,
                    "session_id": str(annotation_session_id) if annotation_session_id else None,
                    "confidence": confidence_value,
                    "distance": best_distance,
                    "threshold": threshold,
                    "ai_model_name": DEFAULT_MODEL_NAME,
                    "ai_model_version": DEFAULT_MODEL_VERSION,
                    "is_new_identity": is_new_identity,
                    "suggestion_reason": suggestion_reason,
                    "matches": matches_for_log,
                    "query_crop_path": crop_rel_path,
                    "image_path": image_rel_path,
                    "date_identified": now,
                }

                if existing_log:
                    identification_logs_collection.update_one(
                        {"_id": existing_log["_id"]},
                        {
                            "$set": {
                                "fish_id": assigned_fish_id,
                                **update_payload,
                            }
                        },
                    )
                else:
                    identification_logs_collection.insert_one(
                        {
                            "annotation_id": annotation_id,
                            "fish_id": None,
                            **update_payload,
                        }
                    )

            item_result.update(
                {
                    "user_upload_id": upload_id,
                    "userUploadId": upload_id,
                    "x_min": annotation.get("x_min"),
                    "xMin": annotation.get("x_min"),
                    "y_min": annotation.get("y_min"),
                    "yMin": annotation.get("y_min"),
                    "width": annotation.get("width"),
                    "height": annotation.get("height"),
                    "image_path": image_rel_path,
                    "imagePath": image_rel_path,
                    "query_crop_path": crop_rel_path,
                    "queryCropPath": crop_rel_path,
                    "assigned_fish_id": assigned_fish_id,
                    "assignedFishId": assigned_fish_id,
                    "assigned_fish_alias": assigned_fish_alias,
                    "assignedFishAlias": assigned_fish_alias,
                    "suggested_fish_id": suggested_fish_id,
                    "suggestedFishId": suggested_fish_id,
                    "suggested_fish_alias": suggested_fish_alias,
                    "suggestedFishAlias": suggested_fish_alias,
                    "distance": best_distance,
                    "threshold": threshold,
                    "is_new_identity": is_new_identity,
                    "isNewIdentity": is_new_identity,
                    "suggestion_reason": suggestion_reason,
                    "suggestionReason": suggestion_reason,
                    "matches": matches_for_response,
                }
            )
            identifications.append(item_result)

        return {
            "status": "success",
            "identifications": identifications,
            "threshold": threshold,
            "model": {
                "name": DEFAULT_MODEL_NAME,
                "version": DEFAULT_MODEL_VERSION,
                "embedding_dim": DEFAULT_EMBEDDING_DIM,
            },
        }
    except Exception as err:
        print(f"Identification error: {err}")
        return {"status": "failure", "message": "Identification failed", "error": str(err)}
    finally:
        try:
            for session_id in touched_session_ids:
                existing_session = session_store.get_session(user_id, session_id)
                if existing_session and existing_session.get("status") == "completed":
                    continue
                session_store.update_session(
                    user_id=user_id,
                    session_id=session_id,
                    current_step="identification",
                    status="in_progress",
                )
        except Exception as session_err:
            print(f"Failed to update session step during identification: {session_err}")
        db.close()


@identification_routes.post("/identify/create-identity")
async def CreateIdentity(request: CreateIdentityRequest, auth_data: dict = Depends(Auth().verify_token)):
    if auth_data.get("user_id") is None:
        return {"status": "failure", "message": auth_data.get("status")}

    annotation_id = request.annotation_id
    annotation_oid = _safe_object_id(annotation_id)
    if annotation_oid is None:
        return {"status": "failure", "message": "Invalid annotation id"}

    user_id = auth_data["user_id"]
    db = DB()
    db.connect()
    try:
        _ensure_reid_indexes(db)
        annotations_collection = db.get_collection("annotations")
        uploads_collection = db.get_collection("user_uploads")
        fish_collection = db.get_collection("fish")
        query_embeddings_collection = db.get_collection("query_embeddings")
        fish_embeddings_collection = db.get_collection("fish_embeddings")
        identification_logs_collection = db.get_collection("identification_logs")

        annotation = annotations_collection.find_one({"_id": annotation_oid})
        if annotation is None:
            return {"status": "failure", "message": "Annotation not found"}

        upload_id = str(annotation.get("user_upload_id", ""))
        upload_oid = _safe_object_id(upload_id)
        if upload_oid is None:
            return {"status": "failure", "message": "Invalid user_upload_id on annotation"}

        upload_doc = uploads_collection.find_one({"_id": upload_oid, "user_id": user_id})
        if upload_doc is None:
            return {"status": "failure", "message": "Annotation does not belong to authenticated user"}

        annotation_session_id = annotation.get("session_id") or upload_doc.get("session_id")
        existing_log = identification_logs_collection.find_one({"annotation_id": annotation_id})
        if existing_log and existing_log.get("fish_id"):
            existing_fish_id = str(existing_log.get("fish_id"))
            existing_fish_alias = None
            existing_fish_oid = _safe_object_id(existing_fish_id)
            if existing_fish_oid is not None:
                existing_fish_doc = fish_collection.find_one(
                    {"_id": existing_fish_oid, "user_id": user_id},
                    {"fish_alias": 1, "fish_name": 1},
                )
                if existing_fish_doc:
                    existing_fish_alias = _extract_fish_alias(existing_fish_doc)
            return {
                "status": "success",
                "annotation_id": annotation_id,
                "annotationId": annotation_id,
                "fish_id": existing_fish_id,
                "fishId": existing_fish_id,
                "fish_alias": existing_fish_alias,
                "fishAlias": existing_fish_alias,
                "is_new_identity": bool(existing_log.get("is_new_identity", False)),
                "isNewIdentity": bool(existing_log.get("is_new_identity", False)),
            }

        now = datetime.utcnow()

        inserted_fish = fish_collection.insert_one(
            {
                "fish_alias": None,
                "site_id": str(upload_doc.get("site_id") or ""),
                "date_created": now,
                "date_modified": now,
                "is_active": True,
                "user_id": user_id,
            }
        )
        new_fish_id = str(inserted_fish.inserted_id)

        query_embedding, crop_rel_path = _load_query_embedding_from_store(
            query_embeddings_collection,
            user_id=user_id,
            annotation_id=annotation_id,
        )
        if query_embedding is None:
            model, device, transform = _load_model_bundle()
            image_path = Path("uploads") / user_id / f"{upload_id}.jpg"
            if not image_path.exists():
                return {"status": "failure", "message": "Image file not found for annotation"}
            try:
                crop_image = _crop_annotation(image_path, annotation)
            except ValueError as box_error:
                return {"status": "failure", "message": str(box_error)}
            crop_rel_path = _save_query_crop(crop_image, user_id, annotation_id)
            query_embedding = _embed_query_crop(crop_image, model, device, transform)

        if not crop_rel_path:
            derived_crop_path = f"uploads/{user_id}/crops/{annotation_id}.jpg"
            if Path(derived_crop_path).exists():
                crop_rel_path = derived_crop_path

        _upsert_query_embedding(
            query_embeddings_collection,
            user_id=user_id,
            annotation_id=annotation_id,
            source_session_id=str(annotation_session_id) if annotation_session_id else None,
            user_upload_id=upload_id,
            crop_path=crop_rel_path,
            query_embedding=query_embedding,
        )

        embedding_values = [float(value) for value in query_embedding.tolist()]
        fish_embeddings_collection.insert_one(
            {
                "fish_id": new_fish_id,
                "user_id": user_id,
                "source_session_id": str(annotation_session_id) if annotation_session_id else None,
                "annotation_id": annotation_id,
                "user_upload_id": upload_id,
                "crop_path": crop_rel_path,
                "embeddings": embedding_values,
                "embedding_dim": DEFAULT_EMBEDDING_DIM,
                "ai_model_name": DEFAULT_MODEL_NAME,
                "ai_model_version": DEFAULT_MODEL_VERSION,
                "date_created": now,
            }
        )
        _prune_embeddings(fish_embeddings_collection, user_id, new_fish_id)

        threshold = float(DEFAULT_THRESHOLD)
        if existing_log and existing_log.get("threshold") is not None:
            try:
                threshold = float(existing_log.get("threshold"))
            except (TypeError, ValueError):
                threshold = float(DEFAULT_THRESHOLD)

        distance = None
        if existing_log and existing_log.get("distance") is not None:
            try:
                distance = float(existing_log.get("distance"))
            except (TypeError, ValueError):
                distance = None

        confidence_value = 0.0
        if existing_log and existing_log.get("confidence") is not None:
            try:
                confidence_value = float(existing_log.get("confidence"))
            except (TypeError, ValueError):
                confidence_value = 0.0
        elif distance is not None:
            confidence_value = _compute_confidence(distance, threshold)

        image_rel_path = f"uploads/{user_id}/{upload_id}.jpg"
        matches = _unique_top_matches(existing_log.get("matches"), 3) if existing_log else []
        suggested_fish_id = (
            str(existing_log.get("suggested_fish_id"))
            if existing_log and existing_log.get("suggested_fish_id")
            else None
        )
        log_payload = {
            "fish_id": new_fish_id,
            "suggested_fish_id": suggested_fish_id,
            "session_id": str(annotation_session_id) if annotation_session_id else None,
            "confidence": confidence_value,
            "distance": distance,
            "threshold": threshold,
            "ai_model_name": DEFAULT_MODEL_NAME,
            "ai_model_version": DEFAULT_MODEL_VERSION,
            "is_new_identity": True,
            "suggestion_reason": "manual_new_identity",
            "matches": matches,
            "query_crop_path": crop_rel_path,
            "image_path": image_rel_path,
            "date_identified": now,
        }

        if existing_log:
            identification_logs_collection.update_one(
                {"_id": existing_log["_id"]},
                {"$set": log_payload},
            )
        else:
            identification_logs_collection.insert_one(
                {
                    "annotation_id": annotation_id,
                    **log_payload,
                }
            )

        return {
            "status": "success",
            "annotation_id": annotation_id,
            "annotationId": annotation_id,
            "fish_id": new_fish_id,
            "fishId": new_fish_id,
            "fish_alias": None,
            "fishAlias": None,
            "is_new_identity": True,
            "isNewIdentity": True,
        }
    except Exception as err:
        print(f"Create identity error: {err}")
        return {"status": "failure", "message": "Failed to create new identity", "error": str(err)}
    finally:
        db.close()


@identification_routes.post("/identify/assign")
async def AssignIdentity(request: AssignIdentityRequest, auth_data: dict = Depends(Auth().verify_token)):
    if auth_data.get("user_id") is None:
        return {"status": "failure", "message": auth_data.get("status")}

    annotation_id = request.annotation_id
    fish_id = request.fish_id

    annotation_oid = _safe_object_id(annotation_id)
    if annotation_oid is None:
        return {"status": "failure", "message": "Invalid annotation id"}
    fish_oid = _safe_object_id(fish_id)
    if fish_oid is None:
        return {"status": "failure", "message": "Invalid fish id"}

    user_id = auth_data["user_id"]
    db = DB()
    db.connect()
    try:
        _ensure_reid_indexes(db)
        annotations_collection = db.get_collection("annotations")
        uploads_collection = db.get_collection("user_uploads")
        fish_collection = db.get_collection("fish")
        query_embeddings_collection = db.get_collection("query_embeddings")
        fish_embeddings_collection = db.get_collection("fish_embeddings")
        identification_logs_collection = db.get_collection("identification_logs")

        annotation = annotations_collection.find_one({"_id": annotation_oid})
        if annotation is None:
            return {"status": "failure", "message": "Annotation not found"}

        upload_id = str(annotation.get("user_upload_id", ""))
        upload_oid = _safe_object_id(upload_id)
        if upload_oid is None:
            return {"status": "failure", "message": "Invalid user_upload_id on annotation"}

        upload_doc = uploads_collection.find_one({"_id": upload_oid, "user_id": user_id})
        if upload_doc is None:
            return {"status": "failure", "message": "Annotation does not belong to authenticated user"}

        fish_doc = fish_collection.find_one({"_id": fish_oid, "user_id": user_id, "is_active": True})
        if fish_doc is None:
            return {"status": "failure", "message": "Fish not found"}

        annotation_session_id = annotation.get("session_id") or upload_doc.get("session_id")
        now = datetime.utcnow()

        query_embedding, crop_rel_path = _load_query_embedding_from_store(
            query_embeddings_collection,
            user_id=user_id,
            annotation_id=annotation_id,
        )
        if query_embedding is None:
            model, device, transform = _load_model_bundle()
            image_path = Path("uploads") / user_id / f"{upload_id}.jpg"
            if not image_path.exists():
                return {"status": "failure", "message": "Image file not found for annotation"}
            try:
                crop_image = _crop_annotation(image_path, annotation)
            except ValueError as box_error:
                return {"status": "failure", "message": str(box_error)}
            crop_rel_path = _save_query_crop(crop_image, user_id, annotation_id)
            query_embedding = _embed_query_crop(crop_image, model, device, transform)

        if not crop_rel_path:
            derived_crop_path = f"uploads/{user_id}/crops/{annotation_id}.jpg"
            if Path(derived_crop_path).exists():
                crop_rel_path = derived_crop_path

        _upsert_query_embedding(
            query_embeddings_collection,
            user_id=user_id,
            annotation_id=annotation_id,
            source_session_id=str(annotation_session_id) if annotation_session_id else None,
            user_upload_id=upload_id,
            crop_path=crop_rel_path,
            query_embedding=query_embedding,
        )

        existing_fish_embedding = fish_embeddings_collection.find_one(
            {
                "user_id": user_id,
                "fish_id": fish_id,
                "annotation_id": annotation_id,
                "ai_model_name": DEFAULT_MODEL_NAME,
                "embedding_dim": DEFAULT_EMBEDDING_DIM,
            }
        )
        if existing_fish_embedding is None:
            fish_embeddings_collection.insert_one(
                {
                    "fish_id": fish_id,
                    "user_id": user_id,
                    "source_session_id": str(annotation_session_id) if annotation_session_id else None,
                    "annotation_id": annotation_id,
                    "user_upload_id": upload_id,
                    "crop_path": crop_rel_path,
                    "embeddings": [float(value) for value in query_embedding.tolist()],
                    "embedding_dim": DEFAULT_EMBEDDING_DIM,
                    "ai_model_name": DEFAULT_MODEL_NAME,
                    "ai_model_version": DEFAULT_MODEL_VERSION,
                    "date_created": now,
                }
            )
            _prune_embeddings(fish_embeddings_collection, user_id, fish_id)

        existing_log = identification_logs_collection.find_one({"annotation_id": annotation_id})
        threshold = float(DEFAULT_THRESHOLD)
        distance = None
        confidence_value = 0.0
        suggested_fish_id = None
        matches = []
        if existing_log:
            if existing_log.get("threshold") is not None:
                try:
                    threshold = float(existing_log.get("threshold"))
                except (TypeError, ValueError):
                    threshold = float(DEFAULT_THRESHOLD)
            if existing_log.get("distance") is not None:
                try:
                    distance = float(existing_log.get("distance"))
                except (TypeError, ValueError):
                    distance = None
            if existing_log.get("confidence") is not None:
                try:
                    confidence_value = float(existing_log.get("confidence"))
                except (TypeError, ValueError):
                    confidence_value = 0.0
            elif distance is not None:
                confidence_value = _compute_confidence(distance, threshold)
            suggested_fish_id = (
                str(existing_log.get("suggested_fish_id"))
                if existing_log.get("suggested_fish_id")
                else None
            )
            matches = _unique_top_matches(existing_log.get("matches"), 3)

        if suggested_fish_id is None:
            suggested_fish_id = fish_id

        image_rel_path = f"uploads/{user_id}/{upload_id}.jpg"
        log_payload = {
            "fish_id": fish_id,
            "suggested_fish_id": suggested_fish_id,
            "session_id": str(annotation_session_id) if annotation_session_id else None,
            "confidence": confidence_value,
            "distance": distance,
            "threshold": threshold,
            "ai_model_name": DEFAULT_MODEL_NAME,
            "ai_model_version": DEFAULT_MODEL_VERSION,
            "is_new_identity": False,
            "suggestion_reason": "manual_assignment",
            "matches": matches,
            "query_crop_path": crop_rel_path,
            "image_path": image_rel_path,
            "date_identified": now,
        }

        if existing_log:
            identification_logs_collection.update_one(
                {"_id": existing_log["_id"]},
                {"$set": log_payload},
            )
        else:
            identification_logs_collection.insert_one(
                {
                    "annotation_id": annotation_id,
                    **log_payload,
                }
            )

        fish_collection.update_one(
            {"_id": fish_oid},
            {"$set": {"date_modified": now}},
        )

        fish_alias = _extract_fish_alias(fish_doc)
        return {
            "status": "success",
            "annotation_id": annotation_id,
            "annotationId": annotation_id,
            "fish_id": fish_id,
            "fishId": fish_id,
            "fish_alias": fish_alias,
            "fishAlias": fish_alias,
            "is_new_identity": False,
            "isNewIdentity": False,
        }
    except Exception as err:
        print(f"Assign identity error: {err}")
        return {"status": "failure", "message": "Failed to assign identity", "error": str(err)}
    finally:
        db.close()


@identification_routes.patch("/identify/fish/{fish_id}/alias")
async def UpdateFishAlias(
    fish_id: str,
    request: UpdateFishAliasRequest,
    auth_data: dict = Depends(Auth().verify_token),
):
    if auth_data.get("user_id") is None:
        return {"status": "failure", "message": auth_data.get("status")}

    fish_oid = _safe_object_id(fish_id)
    if fish_oid is None:
        return {"status": "failure", "message": "Invalid fish id"}

    user_id = auth_data["user_id"]
    fish_alias = _normalize_fish_alias(request.fish_alias)

    db = DB()
    db.connect()
    try:
        fish_collection = db.get_collection("fish")
        fish_doc = fish_collection.find_one({"_id": fish_oid, "user_id": user_id, "is_active": True})
        if fish_doc is None:
            return {"status": "failure", "message": "Fish not found"}

        now = datetime.utcnow()
        fish_collection.update_one(
            {"_id": fish_oid},
            {
                "$set": {"fish_alias": fish_alias, "date_modified": now},
                "$unset": {"fish_name": ""},
            },
        )

        return {
            "status": "success",
            "fish_id": fish_id,
            "fishId": fish_id,
            "fish_alias": fish_alias,
            "fishAlias": fish_alias,
            "date_modified": now,
            "dateModified": now,
        }
    except Exception as err:
        print(f"Update fish alias error: {err}")
        return {"status": "failure", "message": "Failed to update fish alias", "error": str(err)}
    finally:
        db.close()


@identification_routes.post("/identify/visualization")
async def GenerateVisualization(
    request: GenerateVisualizationRequest,
    auth_data: dict = Depends(Auth().verify_token),
):
    if auth_data.get("user_id") is None:
        return {"status": "failure", "message": auth_data.get("status")}

    user_id = auth_data["user_id"]
    query_annotation_id = request.query_annotation_id or request.annotation_id
    match_annotation_id = request.match_annotation_id
    variant = _normalize_visualization_variant(request.visualization_variant)
    force_regenerate = bool(request.force_regenerate)

    if not query_annotation_id and not match_annotation_id:
        return {
            "status": "failure",
            "message": "At least one annotation ID is required for visualization generation.",
        }

    if variant not in _get_supported_visualization_variants():
        return {
            "status": "failure",
            "message": (
                f"Unsupported visualization variant '{variant}'. "
                f"Supported variants: {', '.join(sorted(_get_supported_visualization_variants()))}."
            ),
        }

    model_bundle: Optional[tuple[nn.Module, torch.device, Any]] = None
    if variant == "gradcam":
        try:
            model_bundle = _load_model_bundle()
        except Exception as model_error:
            return {
                "status": "failure",
                "message": f"Failed to load model for Grad-CAM: {model_error}",
            }

    db = DB()
    db.connect()
    try:
        annotations_collection = db.get_collection("annotations")
        uploads_collection = db.get_collection("user_uploads")

        errors: dict[str, str] = {}
        query_visualization_path = None
        match_visualization_path = None

        if query_annotation_id:
            query_visualization_path, query_error = _get_or_create_visualization_rel_path(
                annotation_id=query_annotation_id,
                user_id=user_id,
                variant=variant,
                force_regenerate=force_regenerate,
                annotations_collection=annotations_collection,
                uploads_collection=uploads_collection,
                model_bundle=model_bundle,
            )
            if query_error:
                errors["queryAnnotationId"] = query_error

        if match_annotation_id:
            match_visualization_path, match_error = _get_or_create_visualization_rel_path(
                annotation_id=match_annotation_id,
                user_id=user_id,
                variant=variant,
                force_regenerate=force_regenerate,
                annotations_collection=annotations_collection,
                uploads_collection=uploads_collection,
                model_bundle=model_bundle,
            )
            if match_error:
                errors["matchAnnotationId"] = match_error

        if not query_visualization_path and not match_visualization_path:
            message = "Failed to generate visualization for the requested crops."
            if errors:
                first_error = next(iter(errors.values()))
                message = str(first_error)
            return {
                "status": "failure",
                "message": message,
                "variant": variant,
                "visualizationVariant": variant,
                "errors": errors,
            }

        return {
            "status": "success",
            "variant": variant,
            "visualizationVariant": variant,
            "query_annotation_id": query_annotation_id,
            "queryAnnotationId": query_annotation_id,
            "query_visualization_path": query_visualization_path,
            "queryVisualizationPath": query_visualization_path,
            "match_annotation_id": match_annotation_id,
            "matchAnnotationId": match_annotation_id,
            "match_visualization_path": match_visualization_path,
            "matchVisualizationPath": match_visualization_path,
            "errors": errors,
        }
    except Exception as err:
        print(f"Generate visualization error: {err}")
        return {"status": "failure", "message": "Failed to generate visualization", "error": str(err)}
    finally:
        db.close()


@identification_routes.post("/identify/gradcam")
async def GenerateGradCam(
    request: GenerateVisualizationRequest,
    auth_data: dict = Depends(Auth().verify_token),
):
    gradcam_request = GenerateVisualizationRequest(
        queryAnnotationId=request.query_annotation_id or request.annotation_id,
        matchAnnotationId=request.match_annotation_id,
        visualizationVariant="gradcam",
        forceRegenerate=request.force_regenerate,
    )
    return await GenerateVisualization(gradcam_request, auth_data)


@identification_routes.get("/identify/session/{session_id}")
async def GetSessionIdentifications(session_id: str, auth_data: dict = Depends(Auth().verify_token)):
    if auth_data.get("user_id") is None:
        return {"status": "failure", "message": auth_data.get("status")}

    user_id = auth_data["user_id"]
    session_store = WorkflowSessionStore()
    session_doc = session_store.get_session(user_id, session_id)
    if session_doc is None:
        return {"status": "failure", "message": "Session not found"}

    db = DB()
    db.connect()
    try:
        annotations_collection = db.get_collection("annotations")
        uploads_collection = db.get_collection("user_uploads")
        fish_collection = db.get_collection("fish")
        identification_logs_collection = db.get_collection("identification_logs")
        query_embeddings_collection = db.get_collection("query_embeddings")

        fish_docs = list(
            fish_collection.find(
                {"user_id": user_id, "is_active": True},
                {"_id": 1, "fish_alias": 1, "fish_name": 1},
            )
        )
        fish_alias_by_id = _build_fish_alias_lookup(fish_docs)

        uploads = list(
            uploads_collection.find(
                {"user_id": user_id, "session_id": session_id},
                {"_id": 1},
            )
        )
        if not uploads:
            return {
                "status": "success",
                "session_id": session_id,
                "identifications": [],
            }

        upload_ids = [str(upload["_id"]) for upload in uploads]
        annotations = list(
            annotations_collection.find(
                {
                    "user_upload_id": {"$in": upload_ids},
                    "$or": [{"session_id": session_id}, {"session_id": {"$exists": False}}],
                }
            ).sort([("user_upload_id", 1), ("_id", 1)])
        )
        if not annotations:
            return {
                "status": "success",
                "session_id": session_id,
                "identifications": [],
            }

        annotation_ids = [str(annotation["_id"]) for annotation in annotations]
        logs = list(
            identification_logs_collection.find(
                {"annotation_id": {"$in": annotation_ids}}
            ).sort("date_identified", -1)
        )
        logs_by_annotation: dict[str, dict[str, Any]] = {}
        for log in logs:
            ann_id = str(log.get("annotation_id") or "")
            if ann_id and ann_id not in logs_by_annotation:
                logs_by_annotation[ann_id] = log

        embeddings = list(
            query_embeddings_collection.find(
                {
                    "user_id": user_id,
                    "annotation_id": {"$in": annotation_ids},
                    "ai_model_name": DEFAULT_MODEL_NAME,
                    "embedding_dim": DEFAULT_EMBEDDING_DIM,
                }
            ).sort("date_created", -1)
        )
        embeddings_by_annotation: dict[str, dict[str, Any]] = {}
        for emb in embeddings:
            ann_id = str(emb.get("annotation_id") or "")
            if ann_id and ann_id not in embeddings_by_annotation:
                embeddings_by_annotation[ann_id] = emb

        identifications: list[dict[str, Any]] = []
        for annotation in annotations:
            annotation_id = str(annotation["_id"])
            upload_id = str(annotation.get("user_upload_id", ""))
            image_rel_path = f"uploads/{user_id}/{upload_id}.jpg"

            log = logs_by_annotation.get(annotation_id)
            emb = embeddings_by_annotation.get(annotation_id)

            query_crop_path = None
            if log and isinstance(log.get("query_crop_path"), str) and log.get("query_crop_path"):
                query_crop_path = log.get("query_crop_path")
            elif emb and isinstance(emb.get("crop_path"), str) and emb.get("crop_path"):
                query_crop_path = emb.get("crop_path")
            else:
                derived_crop = f"uploads/{user_id}/crops/{annotation_id}.jpg"
                if Path(derived_crop).exists():
                    query_crop_path = derived_crop

            raw_matches = log.get("matches") if log and isinstance(log.get("matches"), list) else []
            matches = _unique_top_matches(raw_matches, max(len(raw_matches), 3))
            matches = _hydrate_match_fish_aliases(matches, fish_alias_by_id)
            assigned_fish_id = str(log.get("fish_id")) if log and log.get("fish_id") else None
            assigned_fish_alias = fish_alias_by_id.get(assigned_fish_id) if assigned_fish_id else None
            suggested_fish_id = (
                str(log.get("suggested_fish_id"))
                if log and log.get("suggested_fish_id")
                else None
            )
            suggested_fish_alias = fish_alias_by_id.get(suggested_fish_id) if suggested_fish_id else None
            distance = float(log.get("distance")) if log and log.get("distance") is not None else None
            threshold = (
                float(log.get("threshold"))
                if log and log.get("threshold") is not None
                else float(DEFAULT_THRESHOLD)
            )
            is_new_identity = bool(log.get("is_new_identity")) if log else False
            suggestion_reason = str(log.get("suggestion_reason")) if log and log.get("suggestion_reason") else None

            identifications.append(
                {
                    "annotation_id": annotation_id,
                    "annotationId": annotation_id,
                    "user_upload_id": upload_id,
                    "userUploadId": upload_id,
                    "x_min": annotation.get("x_min"),
                    "xMin": annotation.get("x_min"),
                    "y_min": annotation.get("y_min"),
                    "yMin": annotation.get("y_min"),
                    "width": annotation.get("width"),
                    "height": annotation.get("height"),
                    "image_path": image_rel_path,
                    "imagePath": image_rel_path,
                    "query_crop_path": query_crop_path,
                    "queryCropPath": query_crop_path,
                    "assigned_fish_id": assigned_fish_id,
                    "assignedFishId": assigned_fish_id,
                    "assigned_fish_alias": assigned_fish_alias,
                    "assignedFishAlias": assigned_fish_alias,
                    "suggested_fish_id": suggested_fish_id,
                    "suggestedFishId": suggested_fish_id,
                    "suggested_fish_alias": suggested_fish_alias,
                    "suggestedFishAlias": suggested_fish_alias,
                    "distance": distance,
                    "threshold": threshold,
                    "is_new_identity": is_new_identity,
                    "isNewIdentity": is_new_identity,
                    "suggestion_reason": suggestion_reason,
                    "suggestionReason": suggestion_reason,
                    "matches": matches,
                }
            )

        return {
            "status": "success",
            "session_id": session_id,
            "identifications": identifications,
        }
    except Exception as err:
        print(f"Session identification load error: {err}")
        return {
            "status": "failure",
            "message": "Failed to load identification results",
            "error": str(err),
        }
    finally:
        db.close()


@identification_routes.get("/identify/fish")
async def GetIdentifiedFishList(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=8, ge=1, le=50, alias="pageSize"),
    auth_data: dict = Depends(Auth().verify_token),
):
    if auth_data.get("user_id") is None:
        return {"status": "failure", "message": auth_data.get("status")}

    user_id = auth_data["user_id"]
    db = DB()
    db.connect()
    try:
        fish_collection = db.get_collection("fish")
        identification_logs_collection = db.get_collection("identification_logs")
        annotations_collection = db.get_collection("annotations")

        fish_docs = list(
            fish_collection.find(
                {"user_id": user_id, "is_active": True},
                {"_id": 1, "fish_alias": 1, "fish_name": 1},
            )
        )
        fish_ids = [str(doc["_id"]) for doc in fish_docs]
        fish_alias_by_id = _build_fish_alias_lookup(fish_docs)
        if not fish_ids:
            return {
                "status": "success",
                "page": page,
                "page_size": page_size,
                "pageSize": page_size,
                "total": 0,
                "total_pages": 0,
                "totalPages": 0,
                "has_next": False,
                "hasNext": False,
                "has_prev": False,
                "hasPrev": False,
                "fish": [],
            }

        skip = (page - 1) * page_size
        pipeline = [
            {
                "$match": {
                    "fish_id": {"$in": fish_ids, "$exists": True, "$nin": [None, ""]},
                }
            },
            {"$sort": {"date_identified": -1}},
            {
                "$group": {
                    "_id": "$fish_id",
                    "sightingsCount": {"$sum": 1},
                    "lastIdentifiedAt": {"$first": "$date_identified"},
                    "lastSessionId": {"$first": "$session_id"},
                    "lastConfidence": {"$first": "$confidence"},
                    "previewCropPath": {"$first": "$query_crop_path"},
                    "previewImagePath": {"$first": "$image_path"},
                    "latestAnnotationId": {"$first": "$annotation_id"},
                }
            },
            {"$sort": {"lastIdentifiedAt": -1, "_id": 1}},
            {
                "$facet": {
                    "items": [
                        {"$skip": skip},
                        {"$limit": page_size},
                    ],
                    "count": [{"$count": "total"}],
                }
            },
        ]

        aggregate_result = list(identification_logs_collection.aggregate(pipeline))
        aggregate_data = aggregate_result[0] if aggregate_result else {"items": [], "count": []}
        total = int(aggregate_data["count"][0]["total"]) if aggregate_data["count"] else 0
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0

        latest_annotation_ids = [
            str(item.get("latestAnnotationId"))
            for item in aggregate_data.get("items", [])
            if item.get("latestAnnotationId")
        ]
        annotation_oids = [
            annotation_oid
            for annotation_id in latest_annotation_ids
            if (annotation_oid := _safe_object_id(annotation_id)) is not None
        ]
        annotation_by_id: dict[str, dict[str, Any]] = {}
        if annotation_oids:
            annotation_docs = list(
                annotations_collection.find(
                    {"_id": {"$in": annotation_oids}, "user_id": user_id},
                    {"x_min": 1, "y_min": 1, "width": 1, "height": 1},
                )
            )
            annotation_by_id = {
                str(doc.get("_id")): doc
                for doc in annotation_docs
                if doc.get("_id") is not None
            }

        fish_items: list[dict[str, Any]] = []
        for item in aggregate_data.get("items", []):
            fish_id = str(item.get("_id")) if item.get("_id") else None
            if not fish_id:
                continue

            preview_path = item.get("previewCropPath") or item.get("previewImagePath")
            latest_annotation_id = str(item.get("latestAnnotationId")) if item.get("latestAnnotationId") else None
            annotation_doc = annotation_by_id.get(latest_annotation_id) if latest_annotation_id else None
            confidence_raw = item.get("lastConfidence")
            try:
                confidence_value = float(confidence_raw) if confidence_raw is not None else None
            except (TypeError, ValueError):
                confidence_value = None
            fish_alias = fish_alias_by_id.get(fish_id)

            fish_items.append(
                {
                    "fish_id": fish_id,
                    "fishId": fish_id,
                    "fish_alias": fish_alias,
                    "fishAlias": fish_alias,
                    "sightings_count": int(item.get("sightingsCount") or 0),
                    "sightingsCount": int(item.get("sightingsCount") or 0),
                    "last_identified_at": item.get("lastIdentifiedAt"),
                    "lastIdentifiedAt": item.get("lastIdentifiedAt"),
                    "last_session_id": item.get("lastSessionId"),
                    "lastSessionId": item.get("lastSessionId"),
                    "last_confidence": confidence_value,
                    "lastConfidence": confidence_value,
                    "preview_path": preview_path,
                    "previewPath": preview_path,
                    "preview_crop_path": item.get("previewCropPath"),
                    "previewCropPath": item.get("previewCropPath"),
                    "preview_image_path": item.get("previewImagePath"),
                    "previewImagePath": item.get("previewImagePath"),
                    "latest_annotation_id": latest_annotation_id,
                    "latestAnnotationId": latest_annotation_id,
                    "x_min": annotation_doc.get("x_min") if annotation_doc else None,
                    "xMin": annotation_doc.get("x_min") if annotation_doc else None,
                    "y_min": annotation_doc.get("y_min") if annotation_doc else None,
                    "yMin": annotation_doc.get("y_min") if annotation_doc else None,
                    "width": annotation_doc.get("width") if annotation_doc else None,
                    "height": annotation_doc.get("height") if annotation_doc else None,
                }
            )

        has_next = page < total_pages
        has_prev = page > 1 and total_pages > 0
        return {
            "status": "success",
            "page": page,
            "page_size": page_size,
            "pageSize": page_size,
            "total": total,
            "total_pages": total_pages,
            "totalPages": total_pages,
            "has_next": has_next,
            "hasNext": has_next,
            "has_prev": has_prev,
            "hasPrev": has_prev,
            "fish": fish_items,
        }
    except Exception as err:
        print(f"Identified fish list error: {err}")
        return {
            "status": "failure",
            "message": "Failed to load identified fish list",
            "error": str(err),
        }
    finally:
        db.close()


@identification_routes.get("/pairing/session/{session_id}")
async def GetSessionPairing(session_id: str, auth_data: dict = Depends(Auth().verify_token)):
    if auth_data.get("user_id") is None:
        return {"status": "failure", "message": auth_data.get("status")}

    user_id = auth_data["user_id"]
    session_store = WorkflowSessionStore()
    session_doc = session_store.get_session(user_id, session_id)
    if session_doc is None:
        return {"status": "failure", "message": "Session not found"}

    db = DB()
    db.connect()
    try:
        _ensure_pairing_indexes(db)
        fish_collection = db.get_collection("fish")
        annotations_collection = db.get_collection("annotations")
        identification_logs_collection = db.get_collection("identification_logs")
        pair_logs_collection = db.get_collection("fish_pair_logs")

        fish_docs = list(
            fish_collection.find(
                {"user_id": user_id, "is_active": True},
                {"_id": 1, "fish_alias": 1, "fish_name": 1},
            )
        )
        fish_ids = [str(doc["_id"]) for doc in fish_docs]
        fish_alias_by_id = _build_fish_alias_lookup(fish_docs)

        if not fish_ids:
            return {"status": "success", "session_id": session_id, "sessionId": session_id, "fishes": []}

        pipeline = [
            {
                "$match": {
                    "session_id": session_id,
                    "fish_id": {"$in": fish_ids, "$exists": True, "$nin": [None, ""]},
                }
            },
            {"$sort": {"date_identified": -1}},
            {
                "$group": {
                    "_id": "$fish_id",
                    "sightingsCount": {"$sum": 1},
                    "lastIdentifiedAt": {"$first": "$date_identified"},
                    "lastConfidence": {"$first": "$confidence"},
                    "previewCropPath": {"$first": "$query_crop_path"},
                    "previewImagePath": {"$first": "$image_path"},
                    "latestAnnotationId": {"$first": "$annotation_id"},
                }
            },
            {"$sort": {"lastIdentifiedAt": -1, "_id": 1}},
        ]
        session_fish_rows = list(identification_logs_collection.aggregate(pipeline))

        latest_annotation_ids = [
            str(row.get("latestAnnotationId"))
            for row in session_fish_rows
            if row.get("latestAnnotationId")
        ]
        annotation_oids = [
            annotation_oid
            for annotation_id in latest_annotation_ids
            if (annotation_oid := _safe_object_id(annotation_id)) is not None
        ]
        annotation_by_id: dict[str, dict[str, Any]] = {}
        if annotation_oids:
            annotation_docs = list(
                annotations_collection.find(
                    {"_id": {"$in": annotation_oids}, "user_id": user_id},
                    {"x_min": 1, "y_min": 1, "width": 1, "height": 1},
                )
            )
            annotation_by_id = {
                str(doc.get("_id")): doc
                for doc in annotation_docs
                if doc.get("_id") is not None
            }

        session_pair_logs = list(
            pair_logs_collection.find({"user_id": user_id, "session_id": session_id}).sort("date_seen", -1)
        )
        session_pair_by_fish: dict[str, dict[str, Any]] = {}
        for pair_log in session_pair_logs:
            fish_id_a = str(pair_log.get("fish_id_a") or "")
            fish_id_b = str(pair_log.get("fish_id_b") or "")
            if not fish_id_a or not fish_id_b:
                continue
            date_seen = pair_log.get("date_seen") or pair_log.get("date_created")
            if fish_id_a not in session_pair_by_fish:
                session_pair_by_fish[fish_id_a] = {
                    "pairFishId": fish_id_b,
                    "pair_fish_id": fish_id_b,
                    "pairFishAlias": fish_alias_by_id.get(fish_id_b),
                    "pair_fish_alias": fish_alias_by_id.get(fish_id_b),
                    "dateSeen": date_seen,
                    "date_seen": date_seen,
                }
            if fish_id_b not in session_pair_by_fish:
                session_pair_by_fish[fish_id_b] = {
                    "pairFishId": fish_id_a,
                    "pair_fish_id": fish_id_a,
                    "pairFishAlias": fish_alias_by_id.get(fish_id_a),
                    "pair_fish_alias": fish_alias_by_id.get(fish_id_a),
                    "dateSeen": date_seen,
                    "date_seen": date_seen,
                }

        fishes: list[dict[str, Any]] = []
        for row in session_fish_rows:
            fish_id = str(row.get("_id")) if row.get("_id") else None
            if not fish_id:
                continue
            preview_path = row.get("previewCropPath") or row.get("previewImagePath")
            latest_annotation_id = (
                str(row.get("latestAnnotationId")) if row.get("latestAnnotationId") else None
            )
            annotation_doc = annotation_by_id.get(latest_annotation_id) if latest_annotation_id else None
            confidence_raw = row.get("lastConfidence")
            try:
                confidence_value = float(confidence_raw) if confidence_raw is not None else None
            except (TypeError, ValueError):
                confidence_value = None

            current_pair = session_pair_by_fish.get(fish_id)
            fishes.append(
                {
                    "fish_id": fish_id,
                    "fishId": fish_id,
                    "fish_alias": fish_alias_by_id.get(fish_id),
                    "fishAlias": fish_alias_by_id.get(fish_id),
                    "sightings_count": int(row.get("sightingsCount") or 0),
                    "sightingsCount": int(row.get("sightingsCount") or 0),
                    "last_identified_at": row.get("lastIdentifiedAt"),
                    "lastIdentifiedAt": row.get("lastIdentifiedAt"),
                    "last_confidence": confidence_value,
                    "lastConfidence": confidence_value,
                    "preview_path": preview_path,
                    "previewPath": preview_path,
                    "preview_crop_path": row.get("previewCropPath"),
                    "previewCropPath": row.get("previewCropPath"),
                    "preview_image_path": row.get("previewImagePath"),
                    "previewImagePath": row.get("previewImagePath"),
                    "latest_annotation_id": latest_annotation_id,
                    "latestAnnotationId": latest_annotation_id,
                    "x_min": annotation_doc.get("x_min") if annotation_doc else None,
                    "xMin": annotation_doc.get("x_min") if annotation_doc else None,
                    "y_min": annotation_doc.get("y_min") if annotation_doc else None,
                    "yMin": annotation_doc.get("y_min") if annotation_doc else None,
                    "width": annotation_doc.get("width") if annotation_doc else None,
                    "height": annotation_doc.get("height") if annotation_doc else None,
                    "current_pair_fish_id": current_pair.get("pairFishId") if current_pair else None,
                    "currentPairFishId": current_pair.get("pairFishId") if current_pair else None,
                    "current_pair_fish_alias": current_pair.get("pairFishAlias") if current_pair else None,
                    "currentPairFishAlias": current_pair.get("pairFishAlias") if current_pair else None,
                    "current_pair_date_seen": current_pair.get("dateSeen") if current_pair else None,
                    "currentPairDateSeen": current_pair.get("dateSeen") if current_pair else None,
                }
            )

        if session_doc.get("status") != "completed":
            session_store.update_session(
                user_id=user_id,
                session_id=session_id,
                current_step="pair_matching",
                status="in_progress",
            )

        return {
            "status": "success",
            "session_id": session_id,
            "sessionId": session_id,
            "fishes": fishes,
        }
    except Exception as err:
        print(f"Session pairing load error: {err}")
        return {"status": "failure", "message": "Failed to load pairing data", "error": str(err)}
    finally:
        db.close()


@identification_routes.get("/pairing/fish/{fish_id}/history")
async def GetFishPairHistory(
    fish_id: str,
    sessionId: Optional[str] = Query(default=None),
    auth_data: dict = Depends(Auth().verify_token),
):
    if auth_data.get("user_id") is None:
        return {"status": "failure", "message": auth_data.get("status")}

    user_id = auth_data["user_id"]
    fish_oid = _safe_object_id(fish_id)
    if fish_oid is None:
        return {"status": "failure", "message": "Invalid fish id"}

    db = DB()
    db.connect()
    try:
        _ensure_pairing_indexes(db)
        fish_collection = db.get_collection("fish")
        sites_collection = db.get_collection("sites")
        pair_logs_collection = db.get_collection("fish_pair_logs")

        fish_doc = fish_collection.find_one({"_id": fish_oid, "user_id": user_id, "is_active": True})
        if fish_doc is None:
            return {"status": "failure", "message": "Fish not found"}

        fish_docs = list(
            fish_collection.find(
                {"user_id": user_id, "is_active": True},
                {"_id": 1, "fish_alias": 1, "fish_name": 1},
            )
        )
        fish_alias_by_id = _build_fish_alias_lookup(fish_docs)

        pair_logs = list(
            pair_logs_collection.find(
                {
                    "user_id": user_id,
                    "$or": [{"fish_id_a": fish_id}, {"fish_id_b": fish_id}],
                }
            ).sort("date_seen", -1)
        )

        site_ids: set[str] = set()
        for pair_log in pair_logs:
            raw_site_id = pair_log.get("site_id")
            if raw_site_id:
                site_ids.add(str(raw_site_id))

        site_name_by_id: dict[str, str] = {}
        if site_ids:
            site_oids = [site_oid for site_id_value in site_ids if (site_oid := _safe_object_id(site_id_value))]
            if site_oids:
                site_docs = list(
                    sites_collection.find(
                        {"_id": {"$in": site_oids}, "user_id": user_id},
                        {"_id": 1, "name": 1},
                    )
                )
                for site_doc in site_docs:
                    site_name_by_id[str(site_doc.get("_id"))] = str(site_doc.get("name") or "")

        pair_payload = _build_pair_history_payload(
            fish_id=fish_id,
            pair_logs=pair_logs,
            fish_alias_by_id=fish_alias_by_id,
            site_name_by_id=site_name_by_id,
            current_session_id=sessionId,
        )

        fish_alias = _extract_fish_alias(fish_doc)
        return {
            "status": "success",
            "fish_id": fish_id,
            "fishId": fish_id,
            "fish_alias": fish_alias,
            "fishAlias": fish_alias,
            **pair_payload,
        }
    except Exception as err:
        print(f"Fish pair history error: {err}")
        return {"status": "failure", "message": "Failed to load pair history", "error": str(err)}
    finally:
        db.close()


@identification_routes.post("/pairing/session/{session_id}/assign")
async def AssignSessionPair(
    session_id: str,
    request: AssignPairRequest,
    auth_data: dict = Depends(Auth().verify_token),
):
    if auth_data.get("user_id") is None:
        return {"status": "failure", "message": auth_data.get("status")}

    user_id = auth_data["user_id"]
    fish_id = str(request.fish_id or "").strip()
    pair_fish_id = str(request.pair_fish_id or "").strip()

    if not fish_id or not pair_fish_id:
        return {"status": "failure", "message": "Both fish IDs are required."}
    if fish_id == pair_fish_id:
        return {"status": "failure", "message": "Pair fish must be different from the selected fish."}

    fish_oid = _safe_object_id(fish_id)
    pair_fish_oid = _safe_object_id(pair_fish_id)
    if fish_oid is None or pair_fish_oid is None:
        return {"status": "failure", "message": "Invalid fish id"}

    session_store = WorkflowSessionStore()
    session_doc = session_store.get_session(user_id, session_id)
    if session_doc is None:
        return {"status": "failure", "message": "Session not found"}

    db = DB()
    db.connect()
    try:
        _ensure_pairing_indexes(db)
        fish_collection = db.get_collection("fish")
        identification_logs_collection = db.get_collection("identification_logs")
        pair_logs_collection = db.get_collection("fish_pair_logs")

        fish_docs = list(
            fish_collection.find(
                {"_id": {"$in": [fish_oid, pair_fish_oid]}, "user_id": user_id, "is_active": True},
                {"_id": 1, "fish_alias": 1, "fish_name": 1},
            )
        )
        fish_alias_by_id = _build_fish_alias_lookup(fish_docs)
        if fish_id not in fish_alias_by_id or pair_fish_id not in fish_alias_by_id:
            return {"status": "failure", "message": "One or both fish IDs were not found."}

        base_fish_seen_in_session = (
            identification_logs_collection.count_documents({"session_id": session_id, "fish_id": fish_id}) > 0
        )
        if not base_fish_seen_in_session:
            return {
                "status": "failure",
                "message": "Selected fish was not identified in this session.",
            }

        latest_pair_event_log = identification_logs_collection.find_one(
            {
                "session_id": session_id,
                "fish_id": {"$in": [fish_id, pair_fish_id]},
            },
            sort=[("date_identified", -1)],
            projection={"date_identified": 1},
        )
        now = datetime.utcnow()
        date_seen = (
            latest_pair_event_log.get("date_identified")
            if latest_pair_event_log and latest_pair_event_log.get("date_identified")
            else now
        )
        site_id = str(session_doc.get("site_id")) if session_doc.get("site_id") else None

        fish_id_a, fish_id_b = _canonical_pair_ids(fish_id, pair_fish_id)
        removed_pairs = pair_logs_collection.delete_many(
            {
                "user_id": user_id,
                "session_id": session_id,
                "$or": [
                    {"fish_id_a": {"$in": [fish_id, pair_fish_id]}},
                    {"fish_id_b": {"$in": [fish_id, pair_fish_id]}},
                ],
            }
        )

        pair_logs_collection.insert_one(
            {
                "user_id": user_id,
                "session_id": session_id,
                "fish_id_a": fish_id_a,
                "fish_id_b": fish_id_b,
                "site_id": site_id,
                "date_seen": date_seen,
                "date_created": now,
                "date_modified": now,
                "source": "manual_session_pair",
            }
        )

        if session_doc.get("status") != "completed":
            session_store.update_session(
                user_id=user_id,
                session_id=session_id,
                current_step="pair_matching",
                status="in_progress",
            )

        return {
            "status": "success",
            "session_id": session_id,
            "sessionId": session_id,
            "fish_id": fish_id,
            "fishId": fish_id,
            "fish_alias": fish_alias_by_id.get(fish_id),
            "fishAlias": fish_alias_by_id.get(fish_id),
            "pair_fish_id": pair_fish_id,
            "pairFishId": pair_fish_id,
            "pair_fish_alias": fish_alias_by_id.get(pair_fish_id),
            "pairFishAlias": fish_alias_by_id.get(pair_fish_id),
            "date_seen": date_seen,
            "dateSeen": date_seen,
            "site_id": site_id,
            "siteId": site_id,
            "replaced_pair_count": int(removed_pairs.deleted_count),
            "replacedPairCount": int(removed_pairs.deleted_count),
        }
    except Exception as err:
        print(f"Assign session pair error: {err}")
        return {"status": "failure", "message": "Failed to assign pair", "error": str(err)}
    finally:
        db.close()


@identification_routes.get("/tracking/{fish_id}")
async def TrackingHistory(fish_id: str, auth_data: dict = Depends(Auth().verify_token)):
    if auth_data.get("user_id") is None:
        return {"status": "failure", "message": auth_data.get("status")}

    user_id = auth_data["user_id"]
    fish_oid = _safe_object_id(fish_id)
    if fish_oid is None:
        return {"status": "failure", "message": "Invalid fish id"}

    db = DB()
    db.connect()
    try:
        _ensure_pairing_indexes(db)
        fish_collection = db.get_collection("fish")
        fish_doc = fish_collection.find_one({"_id": fish_oid, "user_id": user_id})
        if fish_doc is None:
            return {"status": "failure", "message": "Fish not found"}

        identification_logs_collection = db.get_collection("identification_logs")
        annotations_collection = db.get_collection("annotations")
        uploads_collection = db.get_collection("user_uploads")
        sites_collection = db.get_collection("sites")
        pair_logs_collection = db.get_collection("fish_pair_logs")

        logs = list(
            identification_logs_collection.find({"fish_id": fish_id}).sort("date_identified", -1)
        )

        sightings: list[dict[str, Any]] = []
        images: list[dict[str, Any]] = []
        seen_images: set[str] = set()

        for log in logs:
            annotation_id = str(log.get("annotation_id", ""))
            annotation_oid = _safe_object_id(annotation_id)
            if annotation_oid is None:
                continue

            annotation = annotations_collection.find_one({"_id": annotation_oid})
            if annotation is None:
                continue

            upload_id = str(annotation.get("user_upload_id", ""))
            upload_oid = _safe_object_id(upload_id)
            if upload_oid is None:
                continue

            upload_doc = uploads_collection.find_one({"_id": upload_oid, "user_id": user_id})
            if upload_doc is None:
                continue

            latitude = None
            longitude = None
            site_id = upload_doc.get("site_id")
            if site_id:
                site_oid = _safe_object_id(str(site_id))
                if site_oid is not None:
                    site_doc = sites_collection.find_one({"_id": site_oid, "user_id": user_id})
                    if site_doc:
                        latitude = site_doc.get("lat")
                        longitude = site_doc.get("long")

            date_time = log.get("date_identified") or upload_doc.get("date_uploaded")
            image_path = f"uploads/{user_id}/{upload_id}.jpg"
            confidence_raw = log.get("confidence", 0.0)
            try:
                confidence_value = float(confidence_raw if confidence_raw is not None else 0.0)
            except (TypeError, ValueError):
                confidence_value = 0.0
            sightings.append(
                {
                    "annotationId": annotation_id,
                    "dateTime": date_time,
                    "latitude": latitude,
                    "longitude": longitude,
                    "confidence": confidence_value,
                    "imagePath": image_path,
                }
            )

            if image_path not in seen_images:
                seen_images.add(image_path)
                images.append(
                    {
                        "imagePath": image_path,
                        "annotationId": annotation_id,
                        "dateTime": date_time,
                    }
                )

        fish_docs = list(
            fish_collection.find(
                {"user_id": user_id, "is_active": True},
                {"_id": 1, "fish_alias": 1, "fish_name": 1},
            )
        )
        fish_alias_by_id = _build_fish_alias_lookup(fish_docs)

        pair_logs = list(
            pair_logs_collection.find(
                {
                    "user_id": user_id,
                    "$or": [{"fish_id_a": fish_id}, {"fish_id_b": fish_id}],
                }
            ).sort("date_seen", -1)
        )
        pair_site_ids: set[str] = set()
        for pair_log in pair_logs:
            raw_site_id = pair_log.get("site_id")
            if raw_site_id:
                pair_site_ids.add(str(raw_site_id))
        site_name_by_id: dict[str, str] = {}
        if pair_site_ids:
            pair_site_oids = [
                site_oid
                for site_id_value in pair_site_ids
                if (site_oid := _safe_object_id(site_id_value)) is not None
            ]
            if pair_site_oids:
                site_docs = list(
                    sites_collection.find(
                        {"_id": {"$in": pair_site_oids}, "user_id": user_id},
                        {"_id": 1, "name": 1},
                    )
                )
                for site_doc in site_docs:
                    site_name_by_id[str(site_doc.get("_id"))] = str(site_doc.get("name") or "")

        pair_payload = _build_pair_history_payload(
            fish_id=fish_id,
            pair_logs=pair_logs,
            fish_alias_by_id=fish_alias_by_id,
            site_name_by_id=site_name_by_id,
        )

        fish_alias = _extract_fish_alias(fish_doc)
        return {
            "status": "success",
            "fishId": fish_id,
            "fish_alias": fish_alias,
            "fishAlias": fish_alias,
            "sightings": sightings,
            "images": images,
            **pair_payload,
        }
    except Exception as err:
        print(f"Tracking history error: {err}")
        return {"status": "failure", "message": "Failed to load tracking history", "error": str(err)}
    finally:
        db.close()
