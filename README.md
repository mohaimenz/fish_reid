# RabbitFish Tracking Platform

This repository contains a development-stage platform for turning underwater survey photos into trackable rabbitfish histories.

## What It Does

The system helps a team move from raw field imagery to a usable identity record for individual fish:

1. Photos are uploaded as part of a survey session.
2. The backend detects rabbitfish in each image using a fine-tuned deep learning model.
3. A human reviewer confirms or corrects the detections.
4. The identification model suggests whether a fish matches a known individual or should become a new identity.
5. Confirmed identities can then be reviewed across time, place, and pairing history.

## Why This Exists

Reviewing reef survey imagery by hand is slow, repetitive, and difficult to scale over many survey periods. This project reduces that effort by combining machine assistance with a human-in-the-loop workflow. The goal is not to remove expert judgment; it is to focus expert time on decisions that matter.

## Architecture Overview

### Frontend
The frontend is a React web application used by researchers and operators. It handles sign-in, session creation, photo upload, annotation review, identification review, tracking history, and pair-matching screens.

**Developer guide:** [frontend/README.md](frontend/README.md)

### API and ML Backend
The API is a FastAPI service backed by MongoDB. It stores users, survey sessions, sites, uploaded images, annotations, identity logs, embeddings, and pair histories. It also runs the object detection and re-identification pipeline.

**Developer guide:** [api/README.md](api/README.md)

---

## ML Pipeline

### Detection Pipeline

**Model:** YOLOv11 Nano (fine-tuned)

The detection stage uses a fine-tuned YOLOv11 Nano model to locate rabbitfish in survey images. The model is optimized for speed and accuracy on underwater imagery.

- **Framework:** Ultralytics YOLO
- **Input:** Underwater reef survey photos
- **Output:** Bounding boxes with confidence scores for each detected fish
- **Model file:** [`api/ai_models/yolo-v11-n-4.pt`](api/ai_models/yolo-v11-n-4.pt)

**Data Annotation:** Custom survey photos are annotated using [yolo_annotator](https://github.com/mohaimenz/yolo_annotator) before fine-tuning.

*Note: The fine-tuning pipeline is not included in this repository.*

### Identification Pipeline

**Model:** Fine-tuned FaceNet with ResNet50 Backbone

The identification stage uses a fine-tuned FaceNet model to generate embeddings for each detected fish and match them against known individuals.

- **Framework:** PyTorch
- **Backbone:** ResNet50
- **Input:** Cropped fish images from detection bounding boxes
- **Output:** 128-dimensional embedding vectors for identity matching
- **Model file:** [`api/ai_models/facenet_partial_integration/`](api/ai_models/facenet_partial_integration/)

**Image Enhancement Techniques:**
- **GradCAM:** Visualizes model attention for interpretability
- **CLAHE (Contrast Limited Adaptive Histogram Equalization):** Enhances local contrast in underwater imagery
- **Grayscale Conversion:** Reduces color noise in variable underwater lighting

*Note: The fine-tuning pipeline is not included in this repository.*

### Configuration

Model configuration and thresholds are defined in:
- [`api/ai_models/config.yaml`](api/ai_models/config.yaml) - Detection and inference settings
- [`api/ai_models/facenet_partial_integration/threshold.yaml`](api/ai_models/facenet_partial_integration/threshold.yaml) - Identity matching thresholds

---

## How To Use It

### For Non-Technical Stakeholders

> RabbitFish Tracking Platform helps a marine monitoring team upload reef survey photos, find rabbitfish in those images, decide whether each fish has been seen before, and build a visual history of sightings over time.

### Typical Users

- Field or lab staff uploading new survey images
- Analysts reviewing model suggestions
- Project leads checking whether an individual fish has been seen before, where it was seen, and when

### What Success Looks Like

- Less time spent manually sorting large image batches
- Better continuity between survey sessions
- A growing identity catalogue that improves long-term monitoring
- A traceable review process instead of ad hoc spreadsheet-based matching

---

## Development & Deployment

### Local Development

This is a development-stage codebase. Local setup currently assumes:
- A React frontend with Vite
- A FastAPI backend
- Local file storage for uploads
- A MongoDB instance running on the same machine

The workflow is intentionally operator-assisted. Model output is meant to support review, not replace it.

For step-by-step setup instructions, see:
- **Frontend setup:** [frontend/README.md](frontend/README.md)
- **API setup:** [api/README.md](api/README.md)

### Production Deployment

The platform is designed to be deployed using:
- **Containerization:** Docker
- **Orchestration & CI/CD:** Standard deployment pipelines
- **Cloud Infrastructure:** AWS

*Note: Production deployment configuration is not included in this repository.*

---

## Project Structure

```
├── frontend/              # React web application
│   └── README.md         # Frontend development guide
├── api/                  # FastAPI backend service
│   ├── README.md         # API development guide
│   ├── ai_models/        # Model files and configs
│   │   ├── yolo-v11-n-4.pt
│   │   ├── config.yaml
│   │   └── facenet_partial_integration/
│   ├── routes/           # API endpoints
│   ├── data_access/      # Database and storage logic
│   └── requirements.txt  # Python dependencies
└── README.md            # This file
```

---

## Important Context

- This is still a working codebase, not a polished packaged product.
- The workflow is intentionally operator-assisted. Model output is meant to support review, not replace it.
- Model training pipelines and production deployment configurations are not included.
- For technical details on any component, refer to the component-specific README files.
