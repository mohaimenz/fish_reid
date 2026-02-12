from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from bson import ObjectId
from bson.errors import InvalidId

from data_access.access import DB


class WorkflowSessionStore:
    def _to_object_id(self, value: str) -> Optional[ObjectId]:
        try:
            return ObjectId(value)
        except (InvalidId, TypeError):
            return None

    def create_session(
        self,
        user_id: str,
        name: Optional[str] = None,
        site_id: Optional[str] = None,
    ) -> Optional[str]:
        db = DB()
        db.connect()
        try:
            sessions = db.get_collection("workflow_sessions")
            now = datetime.utcnow()
            doc = {
                "user_id": user_id,
                "name": name or f"Session {now.strftime('%Y-%m-%d %H:%M:%S')}",
                "status": "in_progress",
                "current_step": "upload",
                "site_id": site_id,
                "date_created": now,
                "date_modified": now,
                "date_completed": None,
            }
            inserted = sessions.insert_one(doc)
            return str(inserted.inserted_id)
        except Exception as err:
            print(f"Failed to create workflow session: {err}")
            return None
        finally:
            db.close()

    def get_session(self, user_id: str, session_id: str) -> Optional[dict[str, Any]]:
        db = DB()
        db.connect()
        try:
            session_oid = self._to_object_id(session_id)
            if session_oid is None:
                return None
            sessions = db.get_collection("workflow_sessions")
            return sessions.find_one({"_id": session_oid, "user_id": user_id})
        except Exception as err:
            print(f"Failed to get workflow session: {err}")
            return None
        finally:
            db.close()

    def list_sessions(self, user_id: str, limit: int = 100) -> list[dict[str, Any]]:
        db = DB()
        db.connect()
        try:
            sessions = db.get_collection("workflow_sessions")
            return list(
                sessions.find({"user_id": user_id})
                .sort("date_modified", -1)
                .limit(limit)
            )
        except Exception as err:
            print(f"Failed to list workflow sessions: {err}")
            return []
        finally:
            db.close()

    def get_latest_in_progress_session(self, user_id: str) -> Optional[dict[str, Any]]:
        db = DB()
        db.connect()
        try:
            sessions = db.get_collection("workflow_sessions")
            return sessions.find_one(
                {"user_id": user_id, "status": "in_progress"},
                sort=[("date_modified", -1)],
            )
        except Exception as err:
            print(f"Failed to find latest in-progress session: {err}")
            return None
        finally:
            db.close()

    def update_session(
        self,
        user_id: str,
        session_id: str,
        *,
        current_step: Optional[str] = None,
        status: Optional[str] = None,
        site_id: Optional[str] = None,
    ) -> bool:
        db = DB()
        db.connect()
        try:
            session_oid = self._to_object_id(session_id)
            if session_oid is None:
                return False
            sessions = db.get_collection("workflow_sessions")
            update_data: dict[str, Any] = {"date_modified": datetime.utcnow()}
            if current_step is not None:
                update_data["current_step"] = current_step
            if status is not None:
                update_data["status"] = status
                if status == "completed":
                    update_data["date_completed"] = datetime.utcnow()
            if site_id is not None:
                update_data["site_id"] = site_id
            result = sessions.update_one(
                {"_id": session_oid, "user_id": user_id},
                {"$set": update_data},
            )
            return result.modified_count > 0 or result.matched_count > 0
        except Exception as err:
            print(f"Failed to update workflow session: {err}")
            return False
        finally:
            db.close()
