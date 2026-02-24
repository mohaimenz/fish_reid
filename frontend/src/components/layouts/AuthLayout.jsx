import { Outlet } from 'react-router-dom'

const AuthLayout = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 stagger-in">
          <h1 className="text-3xl font-bold text-primary-700">RabbitFish Tracker</h1>
          <p className="mt-2 text-slate-600">Marine Identification and Tracking Platform</p>
        </div>
        <div className="stagger-in">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
