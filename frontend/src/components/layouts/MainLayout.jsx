import { Outlet } from 'react-router-dom'
import Header from '../Header'

const MainLayout = () => {
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
