from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from data_access.models import Annotations, Users
from data_access.logic import Logic 
from datetime import datetime
from typing import List
import ai_models.yolo_detector as yolo_detector
import os
from auth import Auth
from data_access.photo import Photo
from data_access.annotation import Annotation

detector_routes = APIRouter()

class DetectionRequest(BaseModel):
    photo_ids: List[str] = Field(..., alias="photoIds")

@detector_routes.post("/detect")
async def Detect(request: DetectionRequest, auth_data: dict=Depends(Auth().verify_token)):
    if auth_data.get("user_id") is None:
        return {'status': 'failure', 'message': auth_data.get("status")}
    # Authenticate user_token here (omitted for brevity)
    photo_handler = Photo(user_id=auth_data.get("user_id"))
    photo_paths = [photo_handler.get_photo_path(photo_id) for photo_id in request.photo_ids]
    # print("Photo paths for detection:", photo_paths)
    # Get predictions from YOLO detector
    preditions = yolo_detector.get_predictions(photo_paths)
    print(f"Number of prediction results: {len(preditions)}")
    # Save preditions to database
    for idx, preds in enumerate(preditions):
        img_path = preds.get("image_path")
        detections = preds.get("detections")
        # Find corresponding user_upload_id
        file_name = os.path.basename(img_path)
        upload_id = os.path.splitext(file_name)[0]
        
        # Save each detection
        print(f"Processing prediction {idx}: upload_id={upload_id}, num_detections={len(detections)}")
        for det_idx, det in enumerate(detections):
            print(f"  Inserting detection {det_idx}: x_min={det['x_min']}, y_min={det['y_min']}")
            annotation = Annotations(
                user_upload_id=upload_id,
                x_min=det['x_min'],
                y_min=det['y_min'],
                height=det['height'],
                width=det['width'],
                class_name=det['class_name'],
                confidence=det['confidence']
            )
            Logic().insert(annotation)
    
    # Load all unidentified annotations (includes what we just saved)
    annotation_handler = Annotation(user_id=auth_data.get("user_id"))
    all_results = annotation_handler.load_saved_annotations()
    
    # print("Detection results:", all_results)
    return {'status': 'success', 'results': all_results}

@detector_routes.get("/resume-detection")
async def ResumeDetection(auth_data: dict=Depends(Auth().verify_token)):
    if auth_data.get("user_id") is None:
        return {'status': 'failure', 'message': auth_data.get("status")}
    
    user_id = auth_data.get("user_id")
    annotation_handler = Annotation(user_id=user_id)
    results = annotation_handler.load_saved_annotations()
    
    return {'status': 'success', 'results': results}

@detector_routes.get("/check-unfinished")
async def CheckUnfinished(auth_data: dict=Depends(Auth().verify_token)):
    if auth_data.get("user_id") is None:
        return {'status': 'failure', 'message': auth_data.get("status")}
    
    user_id = auth_data.get("user_id")
    annotation_handler = Annotation(user_id=user_id)
    has_work = annotation_handler.has_unfinished_work()
    
    return {'status': 'success', 'has_unfinished_work': has_work}

@detector_routes.delete("/discard-previous-unfinished")
async def DiscardPrevUnfinished(auth_data: dict=Depends(Auth().verify_token)):
    if auth_data.get("user_id") is None:
        return {'status': 'failure', 'message': auth_data.get("status")}
    
    user_id = auth_data.get("user_id")

    # Step 1: Delete unidentified annotations
    annotation_handler = Annotation(user_id=user_id)
    result = annotation_handler.delete_unidentified_annotations()
    
    # Step 2: Get upload_ids that have no remaining annotations
    upload_ids_to_delete = result.get('upload_ids_to_delete', [])
    
    # Step 3: Delete the uploads from database and photos from disk
    deleted_uploads = 0
    if upload_ids_to_delete:
        photo_handler = Photo(user_id=user_id)
        for upload_id in upload_ids_to_delete:
            photo_handler.delete_photo(upload_id)
            deleted_uploads += 1
    
    return {
        'status': 'success',
        'deleted_annotations': result.get('deleted_count', 0),
        'deleted_uploads': deleted_uploads
    }

class DeleteBboxRequest(BaseModel):
    annotation_id: str = Field(..., alias="annotationId")

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
