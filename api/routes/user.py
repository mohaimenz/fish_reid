from fastapi import APIRouter
import bcrypt
import jwt
from dotenv import load_dotenv
import os
from datetime import datetime
from auth import Auth
from data_access.annotation import Annotation
from data_access.models import UserLogin, Users
from data_access.logic import Logic 

user_routes = APIRouter()

@user_routes.post("/login")
async def Login(data: UserLogin):
    # Placeholder logic for user authentication
    if data.email is not None and data.password is not None:
        # In a real application, you would verify the email and password against the database
        # If you don't know the salt used during hashing, you cannot directly compare the hashes.
        # Instead, you should retrieve the stored hashed password from the database and use bcrypt to verify
        # hashed_password = bcrypt.hashpw(data.password.encode('utf-8'), bcrypt.gensalt())
        user = Logic().get_by_query("Users", {"email": data.email, "is_active": True})
        if not user:
            return {'status': 'failure', 'message': 'Invalid credentials'}
        else:
            if not Auth().check_password(data.password, user[0]['password']):
                return {'status': 'failure', 'message': 'Invalid credentials'}
            Logic().update("Users", {"_id": user[0]['id']}, {"last_login": datetime.utcnow()})  
            token = Auth().generate_token(user[0]['id'])
            # print(f"Generated token: {token}")
            # Coming to this point means authentication is successful
            # Now check if the user has any incomplete actions in detection step.
            has_pre_sessions = False
            annotation_handler = Annotation(user_id=user[0]['id'])
            previous_results = annotation_handler.load_previously_saved_annotations()
            if previous_results and len(previous_results) > 0:
                has_pre_sessions = True
            return {'status': 'success', 'message': 'Login successful', 'user': f"{user[0]}", 'token': f"{token}", 'resume_option': has_pre_sessions}
        
    else:
        return {'status': 'failure', 'message': 'Invalid credentials'}
    
@user_routes.post("/register")
async def Register(data: Users):
    # Placeholder logic for user registration
    if data.name is not None and data.email is not None and data.password is not None:
        # In a real application, you would save the user to the database
        data.password = Auth().get_password_hash(data.password)
        data.date_created = datetime.utcnow()
        data.date_modified = datetime.utcnow()
        data.is_active = True
        data.type = "pu" #pu = power user and su=super user
        data.last_login = datetime.utcnow()
        insert_id = Logic().insert(data)

        if insert_id:
            return {'status': 'success', 'message': 'User registered successfully', 'user_id': insert_id}
        else:
            return {'status': 'failure', 'message': 'Registration failed'}
    else:
        return {'status': 'failure', 'message': 'Invalid data provided'}
