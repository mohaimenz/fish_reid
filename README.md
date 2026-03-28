# RabbitFish Tracking Platform

ML-assisted system for **detecting, identifying, and tracking individual fish across survey sessions** using underwater imagery.

**Status:** Active Development | **License:** Proprietary

---

## Prerequisites

Before starting, ensure you have:

- **Python** 3.10+ (for backend)
- **Node.js** 18+ with npm (for frontend)
- **MongoDB** 5.0+ (running locally or remotely)
- **Git** for version control
- Recommended: **GPU support** (CUDA 11+) for faster inference on large batches

---

## Quick Start

Get the system running in ~15 minutes:

```bash
# 1. Clone and navigate to the project
git clone <repository-url>
cd fish_reid

# 2. Start MongoDB (if not already running)
mongodb

# 3. Set up and run the backend
cd api
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp data_access/.env.example data_access/.env
# Edit .env and set API_TOKEN_KEY to a random secret
uvicorn main:app --reload
# API is now at http://localhost:8000

# 4. In a new terminal, set up and run the frontend
cd frontend
npm install
npm run dev
# Frontend is now at http://localhost:3000

# 5. Open http://localhost:3000 and create an account
```

---

## Overview

RabbitFish Tracking Platform enables marine researchers to convert raw survey images into **persistent identity records** of individual fish.

The system combines:

* **Object Detection:** YOLOv11 model detects fish in images
* **Visual Re-identification:** FaceNet generates embeddings for matching
* **Human-in-the-loop Validation:** Researchers review and approve all decisions

Result: faster processing, consistent identity tracking, and traceable decisions.

---

## Demo

<iframe width="560" height="315" src="https://www.youtube.com/embed/pWxlk51-I_E" title="RabbitFish Tracking Platform Demo" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

---

## Key Capabilities

* **Automated Detection**

  * YOLOv11 Nano detects fish in underwater images

* **Identity Matching**

  * FaceNet generates 128-dimensional embeddings
  * Top-K similarity search for candidate matches

* **Human-in-the-loop Workflow**

  * Detection correction (bounding boxes)
  * Identity assignment (existing or new)

* **Tracking & History**

  * Cross-session identity persistence
  * Timeline, gallery, and map-based tracking

* **Pair Analysis**

  * Record co-occurrence relationships between fish

---

## System Architecture

```
Frontend (React)
        ↓
FastAPI Backend
        ↓
ML Inference Layer
   ├── YOLOv11 (Detection)
   └── FaceNet (ReID Embeddings)
        ↓
MongoDB (Metadata + Embeddings)
        ↓
File Storage (Images)
```

---

## Core Workflows

### 1. Detection

* Upload images
* YOLO detects fish
* User reviews / edits bounding boxes

### 2. Identification

* Embeddings generated
* Top-3 matches suggested
* User assigns identity or creates new

### 3. Tracking

* Identity history stored across sessions
* Query by fish, location, or time

---

## Tech Stack

### Backend

* FastAPI
* MongoDB
* PyTorch
* Ultralytics YOLO

### Frontend

* React + Vite
* Zustand
* Tailwind CSS
* React Leaflet

---

## ML Components

### Detection

* Model: YOLOv11 Nano (fine-tuned)
* Output: bounding boxes + confidence

### Identification

* Model: FaceNet (ResNet50 backbone)
* Output: 128-dimensional embedding vectors
* Similarity: cosine distance

### Enhancements

* CLAHE preprocessing
* Grayscale normalization
* GradCAM visualization

---

## Project Structure

```
.
├── api/          # FastAPI backend + ML inference
├── frontend/     # React UI
├── PRD.md        # Product requirements
```

---

---

## Detailed Setup

For step-by-step installation and troubleshooting, see:
- **Backend:** [api/README.md](api/README.md)
- **Frontend:** [frontend/README.md](frontend/README.md)

---

## API Overview

Key API endpoints (full list in [api/README.md](api/README.md)):

- `POST /detector/detect` — run detection on images
- `GET /detector/resume-detection` — retrieve detection results
- `POST /identify` — generate embeddings and find matches
- `POST /identify/assign` — assign detection to fish identity
- `GET /tracking/{fish_id}` — retrieve complete sighting history
- `POST /pairing/session/{session_id}/assign` — record pair observations

Interactive API docs available at: **http://localhost:8000/docs**

---

## Troubleshooting

### Backend won't start
- **"MongoDB connection refused"** → Ensure MongoDB is running: `mongod` or check your connection URI
- **"Port 8000 already in use"** → Kill existing process: `lsof -i :8000` or use `--port 8001`
- **"API_TOKEN_KEY not found"** → Create `api/data_access/.env` with `API_TOKEN_KEY=your-secret-key`

### Frontend won't start
- **"ECONNREFUSED" connecting to backend** → Verify backend is running on `http://localhost:8000`
- **"Port 3000 already in use"** → Kill existing process or use `npm run dev -- --port 3001`
- **Blank page after login** → Check browser console for errors; verify `.env` has correct API URL

### Detection/Identification slow
- **GPU not detected** → Install CUDA drivers; PyTorch should auto-detect
- **Memory issues** → Reduce batch size in `api/ai_models/config.yaml`
- **Embeddings not generated** → Check model files exist in `api/ai_models/`

---

## Current Limitations

- **Single-node deployment only** (no distributed processing yet)
- **Local file storage** (no S3 or cloud storage integration)
- **Local MongoDB only** (URI is hard-coded to localhost)
- **Model files must be pre-downloaded** (no automatic download)
- **No batch re-identification** for historical records

See [PRD.md](PRD.md) for planned enhancements.

---

## Components Intentionally Not Included

The following are **not included in this repository** due to data sensitivity, proprietary considerations, and security:

### Model Training Pipelines
- YOLOv11 retraining code is **not included**
- FaceNet (ResNet50) retraining code is **not included**
- Data annotation workflow is **not included**

### Deployment Infrastructure
- CI/CD pipelines are **not included**
- Docker/Kubernetes configurations are **not included**
- AWS infrastructure code is **not included**

This repository focuses on **inference, API design, and system integration** only.

---
<!-- 
## Current Limitations

* No training pipelines included
* Local storage only
* Single-node deployment
* No production deployment configuration

--- -->

<!-- ## Future Work

* Cloud storage (S3)
* Distributed inference
* Batch re-identification
* Advanced querying
* Mobile support

--- -->



---

## Documentation

- **Product Requirements:** [PRD.md](PRD.md) — Complete vision, features, and success criteria
- **Backend Setup & API:** [api/README.md](api/README.md)
- **Frontend Setup & Architecture:** [frontend/README.md](frontend/README.md)

---

## Contributing

This is an active development project. For questions or issues:
1. Check existing [GitHub Issues](../../issues)
2. Review [PRD.md](PRD.md) for planned work
3. Contact the team

---

## Authors

- **Md Mohaimenuzzaman** — PhD in Machine Learning, Monash University, Australia
- **Asaduzzaman** — PhD in Artificial Intelligence, Monash University, Australia

---

## License & Usage

This software is proprietary. Contact the authors for licensing information.

---

## Acknowledgments

- YOLOv11 from [Ultralytics](https://ultralytics.com)
- FaceNet research by Schroff et al. (2015)
- Data annotation tool: [yolo_annotator](https://github.com/mohaimenz/yolo_annotator)
