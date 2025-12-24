import { Outlet } from 'react-router-dom'
import Header from '../Header'
import useAuthStore from '../../store/authStore'

const MainLayout = () => {
  const { isAuthenticated } = useAuthStore()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}

export default MainLayout
