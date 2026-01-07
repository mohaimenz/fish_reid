from fastapi import APIRouter, File, UploadFile, Depends
from pydantic import BaseModel, Field
from data_access.models import Annotations, Users
from data_access.logic import Logic 
from datetime import datetime
from typing import List
import ai_models.yolo_detector as yolo_detector
import os
from auth import Auth
from data_access.photo import Photo

detector_routes = APIRouter()

class DetectionRequest(BaseModel):
    photo_ids: List[str] = Field(..., alias="photoIds")

@detector_routes.post("/detect")
async def Detect(request: DetectionRequest, auth_data: dict=Depends(Auth().verify_token)):
    if auth_data.get("user_id") is None:
        return {'status': 'failure', 'message': auth_data.get("status")}
    # Authenticate user_token here (omitted for brevity)
    results = []
    photo_handler = Photo(user_id=auth_data.get("user_id"))
    photo_paths = [photo_handler.get_photo_path(photo_id) for photo_id in request.photo_ids]
    print("Photo paths for detection:", photo_paths)
    # Get predictions from YOLO detector
    preditions = yolo_detector.get_predictions(photo_paths)
    # Save preditions to database
    for preds in preditions:
        img_path = preds.get("image_path")
        detections = preds.get("detections")
        # Find corresponding user_upload_id
        file_name = os.path.basename(img_path)
        upload_id = os.path.splitext(file_name)[0]
        for det in detections:
            annotation = Annotations(
                user_upload_id=upload_id,
                x_min=det['x_min'],
                y_min=det['y_min'],
                height=det['height'],
                width=det['width'],
                class_name=det['class_name'],
                confidence=det['confidence']
            )
            annotation_id = Logic().insert(annotation)
            results.append({'id':annotation_id, 'image_path': img_path, 'detections': detections})


    

