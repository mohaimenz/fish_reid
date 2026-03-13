# RabbitFish Tracking Platform API

This API is the backend for the RabbitFish workflow. It handles authentication, survey sessions, site management, photo ingestion, detection, re-identification, pair matching, and tracking history.

## Stack

- FastAPI
- MongoDB
- PyJWT
- bcrypt
- Ultralytics YOLO
- PyTorch
- Pillow / NumPy / OpenCV

## What This Service Does

The backend is responsible for:

- Registering and authenticating users
- Storing uploaded survey images
- Managing workflow sessions and sites
- Running rabbitfish detection
- Persisting annotations
- Generating and storing embeddings for identity matching
- Recording identification decisions and pair relationships
- Returning tracking history for identified fish

## Start Here

### Prerequisites

- Python 3.10+ is recommended
- MongoDB running locally on `mongodb://localhost:27017/`
- The model files already present in [`ai_models`](/Users/aasa0007/Python/RabbitFish/fish_reid/api/ai_models)

### Install

1. Move into the API folder:

```bash
cd api
```

2. Create and activate a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Create or update the auth secret file at [`data_access/.env`](/Users/aasa0007/Python/RabbitFish/fish_reid/api/data_access/.env):

```env
API_TOKEN_KEY=replace-with-a-long-random-secret
```

5. Start the server from the `api/` directory:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive docs will then be available at:

- `http://localhost:8000/docs`
- `http://localhost:8000/redoc`

## Why The Working Directory Matters

Several parts of the code use relative paths:

- JWT configuration is loaded from `api/data_access/.env`
- uploaded files are stored under `uploads/`
- generated crops and visualizations are also stored under `uploads/`

Because of that, the safest way to run the API is from inside the [`api`](/Users/aasa0007/Python/RabbitFish/fish_reid/api) folder.

## Configuration Assumptions

Current code assumptions are:

- MongoDB URI is hard-coded to `mongodb://localhost:27017/`
- MongoDB database name is hard-coded to `fish_reid`
- CORS currently allows `http://localhost:3000` and `http://127.0.0.1:3000`
- Uploaded files are stored on local disk, not in cloud storage

If those assumptions need to change, the first place to inspect is [`data_access/access.py`](/Users/aasa0007/Python/RabbitFish/fish_reid/api/data_access/access.py) and [`main.py`](/Users/aasa0007/Python/RabbitFish/fish_reid/api/main.py).

## Route Groups

### Authentication

Defined in [`routes/user.py`](/Users/aasa0007/Python/RabbitFish/fish_reid/api/routes/user.py):

- `POST /user/register`
- `POST /user/login`

Notes:

- JWTs are issued at login.
- There is no dedicated backend `logout` route yet.
- There is no current `me` endpoint.

### Photos

Defined in [`routes/photo.py`](/Users/aasa0007/Python/RabbitFish/fish_reid/api/routes/photo.py):

- `POST /photo/upload`
- `GET /photo/get/{photo_id}`

Uploads are resized and stored on disk under `uploads/<user_id>/<upload_id>.jpg`.

### Sites

Defined in [`routes/site.py`](/Users/aasa0007/Python/RabbitFish/fish_reid/api/routes/site.py):

- `GET /site/sites`
- `POST /site/site`

Sites are reusable map points that can be linked to sessions and uploads.

### Workflow Sessions

Defined in [`routes/session.py`](/Users/aasa0007/Python/RabbitFish/fish_reid/api/routes/session.py):

- `POST /session/create`
- `GET /session/history`
- `GET /session/{session_id}`
- `POST /session/{session_id}/complete`
- `DELETE /session/{session_id}`

Sessions are the organizing unit for one survey workflow. They track status, current step, associated site, and summary stats.

### Detection

Defined in [`routes/detector.py`](/Users/aasa0007/Python/RabbitFish/fish_reid/api/routes/detector.py):

- `POST /detector/detect`
- `GET /detector/resume-detection`
- `GET /detector/check-unfinished`
- `DELETE /detector/discard-previous-unfinished`
- `DELETE /detector/delete-image`
- `POST /detector/save-manual-annotation`
- `DELETE /detector/delete-bbox`

This layer runs YOLO-based detection and supports manual correction workflows.

### Identification, Pairing, and Tracking

Defined in [`routes/identification.py`](/Users/aasa0007/Python/RabbitFish/fish_reid/api/routes/identification.py):

- `POST /identify`
- `POST /identify/create-identity`
- `POST /identify/assign`
- `PATCH /identify/fish/{fish_id}/alias`
- `POST /identify/visualization`
- `POST /identify/gradcam`
- `GET /identify/session/{session_id}`
- `GET /identify/fish`
- `GET /pairing/session/{session_id}`
- `GET /pairing/fish/{fish_id}/history`
- `POST /pairing/session/{session_id}/assign`
- `GET /tracking/{fish_id}`

This is the heaviest part of the backend. It loads the embedding model, generates or reuses crops, compares embeddings, persists identification logs, and returns tracking and pairing views.

## Data Model Overview

The main collections represented in [`data_access/models.py`](/Users/aasa0007/Python/RabbitFish/fish_reid/api/data_access/models.py) are:

- `Users`
- `Sites`
- `workflow_sessions`
- `user_uploads`
- `annotations`
- `fish`
- `fish_embeddings`
- `query_embeddings`
- `identification_logs`
- `fish_pair_logs`

## Storage Layout

At runtime, local files are written under the API working directory:

- `uploads/<user_id>/` for uploaded photos
- `uploads/<user_id>/crops/` for cropped detections
- additional generated visualization assets under `uploads/`

The API also mounts `uploads/` as static content at `/uploads`.

## Frontend Compatibility Notes

The current frontend can work with this API, but only if its environment variables are aligned with the route prefixes above. In particular:

- the frontend base URL should be `http://localhost:8000`
- auth routes should point at `/user/*`
- photo routes should point at `/photo/*`
- detection routes should point at `/detector/*`
- site routes should point at `/site/*`

## Known Limitations

- Database connection settings are not yet environment-driven.
- Auth secret loading uses a fixed file location.
- There is no backend logout or current-user endpoint.
- File storage is local-disk only.
- This codebase assumes the model weights already exist on disk and does not manage model downloads automatically.
