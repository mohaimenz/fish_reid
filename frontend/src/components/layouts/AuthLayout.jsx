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
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,37,69,0.82)_0%,rgba(19,64,116,0.72)_50%,rgba(15,118,110,0.40)_100%)]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center stagger-in">
          <h1 className="text-3xl font-bold text-white">RabbitFish Tracker</h1>
          <p className="mt-2 text-slate-200">A shared workspace for researchers reviewing reef survey imagery</p>
        </div>
        <div className="stagger-in">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
