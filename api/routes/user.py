from fastapi import APIRouter
from data_access.models import UserLogin, Users
from data_access.logic import Logic 
import bcrypt
import jwt
from dotenv import load_dotenv
import os
from datetime import datetime
from auth import Auth

user_routes = APIRouter()

@user_routes.post("/login")
async def Login(data: UserLogin):
    # Placeholder logic for user authentication
    if data.email is not None and data.password is not None:
        # In a real application, you would verify the email and password against the database
        hashed_password = bcrypt.hashpw(data.password.encode('utf-8'), bcrypt.gensalt())
        user = Logic().get_by_query("Users", {"email": data.email, "password":hashed_password, "is_active": True})
        if not user:
            return {'status': 'failure', 'message': 'Invalid credentials'}
        else:
            Logic().update("Users", {"_id": user[0]['id']}, {"last_login": datetime.utcnow()})  
            token = Auth().generate_token(user[0]['id'])
            return {'status': 'success', 'message': 'Login successful', 'user': user[0], 'token': token}
        
    else:
        return {'status': 'failure', 'message': 'Invalid credentials'}
    
@user_routes.post("/register")
async def Register(data: Users):
    # Placeholder logic for user registration
    if data.name is not None and data.email is not None and data.password is not None:
        # In a real application, you would save the user to the database
        hashed_password = bcrypt.hashpw(data.password.encode('utf-8'), bcrypt.gensalt())
        data.password = hashed_password.decode('utf-8')
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
