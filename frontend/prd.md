# 📘 Frontend Product Requirements Document (PRD)

## RabbitFish Tracker — React Application

---

## 1. Product Overview

**Product Name:** RabbitFish Tracker

**Purpose:**
A secure, web-based application that allows authenticated users to upload underwater images, detect RabbitFish instances using machine learning models, identify individual fish via visual re-identification, and track historical sightings over time and geography.

**Access Model:**
🔐 Authenticated users only (except landing and informational pages).

---

## 2. Target Users

* Marine biologists & conservation researchers
* Environmental monitoring teams
* Field data collectors
* Research coordinators & administrators

---

## 3. User Roles & Access Control

### 3.1 User Roles (v1)

| Role      | Capabilities                                                         |
| --------- | -------------------------------------------------------------------- |
| **User**  | Upload images, run detection & identification, view tracking history |
| **Admin** | All user capabilities + administrative visibility                    |

> Role-based UI differences are minimal in v1 (Admin menu visible only if role = admin).

---

## 4. Authentication & Authorization

### 4.1 Authentication Flow (Updated)

Unauthenticated User
→ Landing Page
→ Login **or** Register
→ Authenticated Session
→ RabbitFish Tracker Workflow

---

## 4.2 Registration Screen

### Purpose

Allow new users to create an account to access the RabbitFish Tracker.

### UI Components

* **Full Name** input
* **Email** input
* **Password** input
* Register button
* Error / validation message area
* Link to Login page (“Already have an account?”)

### Functional Requirements

* Client-side validation:

  * Full name is required
  * Valid email format
  * Password minimum length (configurable, e.g. ≥ 8 characters)
* Secure submission of registration data
* Display backend validation errors (e.g. email already exists)
* On successful registration:

  * Automatically log the user in **or**
  * Redirect to Login page (backend-configurable)
* Passwords must never be stored or logged on the frontend

---

## 4.3 Login Screen

### Purpose

Authenticate existing users before allowing access to the tracker.

### UI Components

* Email input
* Password input
* Login button
* Error message display
* Link to Registration page (“Create an account”)

### Functional Requirements

* Client-side validation
* Secure credential submission
* Display authentication errors
* Store session token securely (HTTP-only cookie or memory)

---

## 4.4 Logout

**Location:**
Top-right header

**Behaviour**

* Invalidate backend session
* Clear frontend state
* Redirect to Login or Landing page

---

## 4.5 Authorization Rules

| Page             | Auth Required |
| ---------------- | ------------- |
| Landing Page     | ❌             |
| How It Works     | ❌             |
| Login            | ❌             |
| Register         | ❌             |
| Photo Upload     | ✅             |
| Detection        | ✅             |
| Identification   | ✅             |
| Tracking History | ✅             |
| Admin Menu       | ✅ Admin only  |

Frontend route guards must enforce access rules.

---

## 5. High-Level User Flow

Landing Page
→ Login **or** Register
→ Photo Upload
→ RabbitFish Detection
→ RabbitFish Identification
→ Tracking History

* Session expiry redirects user to Login
* Workflow progress is session-scoped

---

## 6. Frontend Architecture

### 6.1 Technology Stack

* **Framework:** React 18+
* **Routing:** React Router (protected routes)
* **State Management:** Redux Toolkit or Zustand
* **HTTP Client:** Axios (with interceptors)
* **UI Framework:** MUI / Chakra UI / custom components
* **Maps:** Leaflet + OpenStreetMap
* **Image Overlays:** Canvas / SVG

---

## 7. Global UI Components

### Header (Authenticated)

* Application logo & name
* Admin menu (role-based)
* Logout button

### Header (Unauthenticated)

* Application logo
* Login
* Register

### Left-side Stepper

* Photo Upload
* Detection
* Identification
* Tracking
* Current step highlighted, completed steps marked

---

## 8. Core Screens & Functional Requirements

---

### 8.1 Landing Page

**Purpose**

* Introduce RabbitFish Tracker
* Provide entry points to Login and Registration

**Key Elements**

* Hero image
* Product title & description
* CTA: **Start Tracker**
* Secondary CTA: **Register**

---

### 8.2 How It Works

**Purpose**
Explain the ML-based workflow to users.

**Steps**

1. Upload Images
2. RabbitFish Detection
3. RabbitFish Identification
4. Track History

Static, informational content only.

---

### 8.3 Photo Upload Screen

**Purpose**
Collect images and associated metadata.

**UI Components**

* Multi-image uploader
* Thumbnail previews with delete option
* Latitude & Longitude fields
* Date/time picker
* Interactive map (search + pin)
* CTA: **Go to Detection**

**Functional Requirements**

* Validate at least one image
* Metadata sync with map
* Images and metadata stored in local state
* Submission triggers detection API

---

### 8.4 RabbitFish Detection Screen

**Purpose**
Allow users to verify ML-detected RabbitFish instances.

**UI Components**

* Main image with bounding boxes
* Confidence scores
* Delete false positives
* Thumbnail image selector
* CTA: **Go to Identification**

**Functional Requirements**

* Bounding boxes rendered via canvas/SVG
* User-approved detections persisted
* Prevent continuation with zero detections

---

### 8.5 RabbitFish Identification Screen

**Purpose**
Re-identify individual RabbitFish using visual similarity.

**UI Components**

* Primary detected fish image
* Top-3 match cards with confidence scores
* Selected match indicator
* Sidebar detected fish gallery
* CTA: **See Tracking History**

**Functional Requirements**

* User selects or confirms match
* Selected identity stored for tracking
* Clear confidence visualization

---

### 8.6 Tracking History Screen

**Purpose**
Visualise historical observations of a RabbitFish.

**UI Components**

* Interactive map with markers
* Selected RabbitFish ID
* Detected fish image panel
* Buttons:

  * Timeline
  * Pair History
  * Photo Gallery

**Functional Requirements**

* Marker clustering
* Marker-image synchronization
* Chronological timeline view
* Scalable to large datasets

---

## 9. State Management

### Key State Objects

* Authentication state (user, role, session)
* Uploaded images & metadata
* Detection results
* Identification selections
* Tracking history data

### Persistence

* In-memory for active session
* Backend as source of truth post-submission

---

## 10. API Integration (Frontend Perspective)

### Expected Endpoints

| Method | Endpoint            | Purpose           |
| ------ | ------------------- | ----------------- |
| POST   | /auth/register      | Register new user |
| POST   | /auth/login         | Authenticate user |
| POST   | /auth/logout        | Logout            |
| GET    | /auth/me            | User info         |
| POST   | /upload             | Upload images     |
| POST   | /detect             | Run detection     |
| POST   | /identify           | Re-identification |
| GET    | /tracking/{fish_id} | Tracking history  |

---

## 11. Security Requirements

* No credentials stored in localStorage
* Prefer HTTP-only cookies
* Passwords handled only via secure forms
* Auto-logout on token expiry
* Clear ML session data on logout
* Route-level access protection

---

## 12. Non-Functional Requirements

* High UI responsiveness
* Clear ML confidence communication
* Accessibility-compliant design
* Desktop-first, tablet-compatible
* Species-agnostic extensibility

---

## 13. Out of Scope (v1)

* Email verification
* Password reset & MFA
* OAuth / SSO
* Video-based tracking
* Offline mode

---

## 14. Summary

This PRD defines a secure, scalable React frontend that integrates:

* User registration and authentication
* ML-based detection and identification
* Human-in-the-loop validation
* Spatiotemporal tracking visualisation

Designed for research-grade reliability and future extensibility.
