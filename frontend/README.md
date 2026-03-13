# RabbitFish Tracking Platform Frontend

This frontend is the operator-facing web app for the RabbitFish workflow. It is built with React and Vite and is responsible for authentication, session management, photo upload, review of detections, identity assignment, pair matching, and tracking views.

## What The App Covers

The current route structure in [`src/routes/AppRoutes.jsx`](/Users/aasa0007/Python/RabbitFish/fish_reid/frontend/src/routes/AppRoutes.jsx) exposes these main areas:

| Route | Purpose |
| --- | --- |
| `/` | Landing page and project overview |
| `/how-it-works` | Plain-language explanation of the workflow |
| `/login` | User sign-in |
| `/register` | User registration |
| `/upload` | Create or resume a survey session and upload images |
| `/detection` | Review, edit, and save detections |
| `/identification` | Review match suggestions and assign identities |
| `/pair-matching` | Record pair relationships for a session |
| `/tracking` | Explore fish history through map, gallery, and timeline views |
| `/sessions` | Browse survey sessions |
| `/fishes` | Browse identified fish records |
| `/admin` | Admin-only dashboard |

## Stack

- React 18
- Vite
- React Router
- Zustand
- Axios
- Tailwind CSS
- Leaflet / React Leaflet
- Lucide icons

## Prerequisites

- Node.js 18+
- npm
- The FastAPI backend running locally

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

4. Confirm the API values match the current backend:

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

The app runs on `http://localhost:3000` based on [`vite.config.js`](/Users/aasa0007/Python/RabbitFish/fish_reid/frontend/vite.config.js).

## Scripts

- `npm run dev` starts the local dev server
- `npm run build` creates a production build
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
