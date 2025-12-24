import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute
