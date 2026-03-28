# RabbitFish Tracking Platform — Product Requirements Document

**Version:** 1.0  
**Date:** March 2026  
**Status:** Active Development

---

## Executive Summary

RabbitFish Tracking Platform is an ML-assisted web application that helps marine biology research teams efficiently process underwater survey photographs to generate persistent, trackable records of individual fish sightings. By combining automated object detection and visual re-identification with human-in-the-loop review, the platform reduces manual labor while maintaining researcher control over all identity decisions.

The system is designed for teams conducting repeated reef surveys who need to:
- Speed up image review and fish identification
- Build and maintain identity catalogues across survey periods
- Track fish movements and encounter locations over time
- Preserve a traceable record of all identification decisions

---

## Problem Statement

### Current Workflow Challenges

Marine research teams conducting repeated reef surveys face several pain points:

1. **Manual Image Sorting** — Hundreds of underwater photos from each survey must be manually reviewed to find fish
2. **Repetitive Labeling** — Without a system to track identities, researchers must re-examine the same individuals across surveys
3. **Continuity Loss** — Each photo batch is often treated as isolated, making it difficult to build long-term sighting history
4. **Scale Limitations** — Manual review becomes impractical as survey history accumulates
5. **Decision Traceability** — Ad hoc spreadsheet-based matching makes it hard to review past decisions or understand why a conclusion was reached

### Current State

Teams typically:
- Upload photos to local storage or shared drives
- Manually sort and classify images
- Use spreadsheets or informal notes to track identities
- Have limited ability to query "where has fish X been seen?" without manual searching

---

## Solution Overview

RabbitFish Tracking Platform automates the labor-intensive stages while keeping researchers in control of critical decisions:

1. **Detection Phase** — YOLOv11 model automatically locates rabbitfish in uploaded images
2. **Researcher Review** — Researchers confirm, correct, or remove detections
3. **Identification Phase** — FaceNet model generates embedding-based match suggestions
4. **Identity Assignment** — Researchers assign detected fish to known individuals or create new identities
5. **Tracking & Pairing** — The system maintains cross-session sighting history and observed pair relationships

By automating detection and matching, the platform focuses researcher time on decisions that require expert judgment, dramatically reducing review time while maintaining confidence in the final record.

---

## Product Vision

**A living, continuously-growing record of fish identities where:**
- Each confirmed identity becomes searchable history
- Researchers control all decisions but receive intelligent suggestions
- Observations are tied to place and time
- Teams can confidently answer "which fish, where, and when?"

---

## Core Features

### 1. User Authentication & Session Management
- User registration and JWT-based login
- Role-based access control (researcher, analyst, admin)
- Survey session creation and lifecycle management
- Session status tracking (in-progress, completed, archived)

### 2. Photo Upload & Storage
- Batch photo upload for survey sessions
- Automatic image resizing and storage
- Support for multiple concurrent sessions
- File organization by user and session

### 3. Detection Workflow
- **Automated Detection:** YOLOv11 Nano model runs on all uploaded images
- **Review Interface:** Researchers view detection results with bounding boxes
- **Manual Correction:** Add, remove, or adjust bounding boxes
- **Approval Process:** Researchers confirm detections before proceeding
- **Resume Capability:** Incomplete detection workflows can be resumed

### 4. Identification Workflow
- **Embedding Generation:** FaceNet model generates 128-dimensional embeddings for each detected fish
- **Match Suggestions:** Top 3 candidate matches from historical records
- **Visual Comparison:** Side-by-side gallery view of suggested matches
- **Identity Assignment:** Create new identity or assign to existing fish
- **Decision Logging:** All identity decisions are persisted with timestamps

### 5. Pair Matching
- Record observed pair relationships within a survey session
- Maintain pair history across sessions
- Query paired fish relationships

### 6. Tracking & History
- **Map View:** Geographic timeline of a fish's sightings
- **Timeline View:** Chronological record of sightings
- **Gallery View:** Visual gallery of all sightings for an individual
- **Session History:** Browse all sessions and their results
- **Fish Directory:** Search and browse all identified individuals

### 7. Visualization & Interpretability
- **GradCAM Visualizations:** Show which parts of the image the model attended to
- **Enhanced Crops:** CLAHE, grayscale preprocessing to inspect improvements
- **Comparison Views:** Side-by-side visual comparison for identity matching

### 8. Admin Dashboard
- User management
- System monitoring
- Workflow statistics

---

## Technical Architecture

### Frontend Stack
- **Framework:** React 18 + Vite
- **State Management:** Zustand
- **HTTP Client:** Axios
- **UI Framework:** Tailwind CSS + Lucide Icons
- **Maps:** React Leaflet

### Backend Stack
- **API Framework:** FastAPI
- **Database:** MongoDB
- **Authentication:** JWT + bcrypt
- **ML Inference:** PyTorch, Ultralytics YOLO

### ML Components

#### Detection Model
- **Architecture:** YOLOv11 Nano (fine-tuned)
- **Input:** Underwater survey photographs
- **Output:** Bounding boxes with confidence scores
- **Optimization:** Lightweight for fast inference

#### Identification Model
- **Architecture:** FaceNet with ResNet50 backbone (fine-tuned)
- **Input:** Cropped fish imagery from detections
- **Output:** 128-dimensional embedding vectors
- **Enhancement Techniques:**
  - CLAHE (Contrast Limited Adaptive Histogram Equalization)
  - Grayscale conversion
  - GradCAM visualization

#### Data Annotation
- Custom photos annotated using [yolo_annotator](https://github.com/mohaimenz/yolo_annotator)
- YOLO format conversion for model training

---

## User Personas

### 1. Field Researcher / Analyst
- **Role:** Uploads photos, reviews detections, assigns identities
- **Goals:** Quickly process survey photos, build reliable identity records
- **Pain Points:** Manual review is time-consuming; needs fast feedback

### 2. Project Lead / Curator
- **Role:** Reviews completed sessions, queries historical data, validates trends
- **Goals:** Understand fish movements and patterns over time
- **Pain Points:** No easy way to query historical sightings

### 3. System Administrator
- **Role:** Manages users, monitors system health, manages sessions
- **Goals:** Ensure system reliability and correct operation
- **Pain Points:** Limited visibility into workflow state

---

## User Workflows

### Workflow 1: Upload and Review a New Survey
1. Researcher creates a new survey session
2. Selects or creates a survey site (mapped location)
3. Uploads batch of underwater photos
4. System automatically runs YOLOv11 detection
5. Researcher reviews detections, adjusts boxes as needed
6. Researcher approves final detections

### Workflow 2: Assign Identities to Detected Fish
1. System runs FaceNet embedding on each approved detection
2. For each detection, system suggests top 3 matching identities
3. Researcher reviews suggestions with visual comparison
4. Researcher either:
   - Accepts a suggested match → Assigns detection to that fish identity
   - Rejects all suggestions → Creates new individual identity
5. All decisions logged with timestamp and reasoning notes (optional)

### Workflow 3: Record Pair Observations
1. After identity assignment, researcher enters pair-matching interface
2. For each observation of two fish together, creates a pair record
3. System links pair to survey session and timestamp

### Workflow 4: Explore Fish History
1. Researcher or analyst searches for a specific fish
2. Views all sightings on interactive map
3. Views chronological timeline of encounters
4. Views gallery of all photos containing that fish
5. Can filter by date range, location, or session

---

## Data Model

### Collections

**Users**
- User ID, name, email, password hash, role, created_at

**Sites**
- Site ID, name, coordinates (lat/lng), description

**Workflow Sessions**
- Session ID, user ID, site ID, start_date, status, photo_count, detection_count, identified_count

**User Uploads**
- Upload ID, user ID, session ID, original_filename, stored_path, upload_date

**Annotations** (Bounding Boxes)
- Annotation ID, upload ID, x, y, width, height, confidence, status (approved/rejected/pending), created_by, edited_by

**Fish** (Individual Identities)
- Fish ID, name/alias, created_date, first_sighting_date, last_sighting_date, total_sightings

**Fish Embeddings**
- Embedding ID, fish ID, session ID, upload ID, embedding_vector (128-dim), generated_date

**Identification Logs**
- Log ID, session ID, detection ID, assigned_fish_id, confidence_score, decision_date, decided_by, notes

**Fish Pair Logs**
- Pair ID, session ID, fish_1_id, fish_2_id, observation_date, recorded_by

---

## Key Workflows & Endpoints

### Detection Pipeline
- `POST /detector/detect` — Run YOLOv11 on uploaded images
- `GET /detector/resume-detection` — Retrieve and resume detection review
- `POST /detector/save-manual-annotation` — Save researcher corrections
- `DELETE /detector/delete-bbox` — Remove incorrect detection

### Identification Pipeline
- `POST /identify` — Generate embeddings and find matches
- `POST /identify/create-identity` — Create new fish record
- `POST /identify/assign` — Assign detection to fish
- `POST /identify/gradcam` — Generate GradCAM visualization
- `POST /identify/visualization` — Generate visual comparison

### Tracking & History
- `GET /tracking/{fish_id}` — Get complete sighting history for a fish
- `GET /pairing/fish/{fish_id}/history` — Get pair history for a fish
- `POST /pairing/session/{session_id}/assign` — Record pair observation

---

## Success Metrics

### Speed Improvements
- **Detection Review Time:** Target 50% reduction vs. manual sorting
- **Identity Assignment Time:** Target 60% reduction vs. manual matching
- **Overall Session Processing:** Target 70% time savings

### Accuracy & Quality
- **Detection Precision:** >95% on reviewable detections
- **Identity Match Accuracy:** >90% top-1 accuracy on known individuals
- **Zero Identity Conflicts:** All identity assignments logged and reversible

### Usage & Adoption
- **Active Sessions per Week:** Track engagement
- **Fish Records Created:** Growing identity catalogue
- **Decision Consistency:** Monitor researcher agreement on manual corrections

### System Reliability
- **Uptime:** 99%+ availability
- **Detection Model Response:** <2s per image
- **Identification Model Response:** <100ms per embedding

---

## Technical Constraints & Trade-offs

### Current Limitations
1. **Model Training Pipelines Not Included** — Fine-tuning data and procedures are not in the repository
2. **Local Storage Only** — Photos stored on local disk, not cloud
3. **Single Machine Deployment** — No distributed processing yet
4. **MongoDB Assumed Local** — Database URI hard-coded for localhost
5. **Deployment Config Not Included** — Docker and AWS configurations not provided

### Scalability Considerations
- **Photo Storage:** Current approach scales to ~1TB per machine
- **Database:** MongoDB handles millions of records; indexing critical for query performance
- **Model Inference:** YOLOv11 Nano is lightweight but might need batching at scale
- **Embedding Storage:** 128-dim embeddings require ~500 bytes each; ~1M fish = 500GB of embeddings

---

## Development Status

### Current Capabilities ✓
- User authentication and session management
- Photo upload and storage
- YOLO detection with manual correction
- FaceNet embedding generation and matching
- Identity assignment workflow
- Tracking history views
- Pair matching
- Admin dashboard

### Planned / Future Enhancements
- Cloud storage integration (S3)
- Distributed detection/identification processing
- Batch re-identification for historical records
- Advanced search (by location, date range, traits)
- Team collaboration features (comments, annotations)
- Model retraining pipeline (if training data made available)
- Mobile app for field verification
- Multi-language support

### Not Included (By Design)
- Model training or fine-tuning code
- Production deployment scripts
- CI/CD pipeline configuration
- Load testing or performance optimization for very large deployments

---

## Deployment Strategy

### Local Development
- React frontend on `http://localhost:3000`
- FastAPI backend on `http://localhost:8000`
- MongoDB on `mongodb://localhost:27017`
- File storage on local disk under `uploads/`

### Production Deployment (High Level)
- **Containerization:** Docker
- **Orchestration:** Standard container deployment
- **Cloud Platform:** AWS (configuration not included)
- **CI/CD:** Standard pipeline (configuration not included)

---

## Glossary

- **Annotation:** A bounding box around a detected fish in an image
- **Detection:** AI identification of fish location (YOLOv11 output)
- **Embedding:** A 128-dimensional vector representation of a fish's visual identity (FaceNet output)
- **Fish Identity:** A unique record representing an individual fish across all sessions
- **GradCAM:** Attention visualization showing which image regions the model focused on
- **Identity Assignment:** Assignment of a detection to a known fish or creation of new identity
- **Pair:** Two fish observed together in a session
- **Session:** One survey activity encapsulating uploads, detections, and identifications
- **Site:** A named geographic location where surveys are conducted

---

## Success Criteria

The platform will be considered successful when:

1. **Time Savings:** Research teams report 50%+ reduction in photo review and identification time
2. **Adoption:** Consistent usage across multiple team members and sessions
3. **Reliability:** 99%+ system uptime with <2 minute response for detection/identification
4. **Data Quality:** All identity records are traceable with zero unexplained conflicts
5. **Scalability:** Can process 100+ high-resolution images per session without performance degradation

---

## References & Links

- **Frontend Repository:** [frontend/](frontend/)
- **Backend Repository:** [api/](api/)
- **Frontend Development Guide:** [frontend/README.md](frontend/README.md)
- **API Development Guide:** [api/README.md](api/README.md)
- **Data Annotation Tool:** https://github.com/mohaimenz/yolo_annotator

---

## Document History

| Version | Date | Author | Changes |
| --- | --- | --- | --- |
| 1.0 | March 2026 | Project Team | Initial PRD |

