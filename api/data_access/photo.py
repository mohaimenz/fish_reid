from datetime import datetime
import os
from data_access.logic import Logic
from data_access.models import UserUploads
from PIL import Image
import io
class Photo:
    def __init__(self, user_id, site_id=None):
        self.user_id = user_id
        self.upload_time = datetime.now()
        self.site_id = site_id

    async def upload_photos(self, photo_list):
        # Logic to upload photos
        os.makedirs(f"uploads/{self.user_id}", exist_ok=True)
        photo_ids = []
        for file in photo_list:
            try:
                contents = await file.read()
                print(f"Uploading file: {file.filename} for user: {self.user_id}")
                user_upload = UserUploads(
                    user_id=self.user_id,
                    site_id=self.site_id,
                    date_uploaded=self.upload_time
                )
                upload_id = Logic().insert(user_upload)
                img_stream = io.BytesIO(contents)
                image = Image.open(img_stream)
                # resize image to width 1024 keeping aspect ratio    
                w_percent = (1024 / float(image.size[0]))
                h_size = int((float(image.size[1]) * float(w_percent)))
                image = image.resize((1024, h_size), Image.LANCZOS)
                # write image to disk
                image.save(f'uploads/{self.user_id}/{upload_id}.jpg')
                photo_ids.append(upload_id)
            except Exception as e:
                print(f"Error uploading file {file.filename}: {e}") 
            
        return photo_ids
    
    def get_photo_path(self, photo_id):
        return f'uploads/{self.user_id}/{photo_id}.jpg'
    
    def get_photo(self, photo_id):
        photo_path = self.get_photo_path(photo_id)
        if os.path.exists(photo_path):
            return Image.open(photo_path)
        else:
            return None
   
    def delete_photo(self, photo_id):
        photo_path = self.get_photo_path(photo_id)
        if os.path.exists(photo_path):
            os.remove(photo_path)
            return True
        else:
            return False
