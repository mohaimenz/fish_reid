import { Outlet } from 'react-router-dom'

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-700">RabbitFish Tracker</h1>
          <p className="text-gray-600 mt-2">ML-based Fish Detection & Tracking</p>
        </div>
        <Outlet />
      </div>
    </div>
  )
}

export default AuthLayout
