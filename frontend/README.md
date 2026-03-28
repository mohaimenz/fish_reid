# Frontend (React UI)

User interface for interacting with the RabbitFish Tracking Platform.

**Status:** Active Development | **Browser Support:** Chrome, Firefox, Safari, Edge (latest 2 versions)

---

## Quick Start

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

App will be available at: **http://localhost:3000**

---

## Overview

The frontend provides a structured workflow for:

* Uploading underwater survey images
* Reviewing detection results
* Assigning fish identities
* Exploring tracking history across sessions

It integrates with the FastAPI backend for all inference and data operations.

---

## Prerequisites

- **Node.js** 18+ (verify with `node --version`)
- **npm** 8+ (comes with Node)
- **Backend running** at `http://localhost:8000`
- **MongoDB** running (backend dependency)

---

## Installation

### 1. Install Dependencies

```bash
cd frontend
npm install
```

This installs all packages from `package.json`.

### 2. Set Up Environment File

```bash
cp .env.example .env
```

Edit `.env.example locally. Expected format:

```env
# Backend API URL
VITE_API_BASE_URL=http://localhost:8000

# Authentication Endpoints
VITE_AUTH_REGISTER_ENDPOINT=/user/register
VITE_AUTH_LOGIN_ENDPOINT=/user/login

# Photo & Session Endpoints
VITE_UPLOAD_ENDPOINT=/photo/upload
VITE_SESSION_CREATE_ENDPOINT=/session/create
VITE_SESSION_HISTORY_ENDPOINT=/session/history
VITE_SESSION_DETAIL_ENDPOINT=/session

# Detection Endpoints
VITE_DETECT_ENDPOINT=/detector/detect
VITE_RESUME_DETECTION_ENDPOINT=/detector/resume-detection
VITE_CHECK_UNFINISHED_ENDPOINT=/detector/check-unfinished
VITE_DISCARD_PREV_UNFINISHED_ENDPOINT=/detector/discard-previous-unfinished
VITE_DELETE_BBOX_ENDPOINT=/detector/delete-bbox
VITE_SAVE_MANUAL_ANNOTATION_ENDPOINT=/detector/save-manual-annotation
VITE_DELETE_IMAGE_ENDPOINT=/detector/delete-image

# Identification Endpoints
VITE_IDENTIFY_ENDPOINT=/identify
VITE_TRACKING_ENDPOINT=/tracking

# Site Endpoints
VITE_SITES_ENDPOINT=/site/sites
VITE_CREATE_SITE_ENDPOINT=/site/site
```

### 3. Start Development Server

```bash
npm run dev
```

Application runs on: **http://localhost:3000**

---

## Application Structure

### Pages (Workflows)

Located in `src/pages/`:

| Component | Route | Purpose |
| --- | --- | --- |
| `LandingPage.jsx` | `/` | Project overview and entry point |
| `Login.jsx` / `Register.jsx` | `/login`, `/register` | User authentication |
| `PhotoUpload.jsx` | `/upload` | Upload survey images and create session |
| `Detection.jsx` | `/detection` | Review and correct bounding boxes |
| `Identification.jsx` | `/identification` | Review matches and assign identities |
| `PairMatching.jsx` | `/pair-matching` | Record pair observations |
| `TrackingHistory.jsx` | `/tracking/{fish_id}` | Explore fish sighting history |
| `SessionManager.jsx` | `/sessions` | Browse survey sessions |
| `FishManager.jsx` | `/fishes` | Browse all identified fish |
| `AdminDashboard.jsx` | `/admin` | Admin controls (user, session stats) |

### Components (UI Widgets)

Located in `src/components/`:

- **Layouts:** `AuthLayout.jsx`, `MainLayout.jsx` — Page templates
- **UI Primitives:** `Button.jsx`, `Card.jsx`, `Input.jsx`, `Alert.jsx`, `Spinner.jsx`
- **Workflow:** `WorkflowStepper.jsx` — Navigation stepper
- **Maps:** `TrackingMap.jsx` — Geographic visualization
- **Headers:** `Header.jsx`, `Footer.jsx` — Global UI

### Services (API Integration)

Located in `src/services/`:

```javascript
// apiClient.js — Axios instance with auth headers
import { apiClient } from './apiClient'
apiClient.get('/endpoint')

// authService.js — Login, register, logout
import { authService } from './authService'
await authService.login(email, password)

// workflowService.js — detection, identification, tracking
import { workflowService } from './workflowService'
await workflowService.runDetection(sessionId)
```

### State Management (Zustand)

Located in `src/store/`:

```javascript
// authStore.js — User auth state
import useAuthStore from './authStore'
const { user, login, logout } = useAuthStore()

// workflowStore.js — Session and workflow state
import useWorkflowStore from './workflowStore'
const { currentSessionId, detections, startSession } = useWorkflowStore()
```

State persists across page navigation automatically.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Framework** | React 18 + Vite |
| **Routing** | React Router v6 |
| **State Management** | Zustand |
| **HTTP Client** | Axios |
| **Styling** | Tailwind CSS |
| **Maps** | React Leaflet (Leaflet.js) |
| **Icons** | Lucide React |

---

## Key Features

* **Session Management** — Create and manage survey sessions
* **Image Upload** — Batch upload of underwater photos
* **Detection Review** — Visualize and correct YOLOv11 bounding boxes
* **Identity Assignment** — Assign detected fish to known individuals or create new
* **Tracking & History** — Timeline, gallery, and map views
* **Pair Matching** — Record co-occurrence relationships

---

## User Workflows

### Upload & Start Session

```javascript
// pages/PhotoUpload.jsx
const handleUpload = async (photos, siteId) => {
  const session = await workflowService.createSession(siteId)
  await apiClient.post('/photo/upload', { session_id: session.id, photos })
}
```

### Review Detections

```javascript
// pages/Detection.jsx
const handleSaveAnnotations = async (bboxes) => {
  await workflowService.saveAnnotations(currentSessionId, bboxes)
  // Move to next step
}
```

### Assign Identities

```javascript
// pages/Identification.jsx
const handleAssignIdentity = async (annotationId, fishId) => {
  await workflowService.assignIdentity(annotationId, fishId)
}
```

---

## Running Scripts

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Lint code (if ESLint configured)
npm run lint
```

---

## Debugging

### Browser DevTools

1. Open Chrome/Firefox DevTools (`F12` or `Cmd+Option+I`)
2. Check **Console** tab for errors
3. Check **Network** tab to see API requests/responses
4. Check **Application** tab for stored auth token

### Zustand DevTools

If debugging state:

```javascript
// Temporarily log state changes
import useWorkflowStore from './store/workflowStore'
useWorkflowStore.subscribe(state => console.log('State:', state))
```

### Common Issues

**"CORS error connecting to backend"**
- Ensure backend is running on `http://localhost:8000`
- Backend CORS must allow `http://localhost:3000`

**"Login page blank"**
- Check browser console for errors
- Verify `.env` has correct `VITE_API_BASE_URL`

**"Uploaded photos not showing"**
- Check Network tab to see if `/photo/upload` succeeded
- Verify backend file storage: `api/uploads/`

**"Zustand state not updating"**
- Clear browser cache (`Cmd+Shift+Delete` or `Ctrl+Shift+Delete`)
- Reload page

---

## Configuration

### Environment Variables

All API endpoints are configurable via `.env`. Update `VITE_*` variables to point to different backend if needed.

### Tailwind CSS

Customize colors and spacing in `tailwind.config.js`:

```javascript
export default {
  theme: {
    extend: {
      colors: {
        primary: '#2f6fed',
      },
    },
  },
}
```

### Vite Config

Build and dev server settings in `vite.config.js`:

```javascript
export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      // Add proxies if needed
    },
  },
})
```

---

## Performance Optimizations

- **Code Splitting:** Routes are lazy-loaded via React Router
- **Image Lazy Loading:** Images offscreen are loaded on-demand
- **State Optimization:** Zustand only re-renders when subscribed state changes
- **API Caching:** Responses cached where appropriate

---

## Component Architecture

### Layout Example

```jsx
// pages/Detection.jsx
export default function Detection() {
  const { detections } = useWorkflowStore()
  
  return (
    <MainLayout>
      {/* Stepper showing current progress */}
      <WorkflowStepper currentStep={2} />
      
      {/* Main content */}
      <div className="space-y-6">
        {detections.map(det => (
          <DetectionCard key={det.id} detection={det} />
        ))}
      </div>
    </MainLayout>
  )
}
```

---

## Testing

Currently there are no unit tests or integration tests in the repository. To add testing:

```bash
# Install testing dependencies
npm install --save-dev vitest react-testing-library

# Create tests in __tests__/ folder
# Run: npm run test
```

---

## Browser Compatibility

| Browser | Version | Status |
| --- | --- | --- |
| Chrome | 90+ | ✓ Fully Supported |
| Firefox | 88+ | ✓ Fully Supported |
| Safari | 14+ | ✓ Fully Supported |
| Edge | 90+ | ✓ Fully Supported |
| Mobile Chrome | Latest | ⚠ Limited (mobile UI not optimized) |

---

## Accessibility

Current state:
- Buttons have proper `aria-labels`
- Forms have associated labels
- Keyboard navigation supported

To improve:
- Add more ARIA attributes
- Test with screen readers
- Improve color contrast ratios

---

## Component Usage Examples

### Button

```jsx
<Button 
  variant="primary" 
  size="lg" 
  onClick={handleClick}
  icon={<ArrowRight />}
>
  Upload Photo
</Button>
```

### Card

```jsx
<Card className="p-6">
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
  <Card.Footer>Actions</Card.Footer>
</Card>
```

### Alert

```jsx
<Alert type="success">
  Photos uploaded successfully!
</Alert>
```

---

## Related Documentation

- **Main README:** [../README.md](../README.md)
- **Backend Setup:** [../api/README.md](../api/README.md)
- **Product Requirements:** [../PRD.md](../PRD.md)

---

## Notes

* UI is optimized for human-in-the-loop workflows
* Designed for researchers familiar with marine biology, not AI
* Mobile responsiveness is partial (desktop-first design)

---
