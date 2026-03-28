# Backend API (FastAPI + ML Inference)

Backend service responsible for **fish detection, re-identification, and tracking workflows**.

---

## Quick Start

```bash
cd api

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file with secret
cp data_access/.env.example data_access/.env
# Edit data_access/.env and replace API_TOKEN_KEY with a random secret

# Ensure MongoDB is running
# mongod  (in another terminal)

# Start the server
uvicorn main:app --reload
```

API will be available at: **http://localhost:8000**  
Interactive docs: **http://localhost:8000/docs** (Swagger UI)

---

## Prerequisites

- **Python 3.10+** (3.11+ recommended)
- **MongoDB 5.0+** (local or remote)
- **pip** or **poetry** for dependency management
- Optional: **GPU** (CUDA 11.8+) for faster inference

---

## Installation

### 1. Create Virtual Environment

```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Set Up Environment File

```bash
cp data_access/.env.example data_access/.env
```

Edit `data_access/.env`:

```env
API_TOKEN_KEY=your-very-long-random-secret-key-here-min-32-chars
```

### 4. Verify Model Files

Check that pre-trained models exist:

```bash
ls -la ai_models/
# Should contain:
#   - yolo-v11-n-4.pt
#   - config.yaml
#   - facenet_partial_integration/
#     ├── facenet_partial_state_dict.pth
#     ├── model_def.py
#     ├── threshold.yaml
#     └── model_meta.json
```

If model files are missing, download them from the project's model repository or contact the team.

### 5. Start MongoDB

```bash
# Option 1: Local MongoDB
mongod

# Option 2: If MongoDB is already running
# (verify with: mongo mongodb://localhost:27017/fish_reid)
```

### 6. Run the Server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## Overview

This API provides an end-to-end pipeline for:

* Running object detection on uploaded images
* Generating embeddings for detected fish
* Matching identities using similarity search
* Managing tracking history across sessions

The system integrates ML inference with application logic and persistent storage.



---

## API Endpoints

### Detection

**`POST /detector/detect`** — Run YOLOv11 detection on uploaded images

Request:
```bash
curl -X POST http://localhost:8000/detector/detect \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "session_id=<session_id>" \
  -F "photos=@image1.jpg" \
  -F "photos=@image2.jpg"
```

Response:
```json
{
  "session_id": "abc123",
  "detections": [
    {
      "photo_id": "photo1",
      "bboxes": [
        {"x": 100, "y": 150, "width": 200, "height": 250, "confidence": 0.95}
      ]
    }
  ]
}
```

**`GET /detector/resume-detection`** — Resume incomplete detection workflow

```bash
curl -X GET http://localhost:8000/detector/resume-detection?session_id=abc123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**`POST /detector/save-manual-annotation`** — Save researcher-corrected bounding boxes

```bash
curl -X POST http://localhost:8000/detector/save-manual-annotation \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "photo_id": "photo1",
    "bboxes": [
      {"x": 100, "y": 150, "width": 200, "height": 250}
    ]
  }'
```

**`DELETE /detector/delete-bbox`** — Remove incorrect detection

```bash
curl -X DELETE http://localhost:8000/detector/delete-bbox?bbox_id=bbox123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Identification

**`POST /identify`** — Generate embeddings and retrieve top matches

```bash
curl -X POST http://localhost:8000/identify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "abc123"
  }'
```

Response:
```json
{
  "matches": [
    {
      "annotation_id": "ann1",
      "candidates": [
        {
          "fish_id": "fish_001",
          "similarity": 0.92,
          "photo_count": 15
        },
        {
          "fish_id": "fish_002",
          "similarity": 0.85,
          "photo_count": 8
        },
        {
          "fish_id": "fish_003",
          "similarity": 0.78,
          "photo_count": 3
        }
      ]
    }
  ]
}
```

**`POST /identify/assign`** — Assign detection to fish identity

```bash
curl -X POST http://localhost:8000/identify/assign \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "annotation_id": "ann1",
    "fish_id": "fish_001",
    "confidence": 0.92
  }'
```

**`POST /identify/create-identity`** — Create new fish identity

```bash
curl -X POST http://localhost:8000/identify/create-identity \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "annotation_id": "ann1",
    "alias": "BigFish_Site1"
  }'
```

---

### Visualization

**`POST /identify/gradcam`** — Generate GradCAM attention visualization

```bash
curl -X POST http://localhost:8000/identify/gradcam \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "photo_id": "photo1"
  }'
```

Returns attention map visualization showing which image regions the FaceNet model focused on.

**`POST /identify/visualization`** — Generate visual comparison of candidate matches

```bash
curl -X POST http://localhost:8000/identify/visualization \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "annotation_id": "ann1",
    "fish_id": "fish_001"
  }'
```

---

### Tracking & Pairing

**`GET /tracking/{fish_id}`** — Retrieve complete sighting history

```bash
curl -X GET http://localhost:8000/tracking/fish_001 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "fish_id": "fish_001",
  "alias": "BigFish_Site1",
  "first_sighting": "2026-03-15",
  "last_sighting": "2026-03-28",
  "total_sightings": 42,
  "sightings": [
    {
      "session_id": "session1",
      "photo_id": "photo1",
      "date": "2026-03-15",
      "site": "Reef_A",
      "coordinates": [153.1234, -27.5678]
    }
  ]
}
```

**`GET /pairing/fish/{fish_id}/history`** — Retrieve pair relationships

```bash
curl -X GET http://localhost:8000/pairing/fish/fish_001/history \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**`POST /pairing/session/{session_id}/assign`** — Record pair observation

```bash
curl -X POST http://localhost:8000/pairing/session/session1/assign \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fish_1_id": "fish_001",
    "fish_2_id": "fish_002"
  }'
```

---

## Configuration

### Environment Variables

Set in `data_access/.env`:

```env
API_TOKEN_KEY=<your-secret-key>
```

### Database Configuration

Current settings (in `data_access/access.py`):
- MongoDB URI: `mongodb://localhost:27017`
- Database name: `fish_reid`

To change, edit `data_access/access.py`:

```python
MONGO_URI = "mongodb://your-server:27017"
DATABASE_NAME = "fish_reid"
```

### Model Configuration

Detection thresholds: `ai_models/config.yaml`
```yaml
confidence_threshold: 0.5
iou_threshold: 0.4
```

Identification thresholds: `ai_models/facenet_partial_integration/threshold.yaml`
```yaml
similarity_threshold: 0.6
top_k_matches: 3
```

### CORS Settings

Frontend access (in `main.py`):
```python
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
```

To add more origins:
```python
ALLOWED_ORIGINS.append("http://your-frontend-url")
```

---

## Performance Tuning

### Faster Inference

- **Enable GPU:** Install CUDA drivers; PyTorch auto-detects
- **Batch Processing:** Process multiple images at once in `/detector/detect`
- **Embedding Caching:** Embeddings are cached; re-use when possible
- **Model Quantization:** YOLOv11 Nano is already lightweight

### Memory Optimization

- Reduce batch size in detection if GPU memory is limited
- Implement embedding pagination for large datasets
- Archive old sessions to separate collection

### Database Performance

Ensure MongoDB indexes on frequently queried fields:
```javascript
// In MongoDB shell
db.annotations.createIndex({ "session_id": 1 })
db.fish_embeddings.createIndex({ "fish_id": 1 })
db.identification_logs.createIndex({ "session_id": 1, "created_at": -1 })
```



---

## Architecture

```
Frontend (React)
    ↓
FastAPI Backend
    ↓
ML Inference Layer
├── YOLOv11 (Detection)
├── FaceNet (Re-ID)
└── Preprocessing (CLAHE, Grayscale, GradCAM)
    ↓
MongoDB + File Storage
```

---

## ML Inference Pipeline

### Detection

```
Image → YOLOv11 Nano → Bounding Boxes + Confidence
```

- **Model:** YOLOv11 Nano (fine-tuned on rabbitfish dataset)
- **Input:** Underwater survey photos (any resolution)
- **Output:** Bounding boxes with confidence scores
- **Performance:** ~100-500ms per image on CPU

### Identification

```
Cropped Fish → CLAHE + Grayscale → FaceNet (ResNet50) → Embedding (128-d)
                                          ↓
                                   Similarity Search
```

- **Model:** FaceNet with ResNet50 backbone (fine-tuned)
- **Input:** Cropped fish images from detections
- **Output:** 128-dimensional embedding vectors
- **Similarity Metric:** Cosine distance
- **Performance:** ~50-100ms per embedding on CPU

### Preprocessing Techniques

- **CLAHE:** Contrast Limited Adaptive Histogram Equalization (improves details in low-light)
- **Grayscale:** Reduces color variability in different lighting conditions
- **GradCAM:** Generates attention maps showing which regions the model focused on

---

## Data Model

### MongoDB Collections

| Collection | Purpose |
| --- | --- |
| `users` | User accounts and authentication |
| `workflow_sessions` | Survey session metadata |
| `user_uploads` | Uploaded photos |
| `annotations` | Bounding boxes from detections |
| `fish` | Individual fish identity records |
| `fish_embeddings` | Pre-computed embeddings for identities |
| `query_embeddings` | Query embeddings from current session |
| `identification_logs` | Decision logs (who assigned what identity when) |
| `fish_pair_logs` | Recorded pair relationships |

---

## Storage Layout

```
uploads/
├── <user_id>/
│   ├── <photo_id>.jpg          # Original uploaded photo
│   └── crops/
│       └── <annotation_id>.jpg  # Cropped fish image
```

All files are also served as static content at `/uploads/`.

---

## Troubleshooting

### Startup Issues

**"ModuleNotFoundError: No module named 'ultralytics'"**
```bash
pip install ultralytics torch torchvision
```

**"MongoDB connection failed"**
- Ensure MongoDB is running: `mongod` or check connection URI in code
- Verify URI: `mongodb://localhost:27017`

**"CUDA out of memory"**
- Reduce detection batch size in `config.yaml`
- Or use CPU: `CUDA_VISIBLE_DEVICES="" python main.py`

### API Issues

**"401 Unauthorized"**
- Verify JWT token is included in `Authorization: Bearer <token>` header
- Check token hasn't expired

**"413 Payload too large"**
- Default max file size is 50 MB
- Adjust in FastAPI if needed

**"No detections returned"**
- Check image resolution (very small images < 100px may fail)
- Check confidence threshold in `config.yaml`
- Verify model file is not corrupted

### Model Issues

**"Embeddings not matching expected fish"**
- May need to retrain FaceNet on your specific dataset
- Adjust similarity threshold in `threshold.yaml`

**"GradCAM returns blank**
- Some images may not have clear fish (garbage in, garbage out)
- Try another image

---

## Performance Notes

- **Detection:** YOLOv11 Nano is 80% faster than YOLOv8 with similar accuracy
- **Embeddings:** FaceNet 128-dimensional embeddings are fast to compute and store
- **Scaling:** For >10,000 embeddings, consider GPU inference or batch processing
- **Database:** MongoDB can handle millions of embeddings with proper indexing

---

## Component Restrictions

The following are **intentionally not included**:

### Model Training Pipelines
- YOLOv11 retraining code not included
- FaceNet fine-tuning code not included
- Data annotation pipeline not included

### Deployment Infrastructure
- CI/CD pipelines not included
- Docker configurations not included
- Kubernetes manifests not included
- AWS/cloud deployment code not included

---

## Related Documentation

- **Main README:** [../README.md](../README.md)
- **Frontend Setup:** [../frontend/README.md](../frontend/README.md)
- **Product Requirements:** [../PRD.md](../PRD.md)

---

## Notes

* Designed for single-node deployment (can be extended to distributed)
* Lightweight models chosen for efficiency on typical research hardware
* All decisions are logged and reversible
* Suitable for research teams with 100-1000s of fish identities
