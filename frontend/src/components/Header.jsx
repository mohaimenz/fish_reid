import { Link, useNavigate } from 'react-router-dom'
import { Fish, FolderOpen, LogOut, Shield, User } from 'lucide-react'
import useAuthStore from '../store/authStore'
import authService from '../services/authService'
import Button from './ui/Button'

const Header = () => {
  const { isAuthenticated, user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await authService.logout()
      clearAuth()
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      clearAuth()
      navigate('/login')
    }
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">🐟</span>
            </div>
            <span className="text-xl font-bold text-gray-900">RabbitFish Tracker</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center space-x-4">
            {!isAuthenticated ? (
              <>
                <Link to="/how-it-works" className="text-gray-600 hover:text-gray-900">
                  How It Works
                </Link>
                <Button variant="outline" to="/login">
                  Login
                </Button>
                <Button to="/register">
                  Register
                </Button>
              </>
            ) : (
              <>
                <Link
                  to="/sessions"
                  className="flex items-center space-x-1 text-gray-600 hover:text-primary-600"
                >
                  <FolderOpen size={18} />
                  <span>Sessions</span>
                </Link>
                <Link
                  to="/fishes"
                  className="flex items-center space-x-1 text-gray-600 hover:text-primary-600"
                >
                  <Fish size={18} />
                  <span>Fishes</span>
                </Link>
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="flex items-center space-x-1 text-gray-600 hover:text-primary-600"
                  >
                    <Shield size={18} />
                    <span>Admin</span>
                  </Link>
                )}
                <div className="flex items-center space-x-2 text-gray-700">
                  <User size={18} />
                  <span className="text-sm">{user?.email || user?.name}</span>
                </div>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  icon={<LogOut size={16} />}
                >
                  Logout
                </Button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}

export default Header
