from pydantic import BaseModel, Field, BeforeValidator  
from datetime import datetime
from typing import Optional, Annotated

PyObjectId = Annotated[str, BeforeValidator(str)]
class Fish(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default = None)
    fish_alias: Optional[str] = None
    site_id: str
    date_created: datetime
    date_modified: datetime
    is_active: bool
    user_id: str

class FishEmbedding(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default = None)
    fish_id: str
    user_id: str
    source_session_id: Optional[str] = None
    annotation_id: Optional[str] = None
    user_upload_id: Optional[str] = None
    crop_path: Optional[str] = None
    embeddings: list[float]
    embedding_dim: int
    ai_model_name: str # ai model that generated the embeddings
    ai_model_version: Optional[str] = None
    date_created: datetime

class FishPairLogs(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str
    session_id: Optional[str] = None
    fish_id_a: str
    fish_id_b: str
    site_id: Optional[str] = None
    source: Optional[str] = None
    date_seen: datetime
    date_created: datetime
    date_modified: datetime

class Sites(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default = None)
    name: str
    lat: float     
    long: float
    date_created: datetime
    date_modified: datetime
    is_active: bool
    user_id: str

class Users(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default = None)
    name: str
    email: str
    password: str
    type: Optional[str] = "pu"  # e.g., admin, regular
    date_created: Optional[datetime] = None
    date_modified: Optional[datetime] = None
    last_login: Optional[datetime] = None
    is_active: Optional[bool] = True

class UserLogin(BaseModel):
    email: str
    password: str

class UserUploads(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default = None) #(file_name would be same as id.ext)
    user_id: str
    session_id: str
    site_id: Optional[str] = None
    date_uploaded: datetime

class Annotations(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default = None)
    user_upload_id: str
    session_id: Optional[str] = None
    x_min: float
    y_min: float
    height: float
    width: float
    class_name: int
    confidence: float

class IdentificationLogs(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default = None)
    annotation_id: str
    fish_id: str
    session_id: Optional[str] = None
    confidence: float
    distance: Optional[float] = None
    threshold: Optional[float] = None
    ai_model_name: Optional[str] = None
    ai_model_version: Optional[str] = None
    is_new_identity: bool = False
    date_identified: datetime


class WorkflowSession(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str
    name: Optional[str] = None
    status: str = "in_progress"  # in_progress, completed, discarded
    current_step: str = "upload"  # upload, detection, identification, pair_matching
    site_id: Optional[str] = None
    date_created: datetime
    date_modified: datetime
    date_completed: Optional[datetime] = None
