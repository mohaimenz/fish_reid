# RabbitFish Tracking Platform Frontend

This is the operator-facing web application for the RabbitFish workflow. Built with React and Vite, it enables researchers to upload survey photos, review AI-generated detections, assign fish identities, record observations, and track individuals over time.

## How It Works

The app follows the survey workflow in this sequence:

1. **Photo Upload** (`/upload`) — Create a new survey session and upload underwater photos
2. **Detection Review** (`/detection`) — Review YOLOv11 detection results, correct boxes, and approve detections
3. **Identity Assignment** (`/identification`) — Review FaceNet embedding matches and assign fish identities (new or existing)
4. **Pair Recording** (`/pair-matching`) — Document observed pair relationships within a session
5. **Tracking** (`/tracking`) — Explore a fish's history through map, timeline, and gallery views
6. **Session Management** (`/sessions`, `/fishes`) — Browse past surveys and all identified individuals

At each stage, AI recommendations (detections and identity matches) are available for review, but researchers make final decisions.

## Routes and Pages

| Route | Purpose | Connected To |
| --- | --- | --- |
| `/` | Landing page and project overview | – |
| `/how-it-works` | Plain-language explanation of the workflow | – |
| `/login` | User sign-in | Backend auth |
| `/register` | User registration | Backend auth |
| `/upload` | Create/resume survey session and upload images | Photo upload, session creation |
| `/detection` | Review and correct YOLOv11 detections | Detection API |
| `/identification` | Review FaceNet matches and assign identities | Identification API |
| `/pair-matching` | Record pair relationships | Pairing API |
| `/tracking` | Explore fish history (map, timeline, gallery) | Tracking API |
| `/sessions` | Browse all survey sessions | Session history |
| `/fishes` | Browse all identified fish records | Fish identity records |
| `/admin` | Admin-only dashboard | Admin API |

## Stack

- **Framework:** React 18
- **Build Tool:** Vite
- **Routing:** React Router
- **State Management:** Zustand (see `src/store/`)
- **HTTP Client:** Axios (configured in `src/services/apiClient.js`)
- **UI Framework:** Tailwind CSS
- **Maps:** Leaflet / React Leaflet
- **Icons:** Lucide React

## Architecture

### Services (`src/services/`)

- `apiClient.js` — Axios instance with base URL and auth token handling
- `authService.js` — Login, registration, token management
- `workflowService.js` — Unified service for detection, identification, and workflow endpoints

### State Management (`src/store/`)

- `authStore.js` — User authentication state (Zustand)
- `workflowStore.js` — Workflow session and detection/identification state (Zustand)

### Pages (`src/pages/`)

Each main workflow step has a dedicated page component. Pages call services and update Zustand stores as users progress.

### Components (`src/components/`)

- **Layouts:** `AuthLayout.jsx`, `MainLayout.jsx` — Page structure templates
- **UI Components:** `Button.jsx`, `Card.jsx`, `Input.jsx`, `Alert.jsx`, `Spinner.jsx` — Reusable UI primitives
- **Workflow Components:** `WorkflowStepper.jsx`, `TrackingMap.jsx`, `MapSelector.jsx` — Specialized workflow widgets

---

## Prerequisites

- Node.js 18+
- npm
- **The FastAPI backend running locally** on `http://localhost:8000`

## Local Setup

1. Move into the frontend folder:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Create a local environment file:

```bash
cp .env.example .env
```

4. Confirm the API endpoints in `.env` match the backend:

```env
VITE_API_BASE_URL=http://localhost:8000

VITE_AUTH_REGISTER_ENDPOINT=/user/register
VITE_AUTH_LOGIN_ENDPOINT=/user/login

VITE_UPLOAD_ENDPOINT=/photo/upload
VITE_DETECT_ENDPOINT=/detector/detect
VITE_IDENTIFY_ENDPOINT=/identify
VITE_TRACKING_ENDPOINT=/tracking

VITE_RESUME_DETECTION_ENDPOINT=/detector/resume-detection
VITE_CHECK_UNFINISHED_ENDPOINT=/detector/check-unfinished
VITE_DISCARD_PREV_UNFINISHED_ENDPOINT=/detector/discard-previous-unfinished
VITE_DELETE_BBOX_ENDPOINT=/detector/delete-bbox
VITE_SAVE_MANUAL_ANNOTATION_ENDPOINT=/detector/save-manual-annotation
VITE_DELETE_IMAGE_ENDPOINT=/detector/delete-image

VITE_SITES_ENDPOINT=/site/sites
VITE_CREATE_SITE_ENDPOINT=/site/site

VITE_SESSION_CREATE_ENDPOINT=/session/create
VITE_SESSION_HISTORY_ENDPOINT=/session/history
VITE_SESSION_DETAIL_ENDPOINT=/session
```

5. Start the dev server:

```bash
npm run dev
```

The app runs on `http://localhost:3000`.

## Available Scripts

- `npm run dev` — Start the local development server with hot reload
- `npm run build` — Create an optimized production build
- `npm run preview` — Preview the production build locally

---

## Backend Integration

The frontend communicates with the FastAPI backend for:

- **Detections:** Calls `/detector/detect` to run YOLOv11 on uploaded photos
- **Identifications:** Calls `/identify` to generate FaceNet embeddings and find matches
- **Tracking:** Calls `/tracking/{fish_id}` to retrieve sighting history
- **Sessions:** Calls `/session/*` endpoints to manage workflow state

All API calls go through `src/services/apiClient.js`, which includes JWT auth tokens in request headers.

## Flow Diagram

```
User Login
    ↓
Create Survey Session + Upload Photos
    ↓
Run Detection (YOLOv11) → Review & Correct Boxes
    ↓
Run Identification (FaceNet) → Assign Fish Identities
    ↓
Record Pair Relationships
    ↓
View Tracking History (Map, Timeline, Gallery)
    ↓
Browse Past Sessions & Fish Records
```

---

## Key Concepts

### Session
A workflow unit representing one survey activity. Tracks uploaded images, detections, and identification decisions.

### Annotation
A bounding box around a detected fish, with status (pending review, approved, rejected, corrected).

### Embedding
A 128-dimensional vector generated by FaceNet representing a fish's visual identity. Used for matching against known individuals.

### Fish Identity
A unique record for an individual fish, linked to all its embeddings and sightings across sessions.

### Pair Relationship
A recorded observation that two individuals were observed together during a session.
- `npm run preview` serves the production build locally
- `npm run lint` runs ESLint

## Important Integration Notes

- The backend does not currently use a `/api` prefix. The frontend should point directly at `http://localhost:8000`.
- The backend currently exposes `POST /user/register` and `POST /user/login`. It does not expose `GET /auth/me` or `POST /auth/logout`.
- Logout in the frontend is effectively local token clearing. If the backend later adds a logout endpoint, the frontend service can be aligned with it.
- Several service defaults in the code still assume older endpoint names. The environment variables above are the safest way to run the current frontend against the current backend.

## Workflow Summary

1. A user signs in or creates an account.
2. They create a new session or resume an existing one.
3. They upload one or more images and optionally link them to a saved site.
4. Detection produces bounding boxes that can be reviewed, deleted, or supplemented manually.
5. Identification suggests existing fish matches or allows creation of a new identity.
6. The user can then inspect tracking history and record pair relationships.

## Key Folders

| Path | Purpose |
| --- | --- |
| [`src/pages`](/Users/aasa0007/Python/RabbitFish/fish_reid/frontend/src/pages) | Page-level screens |
| [`src/components`](/Users/aasa0007/Python/RabbitFish/fish_reid/frontend/src/components) | Shared UI and layouts |
| [`src/services`](/Users/aasa0007/Python/RabbitFish/fish_reid/frontend/src/services) | API clients and workflow calls |
| [`src/store`](/Users/aasa0007/Python/RabbitFish/fish_reid/frontend/src/store) | Zustand state stores |
| [`src/routes`](/Users/aasa0007/Python/RabbitFish/fish_reid/frontend/src/routes) | Routing and access control |

## Known Gaps

- The frontend still carries some legacy endpoint defaults that do not match the current API layout.
- The auth service assumes endpoints for `logout` and `me` that are not implemented in the backend yet.
- Runtime behaviour depends on the backend being started from the `api/` directory so that relative upload paths resolve correctly.
