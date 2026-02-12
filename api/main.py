from fastapi import FastAPI 
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routes.user import user_routes
from routes.detector import detector_routes
from routes.photo import photo_routes
from routes.site import site_routes
from routes.identification import identification_routes
from routes.session import session_routes

api_app = FastAPI(title="api app")
# uvicorn main:app --host 0.0.0.0 --port 8000 --reload
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
api_app.include_router(site_routes, prefix="/site", tags=["site"])
api_app.include_router(identification_routes, tags=["identification"])
api_app.include_router(session_routes, prefix="/session", tags=["session"])

# Mount static files for serving uploaded images
api_app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app = FastAPI(docs_url="/docs", redoc_url="/redoc", title="main app")
app.mount("/", api_app)
