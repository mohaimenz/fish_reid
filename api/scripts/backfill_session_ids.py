#!/usr/bin/env python3
from __future__ import annotations

import argparse
from collections import defaultdict
from datetime import datetime
from pathlib import Path
import sys
from typing import Any

API_DIR = Path(__file__).resolve().parents[1]
if str(API_DIR) not in sys.path:
    sys.path.insert(0, str(API_DIR))

from data_access.access import DB  # noqa: E402


def _is_missing_session_id(value: Any) -> bool:
    return value is None or value == ""


def _session_group_key(upload_doc: dict[str, Any]) -> tuple[str, str | None, str]:
    user_id = str(upload_doc.get("user_id") or "")
    site_id = upload_doc.get("site_id")
    date_uploaded = upload_doc.get("date_uploaded")

    if isinstance(date_uploaded, datetime):
        date_key = date_uploaded.isoformat()
    else:
        date_key = f"oid:{upload_doc.get('_id')}"
    return user_id, str(site_id) if site_id else None, date_key


def _infer_session_state(
    uploads_count: int,
    annotations_count: int,
    identified_count: int,
) -> tuple[str, str]:
    if uploads_count == 0:
        return "upload", "discarded"
    if annotations_count == 0:
        return "upload", "in_progress"
    if identified_count >= annotations_count:
        return "tracking", "completed"
    if identified_count > 0:
        return "identification", "in_progress"
    return "detection", "in_progress"


def backfill_session_ids(apply_changes: bool, verbose: bool = False) -> dict[str, int]:
    db = DB()
    db.connect()

    summary = {
        "created_sessions": 0,
        "updated_uploads": 0,
        "updated_annotations": 0,
        "updated_identification_logs": 0,
        "updated_embeddings": 0,
        "updated_session_states": 0,
    }

    try:
        uploads_collection = db.get_collection("user_uploads")
        annotations_collection = db.get_collection("annotations")
        logs_collection = db.get_collection("identification_logs")
        embeddings_collection = db.get_collection("fish_embeddings")
        sessions_collection = db.get_collection("workflow_sessions")

        missing_uploads = list(
            uploads_collection.find(
                {
                    "$or": [
                        {"session_id": {"$exists": False}},
                        {"session_id": None},
                        {"session_id": ""},
                    ]
                }
            ).sort("date_uploaded", 1)
        )

        uploads_by_group: dict[tuple[str, str | None, str], list[dict[str, Any]]] = defaultdict(list)
        for upload in missing_uploads:
            uploads_by_group[_session_group_key(upload)].append(upload)

        for group_key, group_uploads in uploads_by_group.items():
            user_id, site_id, _ = group_key
            first_upload = group_uploads[0]
            created_at = first_upload.get("date_uploaded")
            if not isinstance(created_at, datetime):
                created_at = datetime.utcnow()

            session_doc = {
                "user_id": user_id,
                "name": f"Migrated Session {created_at.strftime('%Y-%m-%d %H:%M:%S')}",
                "status": "in_progress",
                "current_step": "upload",
                "site_id": site_id,
                "date_created": created_at,
                "date_modified": datetime.utcnow(),
                "date_completed": None,
                "migrated": True,
            }

            if apply_changes:
                inserted = sessions_collection.insert_one(session_doc)
                session_id = str(inserted.inserted_id)
            else:
                session_id = f"dry-run-session-{summary['created_sessions'] + 1}"

            summary["created_sessions"] += 1

            upload_oids = [doc["_id"] for doc in group_uploads]
            if apply_changes:
                update_result = uploads_collection.update_many(
                    {"_id": {"$in": upload_oids}},
                    {"$set": {"session_id": session_id}},
                )
                summary["updated_uploads"] += update_result.modified_count
            else:
                summary["updated_uploads"] += len(upload_oids)

            if verbose:
                print(
                    f"[group] user={user_id} site={site_id} uploads={len(upload_oids)} "
                    f"-> session={session_id}"
                )

        upload_session_map: dict[str, str] = {}
        for upload_doc in uploads_collection.find({}, {"_id": 1, "session_id": 1}):
            session_id = upload_doc.get("session_id")
            if _is_missing_session_id(session_id):
                continue
            upload_session_map[str(upload_doc["_id"])] = str(session_id)

        missing_annotations = annotations_collection.find(
            {
                "$or": [
                    {"session_id": {"$exists": False}},
                    {"session_id": None},
                    {"session_id": ""},
                ]
            },
            {"_id": 1, "user_upload_id": 1},
        )
        annotation_session_map: dict[str, str] = {}
        annotation_updates: list[tuple[Any, str]] = []
        for annotation in missing_annotations:
            upload_id = str(annotation.get("user_upload_id") or "")
            session_id = upload_session_map.get(upload_id)
            if not session_id:
                continue
            annotation_updates.append((annotation["_id"], session_id))
            annotation_session_map[str(annotation["_id"])] = session_id

        for annotation_id, session_id in annotation_updates:
            if apply_changes:
                annotations_collection.update_one(
                    {"_id": annotation_id},
                    {"$set": {"session_id": session_id}},
                )
            summary["updated_annotations"] += 1

        for annotation in annotations_collection.find({}, {"_id": 1, "session_id": 1}):
            session_id = annotation.get("session_id")
            if _is_missing_session_id(session_id):
                continue
            annotation_session_map[str(annotation["_id"])] = str(session_id)

        missing_logs = logs_collection.find(
            {
                "$or": [
                    {"session_id": {"$exists": False}},
                    {"session_id": None},
                    {"session_id": ""},
                ]
            },
            {"_id": 1, "annotation_id": 1},
        )
        log_updates: list[tuple[Any, str]] = []
        for log in missing_logs:
            annotation_id = str(log.get("annotation_id") or "")
            session_id = annotation_session_map.get(annotation_id)
            if not session_id:
                continue
            log_updates.append((log["_id"], session_id))

        for log_id, session_id in log_updates:
            if apply_changes:
                logs_collection.update_one({"_id": log_id}, {"$set": {"session_id": session_id}})
            summary["updated_identification_logs"] += 1

        missing_embeddings = embeddings_collection.find(
            {
                "$or": [
                    {"source_session_id": {"$exists": False}},
                    {"source_session_id": None},
                    {"source_session_id": ""},
                ]
            },
            {"_id": 1, "annotation_id": 1, "user_upload_id": 1},
        )
        embedding_updates: list[tuple[Any, str]] = []
        for emb in missing_embeddings:
            annotation_id = str(emb.get("annotation_id") or "")
            user_upload_id = str(emb.get("user_upload_id") or "")
            session_id = annotation_session_map.get(annotation_id) or upload_session_map.get(user_upload_id)
            if not session_id:
                continue
            embedding_updates.append((emb["_id"], session_id))

        for emb_id, session_id in embedding_updates:
            if apply_changes:
                embeddings_collection.update_one(
                    {"_id": emb_id},
                    {"$set": {"source_session_id": session_id}},
                )
            summary["updated_embeddings"] += 1

        sessions = list(
            sessions_collection.find(
                {},
                {
                    "_id": 1,
                    "user_id": 1,
                    "status": 1,
                    "current_step": 1,
                    "date_completed": 1,
                    "migrated": 1,
                },
            )
        )
        for session in sessions:
            session_id = str(session["_id"])
            user_id = str(session.get("user_id") or "")
            uploads_count = uploads_collection.count_documents({"user_id": user_id, "session_id": session_id})
            annotations_count = annotations_collection.count_documents({"session_id": session_id})
            identified_count = logs_collection.count_documents({"session_id": session_id})

            desired_step, desired_status = _infer_session_state(
                uploads_count=uploads_count,
                annotations_count=annotations_count,
                identified_count=identified_count,
            )

            updates: dict[str, Any] = {}
            step_changed = session.get("current_step") != desired_step
            status_changed = session.get("status") != desired_status
            if step_changed:
                updates["current_step"] = desired_step
            if status_changed:
                updates["status"] = desired_status
            if desired_status == "completed" and not session.get("date_completed"):
                updates["date_completed"] = datetime.utcnow()

            if not updates:
                continue
            updates["date_modified"] = datetime.utcnow()

            if apply_changes:
                sessions_collection.update_one({"_id": session["_id"]}, {"$set": updates})
            summary["updated_session_states"] += 1

        return summary
    finally:
        db.close()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Backfill session IDs for legacy upload/annotation/identification documents."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply changes. Without this flag, runs in dry-run mode.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print per-group migration details.",
    )
    args = parser.parse_args()

    summary = backfill_session_ids(apply_changes=args.apply, verbose=args.verbose)
    mode = "APPLY" if args.apply else "DRY-RUN"
    print(f"\nBackfill mode: {mode}")
    for key, value in summary.items():
        print(f"- {key}: {value}")
    if not args.apply:
        print("\nNo changes were written. Re-run with --apply to persist.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
