from fastapi import FastAPI 
from fastapi.middleware.cors import CORSMiddleware
from routes.user import user_routes

api_app = FastAPI(title="api app")
origins = [
    "http://127.0.0.1:3000",
    "*"
]
api_app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@api_app.get("/message")
async def Message():
    return {'data': "I am happily serving from the API app!"} 

api_app.include_router(user_routes, prefix="/user", tags=["user"])

app = FastAPI(title="main app")
app.mount("/", api_app)
