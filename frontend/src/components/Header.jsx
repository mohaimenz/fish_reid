import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Fish, FolderOpen, LogOut, Shield, User } from 'lucide-react'
import useAuthStore from '../store/authStore'
import authService from '../services/authService'
import Button from './ui/Button'

const navItemClass = ({ isActive }) =>
  `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition-colors ${
    isActive ? 'bg-teal-500/16 text-white' : 'text-slate-100 hover:bg-white/10 hover:text-white'
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
    <header className="sticky top-0 z-40 border-b border-white/10 bg-primary-900 text-white backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500 text-white shadow-[0_8px_18px_rgba(20,184,166,0.28)]">
              <Fish size={18} />
            </div>
            <span className="text-lg font-bold text-white">RabbitFish Tracker</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center space-x-4">
            {!isAuthenticated ? (
              <>
                <NavLink to="/how-it-works" className={navItemClass}>
                  For Researchers
                </NavLink>
                <Button
                  variant="outline"
                  to="/login"
                  className="border-white bg-white text-primary-900 hover:border-slate-100 hover:bg-slate-100"
                >
                  Sign In
                </Button>
                <Button
                  to="/register"
                  className="border-primary-500 bg-primary-500 hover:border-primary-700 hover:bg-primary-700"
                >
                  Join the Project
                </Button>
              </>
            ) : (
              <>
                <NavLink
                  to="/sessions"
                  className={navItemClass}
                >
                  <FolderOpen size={18} />
                  <span>Surveys</span>
                </NavLink>
                <NavLink
                  to="/fishes"
                  className={navItemClass}
                >
                  <Fish size={18} />
                  <span>Fish Records</span>
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
                <div className="hidden items-center space-x-2 text-slate-100 md:flex">
                  <User size={17} />
                  <span className="text-sm">{user?.email || user?.name}</span>
                </div>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  icon={<LogOut size={16} />}
                  className="border-white bg-white text-primary-900 hover:border-slate-100 hover:bg-slate-100"
                >
                  Sign Out
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
