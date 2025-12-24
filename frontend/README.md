# RabbitFish Tracker - Frontend

A React-based web application for ML-powered RabbitFish detection, identification, and tracking.

## Features

- 🔐 **JWT Authentication** - Secure user registration and login
- 📷 **Photo Upload** - Multi-image upload with location metadata
- 🤖 **ML Detection** - Automated RabbitFish detection with bounding boxes
- 🐟 **Fish Re-Identification** - Visual similarity matching
- 🗺️ **Tracking History** - Spatiotemporal visualization of sightings
- 👨‍💼 **Admin Dashboard** - Role-based access control

## Tech Stack

- **Framework:** React 18
- **Routing:** React Router v6
- **State Management:** Zustand
- **HTTP Client:** Axios
- **Styling:** TailwindCSS
- **Maps:** Leaflet + OpenStreetMap
- **Icons:** Lucide React
- **Build Tool:** Vite

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Backend API running (see API configuration below)

### Installation

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Create environment file:

```bash
cp .env.example .env
```

4. Update `.env` with your API configuration:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

5. Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── layouts/        # Layout components
│   │   ├── ui/             # Base UI components (Button, Input, Card, etc.)
│   │   ├── Header.jsx      # Application header
│   │   └── WorkflowStepper.jsx
│   ├── pages/              # Page components
│   │   ├── LandingPage.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── PhotoUpload.jsx
│   │   ├── Detection.jsx
│   │   ├── Identification.jsx
│   │   ├── TrackingHistory.jsx
│   │   └── AdminDashboard.jsx
│   ├── routes/             # Route configuration
│   │   ├── AppRoutes.jsx
│   │   └── ProtectedRoute.jsx
│   ├── services/           # API services
│   │   ├── apiClient.js
│   │   ├── authService.js
│   │   └── workflowService.js
│   ├── store/              # Zustand stores
│   │   ├── authStore.js
│   │   └── workflowStore.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── .env.example
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## API Configuration

The application expects the following backend endpoints:

| Method | Endpoint            | Purpose           |
| ------ | ------------------- | ----------------- |
| POST   | /auth/register      | Register new user |
| POST   | /auth/login         | Authenticate user |
| POST   | /auth/logout        | Logout            |
| GET    | /auth/me            | Get user info     |
| POST   | /upload             | Upload images     |
| POST   | /detect             | Run detection     |
| POST   | /identify           | Re-identification |
| GET    | /tracking/{fish_id} | Tracking history  |

Update the endpoint paths in `.env` if your backend uses different routes.

## User Workflow

1. **Landing Page** → Register/Login
2. **Photo Upload** → Upload images + location metadata
3. **Detection** → Review ML-detected RabbitFish
4. **Identification** → Match with existing fish
5. **Tracking History** → Visualize historical sightings

## Authentication

JWT tokens are stored in `localStorage` and automatically attached to API requests. Sessions expire based on backend configuration, redirecting users to login.

## Customization

### Styling

Modify TailwindCSS configuration in `tailwind.config.js` to customize colors, spacing, etc.

### API Endpoints

Update `.env` file with your backend API URLs.

### Components

All UI components are in `src/components/ui/` and can be customized or extended.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT
