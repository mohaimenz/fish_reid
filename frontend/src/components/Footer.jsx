import { Link } from 'react-router-dom'
import { BookOpen, Eye, Fish, FolderOpen, Layers, MapIcon } from 'lucide-react'

const Footer = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
  const apiDocsUrl = `${apiBaseUrl.replace(/\/+$/, '')}/docs`
  const currentYear = new Date().getFullYear()

  const footerSections = [
    {
      title: 'Explore',
      links: [
        { label: 'Overview', to: '/' },
        { label: 'For Researchers', to: '/how-it-works' },
        { label: 'Sign In', to: '/login' },
        { label: 'Join the Project', to: '/register' },
      ],
    },
    {
      title: 'Research Flow',
      links: [
        { label: 'Start a Survey', to: '/upload', icon: FolderOpen },
        { label: 'Review Detections', to: '/detection', icon: Layers },
        { label: 'Confirm Identities', to: '/identification', icon: Eye },
        { label: 'Sighting History', to: '/tracking', icon: MapIcon },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Fish Records', to: '/fishes', icon: Fish },
        { label: 'API Docs', href: apiDocsUrl, icon: BookOpen },
      ],
    },
  ]

  return (
    <footer className="border-t border-white/10 bg-primary-900 text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_1.8fr] lg:px-8">
        <div className="max-w-md space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-[0_10px_24px_rgba(20,184,166,0.28)]">
              <Fish size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">
                RabbitFish Tracker
              </p>
              <h2 className="text-xl font-bold text-white">Built for careful reef survey work</h2>
            </div>
          </div>
          <p className="text-sm leading-6 text-slate-300">
            A research workspace for turning reef survey photos into reviewed detections,
            confirmed identities, pair notes, and long-term sighting histories.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          {footerSections.map((section) => (
            <div key={section.title} className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                {section.title}
              </h3>
              <div className="space-y-2.5">
                {section.links.map((link) => {
                  const Icon = link.icon
                  const content = (
                    <span className="inline-flex items-center gap-2 text-sm text-slate-300 transition-colors hover:text-white">
                      {Icon ? <Icon size={15} className="text-teal-400" /> : null}
                      {link.label}
                    </span>
                  )

                  if (link.href) {
                    return (
                      <a
                        key={link.label}
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="block"
                      >
                        {content}
                      </a>
                    )
                  }

                  return (
                    <Link key={link.label} to={link.to} className="block">
                      {content}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-4 text-sm text-slate-400 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>{currentYear} RabbitFish Tracker. Research interface for reef surveys.</p>
          <p>Organize surveys, review detections, confirm identities, and follow fish over time.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
