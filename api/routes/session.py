from datetime import datetime
from pathlib import Path
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from auth import Auth
from data_access.access import DB
from data_access.session import WorkflowSessionStore


session_routes = APIRouter()


class CreateSessionRequest(BaseModel):
    name: Optional[str] = None
    site_id: Optional[str] = Field(default=None, alias="siteId")


def _safe_object_id(raw_value: str) -> Optional[ObjectId]:
    try:
        return ObjectId(raw_value)
    except (InvalidId, TypeError):
        return None


def _remove_file_if_exists(file_path: Path) -> bool:
    if not file_path.exists():
        return False
    if not file_path.is_file():
        return False
    try:
        file_path.unlink()
        return True
    except Exception as err:
        print(f"Failed to remove file {file_path}: {err}")
        return False


def _session_to_response(session_doc: dict, stats: dict | None = None) -> dict:
    result = {
        "id": str(session_doc["_id"]),
        "name": session_doc.get("name"),
        "status": session_doc.get("status", "in_progress"),
        "current_step": session_doc.get("current_step", "upload"),
        "site_id": session_doc.get("site_id"),
        "date_created": session_doc.get("date_created"),
        "date_modified": session_doc.get("date_modified"),
        "date_completed": session_doc.get("date_completed"),
    }
    if stats is not None:
        result["stats"] = stats
    return result


def _build_session_stats(user_id: str, session_id: str) -> dict:
    db = DB()
    db.connect()
    try:
        uploads_collection = db.get_collection("user_uploads")
        annotations_collection = db.get_collection("annotations")
        identification_logs_collection = db.get_collection("identification_logs")

        uploads_count = uploads_collection.count_documents({"user_id": user_id, "session_id": session_id})
        annotations_count = annotations_collection.count_documents({"session_id": session_id})
        identified_count = identification_logs_collection.count_documents(
            {"session_id": session_id, "fish_id": {"$exists": True, "$nin": [None, ""]}}
        )
        last_log = identification_logs_collection.find_one(
            {"session_id": session_id, "fish_id": {"$exists": True, "$nin": [None, ""]}},
            sort=[("date_identified", -1)],
            projection={"fish_id": 1},
        )
        last_fish_id = str(last_log.get("fish_id")) if last_log and last_log.get("fish_id") else None
        unfinished_count = max(annotations_count - identified_count, 0)
        return {
            "uploads_count": uploads_count,
            "annotations_count": annotations_count,
            "identified_count": identified_count,
            "unfinished_count": unfinished_count,
            "last_fish_id": last_fish_id,
        }
    finally:
        db.close()


@session_routes.post("/create")
async def CreateSession(request: CreateSessionRequest, auth_data: dict = Depends(Auth().verify_token)):
    if auth_data.get("user_id") is None:
        return {"status": "failure", "message": auth_data.get("status")}

    user_id = auth_data["user_id"]
    store = WorkflowSessionStore()
    created_session_id = store.create_session(
        user_id=user_id,
        name=request.name,
        site_id=request.site_id,
    )
    if not created_session_id:
        return {"status": "failure", "message": "Failed to create workflow session"}

    session_doc = store.get_session(user_id, created_session_id)
    if session_doc is None:
        return {"status": "failure", "message": "Session was created but could not be loaded"}

    return {
        "status": "success",
        "session_id": created_session_id,
        "session": _session_to_response(session_doc, _build_session_stats(user_id, created_session_id)),
    }


@session_routes.get("/history")
async def SessionHistory(auth_data: dict = Depends(Auth().verify_token)):
    if auth_data.get("user_id") is None:
        return {"status": "failure", "message": auth_data.get("status")}

    user_id = auth_data["user_id"]
    store = WorkflowSessionStore()
    sessions = store.list_sessions(user_id=user_id)

    response_sessions = []
    for session_doc in sessions:
        session_id = str(session_doc["_id"])
        stats = _build_session_stats(user_id, session_id)
        response_sessions.append(_session_to_response(session_doc, stats))

    return {
        "status": "success",
        "sessions": response_sessions,
        "fetched_at": datetime.utcnow(),
    }


@session_routes.get("/{session_id}")
async def GetSession(session_id: str, auth_data: dict = Depends(Auth().verify_token)):
    if auth_data.get("user_id") is None:
        return {"status": "failure", "message": auth_data.get("status")}

    user_id = auth_data["user_id"]
    store = WorkflowSessionStore()
    session_doc = store.get_session(user_id, session_id)
    if session_doc is None:
        return {"status": "failure", "message": "Session not found"}

    return {
        "status": "success",
        "session": _session_to_response(session_doc, _build_session_stats(user_id, session_id)),
    }


@session_routes.post("/{session_id}/complete")
async def CompleteSession(session_id: str, auth_data: dict = Depends(Auth().verify_token)):
    if auth_data.get("user_id") is None:
        return {"status": "failure", "message": auth_data.get("status")}

    user_id = auth_data["user_id"]
    store = WorkflowSessionStore()
    session_doc = store.get_session(user_id, session_id)
    if session_doc is None:
        return {"status": "failure", "message": "Session not found"}

    updated = store.update_session(
        user_id=user_id,
        session_id=session_id,
        current_step="pair_matching",
        status="completed",
    )
    if not updated:
        return {"status": "failure", "message": "Failed to update workflow session"}

    updated_doc = store.get_session(user_id, session_id)
    if updated_doc is None:
        return {"status": "failure", "message": "Session updated but could not be loaded"}

    return {
        "status": "success",
        "session_id": session_id,
        "session": _session_to_response(updated_doc, _build_session_stats(user_id, session_id)),
    }


@session_routes.delete("/{session_id}")
async def DeleteSession(session_id: str, auth_data: dict = Depends(Auth().verify_token)):
    if auth_data.get("user_id") is None:
        return {"status": "failure", "message": auth_data.get("status")}

    user_id = auth_data["user_id"]
    store = WorkflowSessionStore()
    session_doc = store.get_session(user_id, session_id)
    if session_doc is None:
        return {"status": "failure", "message": "Session not found"}

    session_oid = _safe_object_id(session_id)
    if session_oid is None:
        return {"status": "failure", "message": "Invalid session id"}

    db = DB()
    db.connect()
    try:
        uploads_collection = db.get_collection("user_uploads")
        annotations_collection = db.get_collection("annotations")
        identification_logs_collection = db.get_collection("identification_logs")
        pair_logs_collection = db.get_collection("fish_pair_logs")
        query_embeddings_collection = db.get_collection("query_embeddings")
        embeddings_collection = db.get_collection("fish_embeddings")
        fish_collection = db.get_collection("fish")
        sessions_collection = db.get_collection("workflow_sessions")

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
        annotations = list(
            annotations_collection.find(
                annotation_query,
                {"_id": 1, "user_upload_id": 1},
            )
        )
        annotation_ids = [str(doc["_id"]) for doc in annotations]

        log_or_clauses: list[dict] = [{"session_id": session_id}]
        if annotation_ids:
            log_or_clauses.append({"annotation_id": {"$in": annotation_ids}})
        log_query = log_or_clauses[0] if len(log_or_clauses) == 1 else {"$or": log_or_clauses}
        logs = list(
            identification_logs_collection.find(
                log_query,
                {"_id": 1, "fish_id": 1},
            )
        )
        fish_ids: set[str] = {
            str(doc["fish_id"])
            for doc in logs
            if doc.get("fish_id")
        }

        query_embedding_or_clauses: list[dict] = []
        if annotation_ids:
            query_embedding_or_clauses.append({"annotation_id": {"$in": annotation_ids}})
        if upload_ids:
            query_embedding_or_clauses.append({"user_upload_id": {"$in": upload_ids}})
        if session_id:
            query_embedding_or_clauses.append({"source_session_id": session_id})
        query_embedding_core = (
            query_embedding_or_clauses[0]
            if len(query_embedding_or_clauses) == 1
            else {"$or": query_embedding_or_clauses}
        )
        query_embedding_query = {"user_id": user_id, **query_embedding_core}
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

        removed_photo_files = 0
        removed_crop_files = 0
        for upload_id in upload_ids:
            upload_file = Path("uploads") / user_id / f"{upload_id}.jpg"
            if _remove_file_if_exists(upload_file):
                removed_photo_files += 1

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
        deleted_pair_logs = pair_logs_collection.delete_many(
            {"user_id": user_id, "session_id": session_id}
        ).deleted_count
        deleted_query_embeddings = query_embeddings_collection.delete_many(query_embedding_query).deleted_count
        deleted_embeddings = embeddings_collection.delete_many(embedding_query).deleted_count
        deleted_annotations = annotations_collection.delete_many(annotation_query).deleted_count
        deleted_uploads = uploads_collection.delete_many({"user_id": user_id, "session_id": session_id}).deleted_count
        deleted_session = sessions_collection.delete_one({"_id": session_oid, "user_id": user_id}).deleted_count

        deleted_fish = 0
        for fish_id in fish_ids:
            fish_oid = _safe_object_id(fish_id)
            if fish_oid is None:
                continue
            remaining_logs = identification_logs_collection.count_documents({"fish_id": fish_id})
            remaining_embeddings = embeddings_collection.count_documents({"fish_id": fish_id, "user_id": user_id})
            remaining_pair_logs = pair_logs_collection.count_documents(
                {
                    "user_id": user_id,
                    "$or": [{"fish_id_a": fish_id}, {"fish_id_b": fish_id}],
                }
            )
            if remaining_logs == 0 and remaining_embeddings == 0 and remaining_pair_logs == 0:
                fish_delete_result = fish_collection.delete_one({"_id": fish_oid, "user_id": user_id})
                deleted_fish += fish_delete_result.deleted_count

        if deleted_session == 0:
            return {"status": "failure", "message": "Failed to delete workflow session"}

        return {
            "status": "success",
            "session_id": session_id,
            "deleted": {
                "workflow_sessions": deleted_session,
                "user_uploads": deleted_uploads,
                "annotations": deleted_annotations,
                "identification_logs": deleted_logs,
                "fish_pair_logs": deleted_pair_logs,
                "query_embeddings": deleted_query_embeddings,
                "fish_embeddings": deleted_embeddings,
                "fish": deleted_fish,
                "photo_files": removed_photo_files,
                "crop_files": removed_crop_files,
            },
        }
    except Exception as err:
        print(f"Failed to delete session {session_id}: {err}")
        return {"status": "failure", "message": "Failed to delete session", "error": str(err)}
    finally:
        db.close()
