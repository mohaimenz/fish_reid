from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from data_access.models import Annotations, Users
from data_access.logic import Logic 
from datetime import datetime
from typing import List
import ai_models.yolo_detector as yolo_detector
import os
from pathlib import Path
from auth import Auth
from data_access.photo import Photo
from data_access.annotation import Annotation
from data_access.session import WorkflowSessionStore
from data_access.access import DB
from bson import ObjectId
from bson.errors import InvalidId

detector_routes = APIRouter()
RABBITFISH_BODY_CLASS = 0

class DetectionRequest(BaseModel):
    photo_ids: List[str] | None = Field(default=None, alias="photoIds")
    session_id: str | None = Field(default=None, alias="sessionId")
    rerun_detection: bool = Field(default=False, alias="rerunDetection")


def _safe_object_id(raw_value: str | None) -> ObjectId | None:
    if not raw_value:
        return None
    try:
        return ObjectId(raw_value)
    except (InvalidId, TypeError):
        return None


def _remove_file_if_exists(file_path: Path) -> bool:
    if not file_path.exists() or not file_path.is_file():
        return False
    try:
        file_path.unlink()
        return True
    except Exception as err:
        print(f"Failed to remove file {file_path}: {err}")
        return False


def _cleanup_session_detection_data(db: DB, user_id: str, session_id: str) -> dict:
    uploads_collection = db.get_collection("user_uploads")
    annotations_collection = db.get_collection("annotations")
    identification_logs_collection = db.get_collection("identification_logs")
    query_embeddings_collection = db.get_collection("query_embeddings")
    embeddings_collection = db.get_collection("fish_embeddings")
    fish_collection = db.get_collection("fish")

    uploads = list(
        uploads_collection.find(
            {"user_id": user_id, "session_id": session_id},
            {"_id": 1},
        )
    )
    upload_ids = [str(doc["_id"]) for doc in uploads]

    annotation_or_clauses: list[dict] = [{"session_id": session_id}]
    if upload_ids:
        annotation_or_clauses.append({"user_upload_id": {"$in": upload_ids}})
    annotation_query = (
        annotation_or_clauses[0]
        if len(annotation_or_clauses) == 1
        else {"$or": annotation_or_clauses}
    )
    annotations = list(annotations_collection.find(annotation_query, {"_id": 1}))
    annotation_ids = [str(doc["_id"]) for doc in annotations]

    log_or_clauses: list[dict] = [{"session_id": session_id}]
    if annotation_ids:
        log_or_clauses.append({"annotation_id": {"$in": annotation_ids}})
    log_query = log_or_clauses[0] if len(log_or_clauses) == 1 else {"$or": log_or_clauses}
    logs = list(identification_logs_collection.find(log_query, {"_id": 1, "fish_id": 1}))
    fish_ids: set[str] = {
        str(doc["fish_id"])
        for doc in logs
        if doc.get("fish_id")
    }

    query_embedding_or_clauses: list[dict] = [{"source_session_id": session_id}]
    if annotation_ids:
        query_embedding_or_clauses.append({"annotation_id": {"$in": annotation_ids}})
    if upload_ids:
        query_embedding_or_clauses.append({"user_upload_id": {"$in": upload_ids}})
    query_embedding_query_core = (
        query_embedding_or_clauses[0]
        if len(query_embedding_or_clauses) == 1
        else {"$or": query_embedding_or_clauses}
    )
    query_embedding_query = {"user_id": user_id, **query_embedding_query_core}
    query_embeddings = list(
        query_embeddings_collection.find(
            query_embedding_query,
            {"_id": 1, "crop_path": 1},
        )
    )

    embedding_or_clauses: list[dict] = [{"source_session_id": session_id}]
    if annotation_ids:
        embedding_or_clauses.append({"annotation_id": {"$in": annotation_ids}})
    if upload_ids:
        embedding_or_clauses.append({"user_upload_id": {"$in": upload_ids}})
    embedding_query_core = (
        embedding_or_clauses[0]
        if len(embedding_or_clauses) == 1
        else {"$or": embedding_or_clauses}
    )
    embedding_query = {"user_id": user_id, **embedding_query_core}
    embeddings = list(
        embeddings_collection.find(
            embedding_query,
            {"_id": 1, "fish_id": 1, "crop_path": 1},
        )
    )
    fish_ids.update(
        str(doc["fish_id"])
        for doc in embeddings
        if doc.get("fish_id")
    )

    removed_crop_files = 0
    crop_paths: set[Path] = set()
    for annotation_id in annotation_ids:
        crop_paths.add(Path("uploads") / user_id / "crops" / f"{annotation_id}.jpg")
    for emb in embeddings:
        crop_path = emb.get("crop_path")
        if isinstance(crop_path, str) and crop_path:
            crop_paths.add(Path(crop_path))
    for emb in query_embeddings:
        crop_path = emb.get("crop_path")
        if isinstance(crop_path, str) and crop_path:
            crop_paths.add(Path(crop_path))
    for crop_path in crop_paths:
        if _remove_file_if_exists(crop_path):
            removed_crop_files += 1

    deleted_logs = identification_logs_collection.delete_many(log_query).deleted_count
    deleted_query_embeddings = query_embeddings_collection.delete_many(query_embedding_query).deleted_count
    deleted_embeddings = embeddings_collection.delete_many(embedding_query).deleted_count
    deleted_annotations = annotations_collection.delete_many(annotation_query).deleted_count

    deleted_fish = 0
    for fish_id in fish_ids:
        fish_oid = _safe_object_id(fish_id)
        if fish_oid is None:
            continue
        remaining_logs = identification_logs_collection.count_documents({"fish_id": fish_id})
        remaining_embeddings = embeddings_collection.count_documents({"fish_id": fish_id, "user_id": user_id})
        if remaining_logs == 0 and remaining_embeddings == 0:
            deleted_fish += fish_collection.delete_one({"_id": fish_oid, "user_id": user_id}).deleted_count

    return {
        "deleted_annotations": deleted_annotations,
        "deleted_identification_logs": deleted_logs,
        "deleted_query_embeddings": deleted_query_embeddings,
        "deleted_embeddings": deleted_embeddings,
        "deleted_fish": deleted_fish,
        "deleted_crop_files": removed_crop_files,
    }

@detector_routes.post("/detect")
async def Detect(request: DetectionRequest, auth_data: dict=Depends(Auth().verify_token)):
    if auth_data.get("user_id") is None:
        return {'status': 'failure', 'message': auth_data.get("status")}
    user_id = auth_data.get("user_id")
    requested_photo_ids = request.photo_ids or []
    requested_session_id = request.session_id
    rerun_detection = bool(request.rerun_detection)

    session_store = WorkflowSessionStore()
    resolved_session_id = requested_session_id
    if resolved_session_id:
        session_doc = session_store.get_session(user_id, resolved_session_id)
        if session_doc is None:
            return {'status': 'failure', 'message': 'Invalid workflow session'}

    upload_docs: list[dict] = []
    db = DB()
    db.connect()
    try:
        uploads_collection = db.get_collection("user_uploads")
        if rerun_detection:
            if not resolved_session_id:
                return {'status': 'failure', 'message': 'Session is required to rerun detection'}
            upload_docs = list(
                uploads_collection.find(
                    {"user_id": user_id, "session_id": resolved_session_id}
                )
            )
        elif requested_photo_ids:
            photo_object_ids = []
            for photo_id in requested_photo_ids:
                oid = _safe_object_id(photo_id)
                if oid is None:
                    return {'status': 'failure', 'message': f'Invalid photo id: {photo_id}'}
                photo_object_ids.append(oid)
            upload_docs = list(
                uploads_collection.find(
                    {
                        "_id": {"$in": photo_object_ids},
                        "user_id": user_id,
                    }
                )
            )
        elif resolved_session_id:
            upload_docs = list(
                uploads_collection.find(
                    {"user_id": user_id, "session_id": resolved_session_id}
                )
            )

        if requested_photo_ids and len(upload_docs) != len(requested_photo_ids):
            return {'status': 'failure', 'message': 'One or more uploaded photos are invalid for this user'}

        upload_session_ids = {str(doc.get("session_id")) for doc in upload_docs if doc.get("session_id")}
        if len(upload_session_ids) > 1:
            return {'status': 'failure', 'message': 'Provided photos span multiple workflow sessions'}

        if resolved_session_id is None and len(upload_session_ids) == 1:
            resolved_session_id = next(iter(upload_session_ids))
        if resolved_session_id is None:
            return {'status': 'failure', 'message': 'Workflow session could not be resolved for detection'}
        if upload_session_ids and resolved_session_id not in upload_session_ids:
            return {'status': 'failure', 'message': 'Provided photos do not belong to selected workflow session'}

        cleanup_summary = {}
        if rerun_detection:
            cleanup_summary = _cleanup_session_detection_data(
                db=db,
                user_id=user_id,
                session_id=resolved_session_id,
            )

        upload_ids_for_processing = [str(doc["_id"]) for doc in upload_docs]
        annotations_collection = db.get_collection("annotations")

        existing_annotation_upload_ids: set[str] = set()
        if upload_ids_for_processing:
            existing_annotations = annotations_collection.find(
                {
                    "user_upload_id": {"$in": upload_ids_for_processing},
                    "session_id": resolved_session_id,
                },
                {"user_upload_id": 1},
            )
            existing_annotation_upload_ids = {
                str(doc.get("user_upload_id"))
                for doc in existing_annotations
                if doc.get("user_upload_id")
            }

        if rerun_detection:
            detect_upload_ids = upload_ids_for_processing
        else:
            detect_upload_ids = [
                upload_id
                for upload_id in upload_ids_for_processing
                if upload_id not in existing_annotation_upload_ids
            ]

        # Authenticate user_token here (omitted for brevity)
        if detect_upload_ids:
            photo_handler = Photo(user_id=user_id, session_id=resolved_session_id)
            photo_paths = [photo_handler.get_photo_path(photo_id) for photo_id in detect_upload_ids]
            # Get predictions from YOLO detector
            preditions = yolo_detector.get_predictions(photo_paths)
            print(f"Number of prediction results: {len(preditions)}")
            # Save predictions to database
            for idx, preds in enumerate(preditions):
                img_path = preds.get("image_path")
                detections = preds.get("detections")
                # Find corresponding user_upload_id
                file_name = os.path.basename(img_path)
                upload_id = os.path.splitext(file_name)[0]

                # Save each detection
                print(f"Processing prediction {idx}: upload_id={upload_id}, num_detections={len(detections)}")
                for det_idx, det in enumerate(detections):
                    # YOLO returns both fish body and fish head classes.
                    # We intentionally discard head detections and keep only body detections for re-identification.
                    if int(det.get('class_name', -1)) != RABBITFISH_BODY_CLASS:
                        continue
                    print(f"  Inserting detection {det_idx}: x_min={det['x_min']}, y_min={det['y_min']}")
                    annotation = Annotations(
                        user_upload_id=upload_id,
                        session_id=resolved_session_id,
                        x_min=det['x_min'],
                        y_min=det['y_min'],
                        height=det['height'],
                        width=det['width'],
                        class_name=det['class_name'],
                        confidence=det['confidence']
                    )
                    Logic().insert(annotation)

        # Load all annotations in session for workflow browsing.
        session_store.update_session(
            user_id=user_id,
            session_id=resolved_session_id,
            current_step="detection",
            status="in_progress",
        )

        annotation_handler = Annotation(user_id=user_id, session_id=resolved_session_id)
        all_results = annotation_handler.load_saved_annotations(include_identified=True)

        return {
            'status': 'success',
            'results': all_results,
            'session_id': resolved_session_id,
            'rerun_detection': rerun_detection,
            'processed_upload_ids': detect_upload_ids,
            'skipped_upload_ids': (
                []
                if rerun_detection
                else [upload_id for upload_id in upload_ids_for_processing if upload_id not in detect_upload_ids]
            ),
            'cleanup': cleanup_summary,
        }
    except Exception as err:
        print(f"Detection error: {err}")
        return {'status': 'failure', 'message': 'Detection failed', 'error': str(err)}
    finally:
        db.close()

@detector_routes.get("/resume-detection")
async def ResumeDetection(
    sessionId: str | None = None,
    includeIdentified: bool = False,
    auth_data: dict = Depends(Auth().verify_token),
):
    if auth_data.get("user_id") is None:
        return {'status': 'failure', 'message': auth_data.get("status")}
    
    user_id = auth_data.get("user_id")
    session_store = WorkflowSessionStore()
    resolved_session_id = sessionId
    if resolved_session_id:
        session_doc = session_store.get_session(user_id, resolved_session_id)
        if session_doc is None:
            return {'status': 'failure', 'message': 'Session not found'}
    else:
        latest = session_store.get_latest_in_progress_session(user_id)
        if latest:
            resolved_session_id = str(latest["_id"])

    if not resolved_session_id:
        return {'status': 'success', 'results': [], 'session_id': None}

    annotation_handler = Annotation(user_id=user_id, session_id=resolved_session_id)
    results = annotation_handler.load_saved_annotations(include_identified=includeIdentified)
    
    return {
        'status': 'success',
        'results': results,
        'session_id': resolved_session_id,
        'include_identified': includeIdentified,
    }

@detector_routes.get("/check-unfinished")
async def CheckUnfinished(sessionId: str | None = None, auth_data: dict=Depends(Auth().verify_token)):
    if auth_data.get("user_id") is None:
        return {'status': 'failure', 'message': auth_data.get("status")}
    
    user_id = auth_data.get("user_id")
    session_store = WorkflowSessionStore()
    target_sessions: list[str] = []

    if sessionId:
        session_doc = session_store.get_session(user_id, sessionId)
        if session_doc is None:
            return {'status': 'failure', 'message': 'Session not found'}
        target_sessions = [sessionId]
    else:
        sessions = session_store.list_sessions(user_id=user_id, limit=100)
        target_sessions = [str(s["_id"]) for s in sessions if s.get("status") == "in_progress"]

    unfinished_session_id = None
    has_work = False
    for sid in target_sessions:
        annotation_handler = Annotation(user_id=user_id, session_id=sid)
        if annotation_handler.has_unfinished_work():
            has_work = True
            unfinished_session_id = sid
            break
    
    return {
        'status': 'success',
        'has_unfinished_work': has_work,
        'session_id': unfinished_session_id
    }

class DiscardSessionRequest(BaseModel):
    session_id: str | None = Field(default=None, alias="sessionId")

@detector_routes.delete("/discard-previous-unfinished")
async def DiscardPrevUnfinished(
    request: DiscardSessionRequest | None = None,
    auth_data: dict=Depends(Auth().verify_token)
):
    if auth_data.get("user_id") is None:
        return {'status': 'failure', 'message': auth_data.get("status")}
    
    user_id = auth_data.get("user_id")
    session_store = WorkflowSessionStore()
    target_session_ids: list[str] = []

    requested_session_id = request.session_id if request else None
    if requested_session_id:
        session_doc = session_store.get_session(user_id, requested_session_id)
        if session_doc is None:
            return {'status': 'failure', 'message': 'Session not found'}
        target_session_ids = [requested_session_id]
    else:
        sessions = session_store.list_sessions(user_id=user_id, limit=100)
        target_session_ids = [str(s["_id"]) for s in sessions if s.get("status") == "in_progress"]

    total_deleted_annotations = 0
    deleted_uploads = 0
    processed_sessions: list[str] = []

    for session_id in target_session_ids:
        # Step 1: Delete unidentified annotations in target session
        annotation_handler = Annotation(user_id=user_id, session_id=session_id)
        result = annotation_handler.delete_unidentified_annotations()
        total_deleted_annotations += result.get('deleted_count', 0)
        
        # Step 2: Get upload_ids that have no remaining annotations
        upload_ids_to_delete = result.get('upload_ids_to_delete', [])
        
        # Step 3: Delete the uploads from database and photos from disk
        if upload_ids_to_delete:
            photo_handler = Photo(user_id=user_id, session_id=session_id)
            for upload_id in upload_ids_to_delete:
                photo_handler.delete_photo(upload_id)
                deleted_uploads += 1

        session_store.update_session(
            user_id=user_id,
            session_id=session_id,
            status="discarded",
            current_step="upload",
        )
        processed_sessions.append(session_id)
    
    return {
        'status': 'success',
        'deleted_annotations': total_deleted_annotations,
        'deleted_uploads': deleted_uploads,
        'session_ids': processed_sessions
    }

class DeleteBboxRequest(BaseModel):
    annotation_id: str = Field(..., alias="annotationId")

class ManualAnnotationRequest(BaseModel):
    user_upload_id: str
    session_id: str | None = Field(default=None, alias="sessionId")
    x_min: int
    y_min: int
    width: int
    height: int
    class_name: int = 0
    confidence: float = 1.0

class DeleteImageRequest(BaseModel):
    user_upload_id: str = Field(..., alias="uploadId")

@detector_routes.delete("/delete-image")
async def DeleteImage(request: DeleteImageRequest, auth_data: dict=Depends(Auth().verify_token)):
    if auth_data.get("user_id") is None:
        return {'status': 'failure', 'message': auth_data.get("status")}
    
    user_id = auth_data.get("user_id")
    upload_id = request.user_upload_id
    
    # Verify upload belongs to user using existing Logic().get_by_query()
    upload = Logic().get_by_query("user_uploads", {
        "_id": ObjectId(upload_id),
        "user_id": user_id
    })
    
    if not upload or len(upload) == 0:
        return {'status': 'failure', 'message': 'Unauthorized or upload not found'}
    
    # Delete all annotations for this upload using existing Logic().delete()
    deleted_annotations = Logic().delete("annotations", {"user_upload_id": upload_id})
    
    # Delete upload record and physical file using existing Photo.delete_photo()
    photo_handler = Photo(user_id=user_id)
    file_deleted = photo_handler.delete_photo(upload_id)
    
    return {
        'status': 'success',
        'deleted_annotations': deleted_annotations,
        'file_deleted': file_deleted
    }

@detector_routes.post("/save-manual-annotation")
async def SaveManualAnnotation(request: ManualAnnotationRequest, auth_data: dict=Depends(Auth().verify_token)):
    if auth_data.get("user_id") is None:
        return {'status': 'failure', 'message': auth_data.get("status")}
    
    user_id = auth_data.get("user_id")
    
    # Verify upload belongs to user
    upload = Logic().get_by_query("user_uploads", {
        "_id": ObjectId(request.user_upload_id),
        "user_id": user_id
    })
    
    if not upload:
        return {'status': 'failure', 'message': 'Unauthorized or upload not found'}
    upload_session_id = upload[0].get("session_id")
    if request.session_id and str(upload_session_id) != request.session_id:
        return {'status': 'failure', 'message': 'Upload does not belong to selected session'}
    
    # Create annotation
    annotation = Annotations(
        user_upload_id=request.user_upload_id,
        session_id=str(upload_session_id) if upload_session_id else None,
        x_min=request.x_min,
        y_min=request.y_min,
        height=request.height,
        width=request.width,
        class_name=request.class_name,
        confidence=request.confidence
    )
    
    annotation_id = Logic().insert(annotation)
    
    return {'status': 'success', 'annotation_id': annotation_id}

@detector_routes.delete("/delete-bbox")
async def DeleteBbox(request: DeleteBboxRequest, auth_data: dict=Depends(Auth().verify_token)):
    if auth_data.get("user_id") is None:
        return {'status': 'failure', 'message': auth_data.get("status")}
    
    user_id = auth_data.get("user_id")
    annotation_handler = Annotation(user_id=user_id)
    
    # Delete the annotation
    result = annotation_handler.delete_annotation(request.annotation_id)
    
    if result.get('success'):
        return {'status': 'success', 'message': 'Annotation deleted successfully'}
    else:
        return {'status': 'failure', 'message': result.get('error', 'Failed to delete annotation')}
