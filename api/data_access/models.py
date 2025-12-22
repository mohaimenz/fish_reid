from pydantic import BaseModel, Field, BeforeValidator  
from datetime import datetime
from typing import Optional, Annotated

PyObjectId = Annotated[str, BeforeValidator(str)]
class Fish(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default = None)
    site_id: str
    date_created: datetime
    date_modified: datetime
    is_active: bool
    user_id: str

class FishEmbedding(BaseModel):
    id: str
    fish_id: str
    embeddings: str
    model_name: str # ai model that generated the embeddings
    date_created: datetime

class FishPairLogs(BaseModel):
    id: str
    fish_id_1: str
    fish_id_2: str
    site_id: str
    date_seen: datetime

class Sites(BaseModel):
    id: str
    name: str
    lat: float     
    lon: float
    date_created: datetime
    date_modified: datetime
    is_active: bool
    user_id: str

class Users(BaseModel):
    id: None | str
    name: str
    email: str
    password: str
    type: str  # e.g., admin, regular
    date_created: datetime
    date_modified: datetime
    last_login: datetime
    is_active: bool

class UserUploads(BaseModel):
    id: str #(file_name would be same as id.ext)
    user_id: str
    site_id: str
    date_uploaded: datetime

class Annotations(BaseModel):
    id: str
    user_upload_id: str
    x_min: float
    y_min: float
    h: float
    w: float
    confidence: float

class IdentificationLogs(BaseModel):
    id: str
    annotation_id: str
    fish_pair_id: str
    confidence: float
    date_identified: datetime