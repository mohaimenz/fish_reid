from fastapi import APIRouter, File, UploadFile, Depends, Response, Form
import io
from data_access.models import Annotations, Users
from data_access.logic import Logic 
from datetime import datetime
from typing import List, Optional
import ai_models.yolo_detector as yolo_detector
import os
from auth import Auth
from data_access.photo import Photo

photo_routes = APIRouter()

@photo_routes.get("/sites")
async def GetSites(auth_data: dict=Depends(Auth().verify_token)):
    """Get all active sites for authenticated user"""
    if auth_data.get("user_id") is None:
        return {'status': 'failure', 'message': auth_data.get("status")}
    
    user_id = auth_data.get("user_id")
    
    # Get active sites for this user from database
    sites = Logic().get_by_query("sites", {
        "user_id": user_id,
        "is_active": True
    })
    
    # Transform to clean response format (same pattern as annotations)
    sites_response = []
    if sites:
        for site in sites:
            sites_response.append({
                'id': str(site['_id']),  # Convert ObjectId to string
                'name': site['name'],
                'lat': site['lat'],
                'long': site['long']
            })
    
    return {
        'status': 'success',
        'sites': sites_response
    }

@photo_routes.post("/upload")
async def Upload(
    images: List[UploadFile] = File(...),
    siteId: Optional[str] = Form(None),
    auth_data: dict = Depends(Auth().verify_token)
):
    if auth_data.get("user_id", None) is None:
        return {'status': 'failure', 'message': auth_data.get("status")}
    
    # Create Photo handler with site_id if provided
    photo_handler = Photo(user_id=auth_data.get("user_id"), site_id=siteId)
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

    

