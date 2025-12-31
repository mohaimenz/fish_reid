import os
from dotenv import load_dotenv
from pathlib import Path
import jwt
import bcrypt
import datetime
from data_access.logic import Logic
from data_access.models import Users
from typing import Annotated
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer

class Auth:
    secret_key = None
    algorithm = "HS256"
    token_expiration_minutes = 60 # Token valid for 60 minutes
    def __init__(self):
        load_dotenv(dotenv_path=Path(__file__).parent / "data_access" / ".env")
        self.secret_key = os.getenv("API_TOKEN_KEY")
        # self.auth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

    def generate_token(self, user_id: str) -> str:
        payload = {
            "user_id": user_id,
            "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=self.token_expiration_minutes)  # Uncomment to add expiration        
        }
        # generate token for a user with expiration
        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        return token
    
    def get_password_hash(self, password: str) -> str:
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        return hashed.decode('utf-8')
    
    def check_password(self, plain_password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))      
    
    def verify_token(self, token: str = Depends(OAuth2PasswordBearer(tokenUrl="token"))) -> dict:
        return_var = {}
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            user_id = payload.get("user_id")
            #check if user_id exists in user database
            user = Logic().get_by_query("Users", {"_id": user_id, "is_active": True})
            if not user:
                return_var = {"user_id": None, "status": "User not found or inactive"}
                
            return_var = {"user_id": user_id, "status": "valid"}
        except jwt.ExpiredSignatureError:
            # raise Exception("Token has expired")
            return_var = {"user_id": None, "status": "Token has expired"}
            # new_token = self.refresh_token(token)
            # return self.verify_token(new_token)
        except jwt.InvalidTokenError:
            # raise Exception("Invalid token")
            return_var = {"user_id": None, "status": "Invalid token"}
        return return_var
        
        
    # Not using currently, but can be used to refresh tokens
    def refresh_token(self, token: str) -> str:
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm], options={"verify_exp": False})
            user_id = payload.get("user_id")
            # Generate a new token
            new_token = self.generate_token(user_id)
            return new_token
        except jwt.InvalidTokenError:
            raise Exception("Invalid token")    
        
    
    
