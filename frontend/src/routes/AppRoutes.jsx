import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'

// Layouts
import MainLayout from '../components/layouts/MainLayout'
import AuthLayout from '../components/layouts/AuthLayout'

// Public Pages
import LandingPage from '../pages/LandingPage'
import HowItWorks from '../pages/HowItWorks'
import Login from '../pages/Login'
import Register from '../pages/Register'

// Protected Pages
import PhotoUpload from '../pages/PhotoUpload'
import Detection from '../pages/Detection'
import Identification from '../pages/Identification'
import TrackingHistory from '../pages/TrackingHistory'
import SessionManager from '../pages/SessionManager'
import FishManager from '../pages/FishManager'

// Admin Pages
import AdminDashboard from '../pages/AdminDashboard'

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="how-it-works" element={<HowItWorks />} />
      </Route>

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
      </Route>

      {/* Protected Routes */}
      <Route path="/" element={<MainLayout />}>
        <Route
          path="upload"
          element={
            <ProtectedRoute>
              <PhotoUpload />
            </ProtectedRoute>
          }
        />
        <Route
          path="detection"
          element={
            <ProtectedRoute>
              <Detection />
            </ProtectedRoute>
          }
        />
        <Route
          path="identification"
          element={
            <ProtectedRoute>
              <Identification />
            </ProtectedRoute>
          }
        />
        <Route
          path="tracking"
          element={
            <ProtectedRoute>
              <TrackingHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="sessions"
          element={
            <ProtectedRoute>
              <SessionManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="fishes"
          element={
            <ProtectedRoute>
              <FishManager />
            </ProtectedRoute>
          }
        />
        
        {/* Admin Routes */}
        <Route
          path="admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRoutes
