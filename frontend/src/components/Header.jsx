import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Fish, FolderOpen, LogOut, Shield, User } from 'lucide-react'
import useAuthStore from '../store/authStore'
import authService from '../services/authService'
import Button from './ui/Button'

const navItemClass = ({ isActive }) =>
  `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition-colors ${
    isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`

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
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-700 text-white shadow-sm">
              <Fish size={18} />
            </div>
            <span className="text-lg font-bold text-slate-900">RabbitFish Tracker</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center space-x-4">
            {!isAuthenticated ? (
              <>
                <NavLink to="/how-it-works" className={navItemClass}>
                  How It Works
                </NavLink>
                <Button variant="outline" to="/login">
                  Login
                </Button>
                <Button to="/register">
                  Register
                </Button>
              </>
            ) : (
              <>
                <NavLink
                  to="/sessions"
                  className={navItemClass}
                >
                  <FolderOpen size={18} />
                  <span>Sessions</span>
                </NavLink>
                <NavLink
                  to="/fishes"
                  className={navItemClass}
                >
                  <Fish size={18} />
                  <span>Fishes</span>
                </NavLink>
                {user?.role === 'admin' && (
                  <NavLink
                    to="/admin"
                    className={navItemClass}
                  >
                    <Shield size={18} />
                    <span>Admin</span>
                  </NavLink>
                )}
                <div className="hidden items-center space-x-2 text-slate-700 md:flex">
                  <User size={17} />
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
