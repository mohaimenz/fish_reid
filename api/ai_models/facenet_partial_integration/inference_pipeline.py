from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence

from PIL import Image
import torch

try:
    from .model_def import FaceNetPartial, build_eval_transform, infer_embedding_dim
except ImportError:
    from model_def import FaceNetPartial, build_eval_transform, infer_embedding_dim


VALID_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}


@dataclass
class MatchResult:
    assigned_id: str | None
    distance: float
    best_index: int


def choose_device(device: str | None = None) -> torch.device:
    if device is not None:
        return torch.device(device)
    if torch.cuda.is_available():
        return torch.device("cuda")
    if torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def load_model(
    weights_path: str | Path,
    embedding_dim: int | None = None,
    device: str | None = None,
) -> tuple[FaceNetPartial, torch.device]:
    dev = choose_device(device)
    raw = torch.load(weights_path, map_location="cpu")
    state_dict = raw["model_state"] if isinstance(raw, dict) and "model_state" in raw else raw
    if not isinstance(state_dict, dict):
        raise ValueError("Expected checkpoint to be a state_dict or {'model_state': state_dict}.")
    dim = embedding_dim if embedding_dim is not None else infer_embedding_dim(state_dict)
    model = FaceNetPartial(embedding_dim=dim)
    model.load_state_dict(state_dict, strict=True)
    model.to(dev)
    model.eval()
    return model, dev


def embed_image(
    model: FaceNetPartial,
    image_path: str | Path,
    image_size: int = 224,
    device: torch.device | None = None,
) -> torch.Tensor:
    dev = device or next(model.parameters()).device
    tfm = build_eval_transform(image_size=image_size)
    image = Image.open(image_path).convert("RGB")
    x = tfm(image).unsqueeze(0).to(dev)
    with torch.no_grad():
        emb = model(x)
    return emb.squeeze(0).cpu()


def embed_images(
    model: FaceNetPartial,
    image_paths: Sequence[str | Path],
    image_size: int = 224,
    batch_size: int = 32,
    device: torch.device | None = None,
) -> torch.Tensor:
    dev = device or next(model.parameters()).device
    tfm = build_eval_transform(image_size=image_size)
    paths = [Path(p) for p in image_paths]
    out: list[torch.Tensor] = []
    with torch.no_grad():
        for i in range(0, len(paths), batch_size):
            chunk = paths[i : i + batch_size]
            batch = torch.stack([tfm(Image.open(p).convert("RGB")) for p in chunk]).to(dev)
            out.append(model(batch).cpu())
    if not out:
        return torch.empty(0)
    return torch.cat(out, dim=0)


def nearest_neighbor_match(
    query_embedding: torch.Tensor,
    gallery_embeddings: torch.Tensor,
    gallery_ids: Sequence[str],
    threshold: float | None = None,
) -> MatchResult:
    if gallery_embeddings.ndim != 2:
        raise ValueError("gallery_embeddings must be [N, D].")
    if len(gallery_ids) != gallery_embeddings.size(0):
        raise ValueError("gallery_ids length must equal number of gallery embeddings.")
    dists = torch.cdist(query_embedding.unsqueeze(0), gallery_embeddings).squeeze(0)
    best_idx = int(torch.argmin(dists))
    best_dist = float(dists[best_idx])
    assigned = gallery_ids[best_idx] if (threshold is None or best_dist <= threshold) else None
    return MatchResult(assigned_id=assigned, distance=best_dist, best_index=best_idx)


def load_gallery_from_dir(gallery_dir: str | Path) -> tuple[list[Path], list[str]]:
    root = Path(gallery_dir)
    image_paths: list[Path] = []
    labels: list[str] = []
    for id_dir in sorted(p for p in root.iterdir() if p.is_dir()):
        for img in sorted(id_dir.iterdir()):
            if img.suffix.lower() in VALID_EXTS:
                image_paths.append(img)
                labels.append(id_dir.name)
    if not image_paths:
        raise ValueError(f"No gallery images found under {root}")
    return image_paths, labels


def main() -> None:
    parser = argparse.ArgumentParser(description="Minimal FaceNetPartial inference CLI.")
    parser.add_argument(
        "--weights",
        default="facenet_partial_state_dict.pth",
        help="Path to state_dict .pth file.",
    )
    parser.add_argument("--query", required=True, help="Query image path.")
    parser.add_argument(
        "--gallery-dir",
        required=True,
        help="Gallery root with one subfolder per identity.",
    )
    parser.add_argument("--image-size", type=int, default=224)
    parser.add_argument("--embedding-dim", type=int, default=128)
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.6177526116371155,
        help="L2 distance threshold for unknown rejection.",
    )
    parser.add_argument("--device", default=None, help="cpu | cuda | mps")
    args = parser.parse_args()

    model, device = load_model(
        args.weights,
        embedding_dim=args.embedding_dim,
        device=args.device,
    )
    gallery_paths, gallery_ids = load_gallery_from_dir(args.gallery_dir)
    gallery_emb = embed_images(
        model,
        gallery_paths,
        image_size=args.image_size,
        batch_size=32,
        device=device,
    )
    query_emb = embed_image(
        model,
        args.query,
        image_size=args.image_size,
        device=device,
    )
    match = nearest_neighbor_match(
        query_embedding=query_emb,
        gallery_embeddings=gallery_emb,
        gallery_ids=gallery_ids,
        threshold=args.threshold,
    )

    print(f"assigned_id: {match.assigned_id}")
    print(f"distance: {match.distance:.6f}")
    print(f"best_index: {match.best_index}")


if __name__ == "__main__":
    main()
