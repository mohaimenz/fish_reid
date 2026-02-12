from fastapi import APIRouter, File, UploadFile, Depends, Response, Form
import io
from data_access.models import Annotations, Users
from data_access.logic import Logic 
from typing import List, Optional
import ai_models.yolo_detector as yolo_detector
import os
from auth import Auth
from data_access.photo import Photo
from data_access.session import WorkflowSessionStore

photo_routes = APIRouter()

@photo_routes.post("/upload")
async def Upload(
    images: List[UploadFile] = File(...),
    siteId: Optional[str] = Form(None),
    sessionId: Optional[str] = Form(None),
    auth_data: dict = Depends(Auth().verify_token)
):
    if auth_data.get("user_id", None) is None:
        return {'status': 'failure', 'message': auth_data.get("status")}

    user_id = auth_data.get("user_id")
    session_store = WorkflowSessionStore()

    session_id = sessionId
    created_new_session = False
    if session_id:
        session_doc = session_store.get_session(user_id, session_id)
        if session_doc is None:
            return {'status': 'failure', 'message': 'Invalid workflow session'}
    else:
        session_id = session_store.create_session(user_id=user_id, site_id=siteId)
        if not session_id:
            return {'status': 'failure', 'message': 'Failed to create workflow session'}
        created_new_session = True

    session_store.update_session(
        user_id=user_id,
        session_id=session_id,
        current_step="detection",
        status="in_progress",
        site_id=siteId,
    )

    # Create Photo handler with site_id/session_id
    photo_handler = Photo(user_id=user_id, site_id=siteId, session_id=session_id)
    photo_ids = await photo_handler.upload_photos(images)
    print(f"Uploaded photo IDs: {photo_ids}")
    return {
        'status': 'success',
        'uploaded_photo_ids': photo_ids,
        'session_id': session_id,
        'created_new_session': created_new_session,
    }
    

@photo_routes.get("/get/{photo_id}")
async def GetPhoto(photo_id: str, auth_data: dict = Depends(Auth().verify_token)):
    if auth_data.get("user_id") is None:
        return {'status': 'failure', 'message': auth_data.get("status")}
    
    photo_handler = Photo(user_id=auth_data.get("user_id"))
    image = photo_handler.get_photo(photo_id)
    if image:
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format='JPEG')
        img_byte_arr = img_byte_arr.getvalue()
        return Response(content=img_byte_arr, media_type="image/jpeg")
    else:
        return {'status': 'failure', 'message': 'Photo not found'}

    
