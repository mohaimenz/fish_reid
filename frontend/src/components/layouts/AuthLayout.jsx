import { Outlet } from 'react-router-dom'
import rabbitfishBanner from '../../photos/rabbitfish-banner.jpg'

const AuthLayout = () => {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 sm:p-6">
      <img
        src={rabbitfishBanner}
        alt="Rabbitfish background"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-900/60 to-slate-950/75" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center stagger-in">
          <h1 className="text-3xl font-bold text-white">RabbitFish Tracker</h1>
          <p className="mt-2 text-slate-200">Marine Identification and Tracking Platform</p>
        </div>
        <div className="stagger-in">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
