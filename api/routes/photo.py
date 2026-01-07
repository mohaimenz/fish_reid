from fastapi import APIRouter, File, UploadFile, Depends, Response
import io
from data_access.models import Annotations, Users
from data_access.logic import Logic 
from datetime import datetime
from typing import Annotated, List
import ai_models.yolo_detector as yolo_detector
import os
from typing import Annotated
from auth import Auth
from data_access.photo import Photo

photo_routes = APIRouter()

@photo_routes.post("/upload")
async def Upload(images: List[UploadFile] = File(...), auth_data: dict = Depends(Auth().verify_token)):
    # print(images)
    if auth_data.get("user_id", None) is None:
        return {'status': 'failure', 'message': auth_data.get("status")}
    
    photo_handler = Photo(user_id=auth_data.get("user_id"))
    photo_ids = await photo_handler.upload_photos(images)
    return {'status': 'success', 'uploaded_photo_ids': photo_ids}
    

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

    

