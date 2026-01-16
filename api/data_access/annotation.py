from data_access.access import DB
from bson import ObjectId

class Annotation:
    def __init__(self, user_id: str):
        self.user_id = user_id
        
    def load_saved_annotations(self):
        # This function will load saved annotations from the database
        # It joins 4 tables: Annotations, UserUploads, Users, IdentificationLogs
        # The tables are identical to the model defined in models.py
        # Users and UserUploads can be joined via user_id
        # Annotations and UserUploads can be joined via user_upload_id
        # IdentificationLogs and Annotations can be joined via annotation_id
        # Load annotations where user_id matches and identification_id is null (not identified yet)
        # Load only the annotations for the latest upload session through user_uploads.date_uploaded
        
        db = DB()
        db.connect()
        
        try:
            # Step 1: Load all user_uploads filtered by user_id
            user_uploads_collection = db.get_collection('user_uploads')
            all_uploads = list(user_uploads_collection.find({'user_id': self.user_id}))
            
            if not all_uploads:
                db.close()
                return []
            
            # Get all upload IDs
            upload_ids = [str(upload['_id']) for upload in all_uploads]
            
            # Step 2: Load annotations only for those uploads
            annotations_collection = db.get_collection('annotations')
            annotations = list(annotations_collection.find({
                'user_upload_id': {'$in': upload_ids}
            }))
            
            # Step 3: Get identification logs to filter out identified annotations
            identification_logs_collection = db.get_collection('identification_logs')
            identified_annotation_ids = set()
            
            if annotations:
                annotation_ids = [str(ann['_id']) for ann in annotations]
                identified_logs = list(identification_logs_collection.find({
                    'annotation_id': {'$in': annotation_ids}
                }))
                
                for log in identified_logs:
                    identified_annotation_ids.add(log['annotation_id'])
            
            # Step 4: Filter annotations that are not identified yet
            unidentified_annotations = [
                ann for ann in annotations 
                if str(ann['_id']) not in identified_annotation_ids
            ]
            
            # Step 5: Group annotations by user_upload_id (image)
            # Initialize results_map with all uploads (even those without annotations)
            results_map = {}
            for upload in all_uploads:
                upload_id = str(upload['_id'])
                image_path = f'uploads/{self.user_id}/{upload_id}.jpg'
                results_map[upload_id] = {
                    'id': upload_id,
                    'image_path': image_path,
                    'detections': []
                }
            
            # Add annotatialltheir respective uploads
            for ann in unidentified_annotations:
                upload_id = ann['user_upload_id']
                
                if upload_id in results_map:
                    results_map[upload_id]['detections'].append({
                        'annotation_id': str(ann['_id']),
                        'x_min': ann['x_min'],
                        'y_min': ann['y_min'],
                        'width': ann['width'],
                        'height': ann['height'],
                        'class_name': ann['class_name'],
                        'confidence': ann['confidence']
                    })
            
            results = list(results_map.values())
            db.close()
            return results
            
        except Exception as e:
            print(f"Error loading previously saved annotations: {e}")
            db.close()
            return []
    
    def delete_annotation(self, annotation_id: str):
        # Delete a specific annotation by ID, ensuring it belongs to the user
        db = DB()
        db.connect()
        
        try:
            annotations_collection = db.get_collection('annotations')
            
            # First, verify the annotation belongs to this user
            annotation = annotations_collection.find_one({'_id': ObjectId(annotation_id)})
            
            if not annotation:
                db.close()
                return {'success': False, 'error': 'Annotation not found'}
            
            # Get the upload to verify ownership
            user_uploads_collection = db.get_collection('user_uploads')
            upload = user_uploads_collection.find_one({
                '_id': ObjectId(annotation['user_upload_id']),
                'user_id': self.user_id
            })
            
            if not upload:
                db.close()
                return {'success': False, 'error': 'Unauthorized: Annotation does not belong to user'}
            
            # Delete the annotation
            delete_result = annotations_collection.delete_one({'_id': ObjectId(annotation_id)})
            db.close()
            
            if delete_result.deleted_count > 0:
                return {'success': True}
            else:
                return {'success': False, 'error': 'Failed to delete annotation'}
                
        except Exception as e:
            print(f"Error deleting annotation: {e}")
            db.close()
            return {'success': False, 'error': str(e)}
    
    def has_unfinished_work(self):
        """Quick check if user has unidentified annotations"""
        db = DB()
        db.connect()
        
        try:
            user_uploads_collection = db.get_collection('user_uploads')
            uploads = list(user_uploads_collection.find({'user_id': self.user_id}))
            
            if not uploads:
                db.close()
                return False
            
            upload_ids = [str(u['_id']) for u in uploads]
            
            annotations_collection = db.get_collection('annotations')
            annotations = list(annotations_collection.find({'user_upload_id': {'$in': upload_ids}}))
            
            if not annotations:
                db.close()
                return False
            
            # Check if any are unidentified
            identification_logs = db.get_collection('identification_logs')
            annotation_ids = [str(ann['_id']) for ann in annotations]
            identified_logs = list(identification_logs.find({'annotation_id': {'$in': annotation_ids}}))
            identified_ids = set(log['annotation_id'] for log in identified_logs)
            
            # Return true if any annotation is not identified
            has_unfinished = any(str(ann['_id']) not in identified_ids for ann in annotations)
            
            db.close()
            return has_unfinished
            
        except Exception as e:
            print(f"Error checking unfinished work: {e}")
            db.close()
            return False
    
    def delete_unidentified_annotations(self):
        # Delete all unidentified annotations for the user and return upload_ids
        db = DB()
        db.connect()
        
        try:
            # Step 1: Load all user_uploads filtered by user_id
            user_uploads_collection = db.get_collection('user_uploads')
            all_uploads = list(user_uploads_collection.find({'user_id': self.user_id}))
            
            if not all_uploads:
                db.close()
                return {'deleted_count': 0, 'upload_ids_to_delete': []}
            
            # Get all upload IDs
            upload_ids = [str(upload['_id']) for upload in all_uploads]
            
            # Step 2: Load annotations for those uploads
            annotations_collection = db.get_collection('annotations')
            annotations = list(annotations_collection.find({
                'user_upload_id': {'$in': upload_ids}
            }))
            
            deleted_count = 0
            
            # Step 3: If there are annotations, delete unidentified ones
            if annotations:
                # Get identification logs to filter out identified annotations
                identification_logs_collection = db.get_collection('identification_logs')
                annotation_ids = [str(ann['_id']) for ann in annotations]
                identified_logs = list(identification_logs_collection.find({
                    'annotation_id': {'$in': annotation_ids}
                }))
                
                identified_annotation_ids = set(log['annotation_id'] for log in identified_logs)
                
                # Get unidentified annotations
                unidentified_annotations = [
                    ann for ann in annotations 
                    if str(ann['_id']) not in identified_annotation_ids
                ]
                
                # Delete unidentified annotations if any exist
                if unidentified_annotations:
                    unidentified_annotation_ids = [ann['_id'] for ann in unidentified_annotations]
                    delete_result = annotations_collection.delete_many({
                        '_id': {'$in': unidentified_annotation_ids}
                    })
                    deleted_count = delete_result.deleted_count
            
            # Step 4: Find ALL uploads that have NO annotations (after deletion)
            remaining_annotations = list(annotations_collection.find({
                'user_upload_id': {'$in': upload_ids}
            }))
            
            # Get upload_ids that still have annotations
            upload_ids_with_annotations = set([ann['user_upload_id'] for ann in remaining_annotations])
            
            # Get upload_ids that have NO annotations (these should be deleted)
            upload_ids_to_delete = [uid for uid in upload_ids if uid not in upload_ids_with_annotations]
            
            db.close()
            return {
                'deleted_count': deleted_count,
                'upload_ids_to_delete': upload_ids_to_delete
            }
            
        except Exception as e:
            print(f"Error deleting unidentified annotations: {e}")
            db.close()
            return {'deleted_count': 0, 'upload_ids_to_delete': [], 'error': str(e)}