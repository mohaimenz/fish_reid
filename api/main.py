from fastapi import FastAPI 
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routes.user import user_routes
from routes.detector import detector_routes
from routes.photo import photo_routes

api_app = FastAPI(title="api app")
origins = [
    "http://127.0.0.1:3000",
    "http://localhost:3000"
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
api_app.include_router(detector_routes, prefix="/detector", tags=["detector"])
api_app.include_router(photo_routes, prefix="/photo", tags=["photo"])

# Mount static files for serving uploaded images
api_app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app = FastAPI(docs_url="/docs", redoc_url="/redoc", title="main app")
app.mount("/", api_app)
