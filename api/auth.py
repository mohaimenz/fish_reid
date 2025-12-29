from dotenv import load_dotenv
import jwt
import os
from datetime import datetime, timedelta
from data_access.logic import Logic
from data_access.models import Users
class Auth:
    secret_key = None
    algorithm = "HS256"
    token_expiration_minutes = 60 # Token valid for 60 minutes
    def __init__(self):
        load_dotenv()
        self.secret_key = os.getenv("SECRET_KEY")

    def generate_token(self, user_id: str) -> str:
        payload = {
            "user_id": user_id,
            "exp": datetime.utcnow() + timedelta(minutes=self.token_expiration_minutes)  # Uncomment to add expiration        
        }
        # generate token for a user with expiration
        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        return token
    
    def verify_token(self, token: str) -> dict:
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
        
    
    
