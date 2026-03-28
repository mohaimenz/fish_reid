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
- Running rabbitfish detection using YOLOv11
- Persisting annotations and bounding boxes
- Generating and storing embeddings for identity matching using fine-tuned FaceNet
- Recording identification decisions and pair relationships
- Returning tracking and pairing views for identified fish
- Providing visualization tools (GradCAM, enhanced crops) for model interpretability

---

## ML Pipeline

### Detection Model

**Model:** YOLOv11 Nano (Fine-tuned)

The detection stage uses a fine-tuned YOLOv11 Nano model to locate rabbitfish in underwater survey images.

- **Model file:** `ai_models/yolo-v11-n-4.pt`
- **Configuration:** `ai_models/config.yaml`
- **Framework:** Ultralytics YOLO
- **Input:** Underwater reef survey photos
- **Output:** Bounding boxes with confidence scores

**Data Preparation:**
- Survey photos are annotated using [yolo_annotator](https://github.com/mohaimenz/yolo_annotator)
- Annotations are converted to YOLO format before fine-tuning

**Note:** The fine-tuning pipeline is not included in this repository.

### Identification Model

**Model:** Fine-tuned FaceNet with ResNet50 Backbone

The identification stage generates embeddings for each detected fish crop and compares them against known individuals to suggest identity matches.

- **Model directory:** `ai_models/facenet_partial_integration/`
- **Model file:** `facenet_partial_state_dict.pth`
- **Configuration:** `facenet_partial_integration/threshold.yaml`
- **Framework:** PyTorch
- **Backbone:** ResNet50
- **Output:** 128-dimensional embedding vectors for identity matching

**Image Enhancement Techniques:**
- **GradCAM:** Generates visual attention maps for model interpretability (endpoint: `/identify/gradcam`)
- **CLAHE (Contrast Limited Adaptive Histogram Equalization):** Enhances local contrast to improve recognition in variable underwater lighting
- **Grayscale Conversion:** Reduces color noise in challenging lighting conditions

**Note:** The fine-tuning pipeline is not included in this repository.

---

## Start Here

### Prerequisites

- Python 3.10+ is recommended
- MongoDB running locally on `mongodb://localhost:27017/`
- The model files already present in `ai_models/`

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

4. Create or update the auth secret file at `data_access/.env`:

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
- Uploaded files are stored under `uploads/`
- Generated crops and visualizations are also stored under `uploads/`
- Model files are loaded from `ai_models/`

Because of that, the safest way to run the API is from inside the `api` folder.

## Configuration Assumptions

Current code assumptions are:

- MongoDB URI is hard-coded to `mongodb://localhost:27017/`
- MongoDB database name is hard-coded to `fish_reid`
- CORS currently allows `http://localhost:3000` and `http://127.0.0.1:3000`
- Uploaded files are stored on local disk, not in cloud storage
- Model files are pre-downloaded and placed in `ai_models/`

If those assumptions need to change, the first place to inspect is `data_access/access.py` and `main.py`.

## Route Groups

### Authentication

Defined in `routes/user.py`:

- `POST /user/register`
- `POST /user/login`

Notes:

- JWTs are issued at login.
- There is no dedicated backend `logout` route yet.
- There is no current `me` endpoint.

### Photos

Defined in `routes/photo.py`:

- `POST /photo/upload`
- `GET /photo/get/{photo_id}`

Uploads are resized and stored on disk under `uploads/<user_id>/<upload_id>.jpg`.

### Sites

Defined in `routes/site.py`:

- `GET /site/sites`
- `POST /site/site`

Sites are reusable map points that can be linked to sessions and uploads.

### Workflow Sessions

Defined in `routes/session.py`:

- `POST /session/create`
- `GET /session/history`
- `GET /session/{session_id}`
- `POST /session/{session_id}/complete`
- `DELETE /session/{session_id}`

Sessions are the organizing unit for one survey workflow. They track status, current step, associated site, and summary stats.

### Detection

Defined in `routes/detector.py`:

- `POST /detector/detect` - Runs YOLOv11 detection on uploaded images
- `GET /detector/resume-detection` - Retrieves detection results for review
- `GET /detector/check-unfinished` - Checks for incomplete detection workflows
- `DELETE /detector/discard-previous-unfinished` - Clears incomplete detections
- `DELETE /detector/delete-image` - Removes an image from detection
- `POST /detector/save-manual-annotation` - Saves user corrections to detections
- `DELETE /detector/delete-bbox` - Removes a bounding box

This layer runs YOLOv11 detection and supports manual correction workflows.

### Identification, Pairing, and Tracking

Defined in `routes/identification.py`:

- `POST /identify` - Generates embeddings and finds identity matches
- `POST /identify/create-identity` - Creates a new fish identity record
- `POST /identify/assign` - Assigns a detection to a fish identity
- `PATCH /identify/fish/{fish_id}/alias` - Updates fish metadata
- `POST /identify/visualization` - Generates visual comparison of similar fish
- `POST /identify/gradcam` - Generates GradCAM attention visualization
- `GET /identify/session/{session_id}` - Retrieves identification results for a session
- `GET /identify/fish` - Lists all identified fish
- `GET /pairing/session/{session_id}` - Gets pair relationships from a session
- `GET /pairing/fish/{fish_id}/history` - Gets pairing history for a fish
- `POST /pairing/session/{session_id}/assign` - Records a new pair relationship
- `GET /tracking/{fish_id}` - Gets complete tracking history (sightings, locations, timeline)

This is the heaviest part of the backend. It loads the fine-tuned FaceNet model, generates or reuses crops with enhancement filters (CLAHE, grayscale), compares embeddings, persists identification logs, and returns tracking and pairing views.

## Data Model Overview

The main collections represented in `data_access/models.py` are:

- `Users` - User accounts and authentication
- `Sites` - Geographic survey locations
- `workflow_sessions` - Survey workflow instances
- `user_uploads` - Uploaded photos
- `annotations` - Bounding boxes and detection results
- `fish` - Individual fish identity records
- `fish_embeddings` - Pre-computed embeddings for known fish
- `query_embeddings` - Query embeddings for matching
- `identification_logs` - Decisions made during identification review
- `fish_pair_logs` - Recorded pair relationships

## Storage Layout

At runtime, local files are written under the API working directory:

- `uploads/<user_id>/` for uploaded photos
- `uploads/<user_id>/crops/` for cropped detections
- Additional generated visualization assets under `uploads/`

The API also mounts `uploads/` as static content at `/uploads`.

## Frontend Compatibility Notes

The current frontend can work with this API, but only if its environment variables are aligned with the route prefixes above. In particular:

- The frontend base URL should be `http://localhost:8000`
- Auth routes should point at `/user/*`
- Photo routes should point at `/photo/*`
- Detection routes should point at `/detector/*`
- Site routes should point at `/site/*`
- Identification routes should point at `/identify/*`
- Pairing routes should point at `/pairing/*`

## Known Limitations

- Database connection settings are not yet environment-driven.
- Auth secret loading uses a fixed file location.
- There is no backend logout or current-user endpoint.
- File storage is local-disk only.
- Model weights are assumed to already exist on disk; no automatic download mechanism.
- Model training and fine-tuning pipelines are not included in this repository.
