import { useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, Fish, Layers, MapIcon, ShieldCheck, Sparkles } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

const LandingPage = () => {
  const navigate = useNavigate()

  const features = [
    {
      icon: Fish,
      title: 'Upload Images',
      description: 'Upload underwater images with geotag/time metadata for each survey event.',
    },
    {
      icon: Layers,
      title: 'ML Detection',
      description: 'Detect rabbitfish instances automatically with editable annotations.',
    },
    {
      icon: Eye,
      title: 'Fish Re-Identification',
      description: 'Match detections against known identities with confidence-ranked results.',
    },
    {
      icon: MapIcon,
      title: 'Track History',
      description: 'Review movement patterns through map, timeline, and gallery views.',
    },
  ]

  const workflowStats = [
    { label: 'Workflow Stages', value: '3' },
    { label: 'Identity Suggestions', value: 'Top 3' },
    { label: 'Tracking Views', value: 'Map + Timeline + Gallery' },
  ]

  return (
    <div className="page-shell pt-10 md:pt-14">
      <div className="page-container space-y-10">
        <section className="grid items-stretch gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="overflow-hidden bg-slate-900 text-white shadow-[0_16px_28px_rgba(15,23,42,0.24)]">
            <Card.Body className="p-8 md:p-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200">
                <Sparkles size={14} />
                Marine Intelligence Platform
              </div>
              <h1 className="mt-5 text-4xl font-bold leading-tight text-white md:text-5xl">
                Professional RabbitFish Tracking for Research Teams
              </h1>
              <p className="mt-4 max-w-2xl text-sm text-slate-300 md:text-base">
                Build longitudinal fish histories from field imagery through a streamlined workflow:
                upload, detect, identify, then inspect movement over time.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  variant="light"
                  onClick={() => navigate('/upload')}
                  icon={<ArrowRight size={18} />}
                >
                  Start Workflow
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => navigate('/how-it-works')}
                >
                  How It Works
                </Button>
              </div>
            </Card.Body>
          </Card>

          <Card className="stagger-in">
            <Card.Header className="border-slate-200/70">
              <h2 className="text-xl font-bold text-slate-900">Platform Snapshot</h2>
            </Card.Header>
            <Card.Body className="space-y-4">
              {workflowStats.map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-200/85 bg-slate-50/75 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{item.value}</p>
                </div>
              ))}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/85 px-4 py-3 text-sm text-emerald-800">
                Designed for operator-in-the-loop verification before final identity assignment.
              </div>
              <div className="rounded-xl border border-slate-200/85 bg-white px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-primary-100 p-2 text-primary-700">
                    <ShieldCheck size={16} />
                  </div>
                  <p className="text-sm text-slate-700">
                    Session history and fish registry are persistent, so data remains explorable across surveys.
                  </p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </section>

        <section>
          <div className="mb-5">
            <h2 className="page-title text-2xl">Core Capabilities</h2>
            <p className="page-subtitle">Everything needed to move from field images to identity tracking.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <Card key={feature.title} className="stagger-in">
                  <Card.Body className="space-y-3">
                    <div className="inline-flex rounded-xl bg-primary-100 p-2.5 text-primary-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{feature.title}</h3>
                    <p className="text-sm text-slate-600">{feature.description}</p>
                  </Card.Body>
                </Card>
              )
            })}
          </div>
        </section>

        <section>
          <Card className="overflow-hidden">
            <Card.Body className="flex flex-col gap-4 bg-slate-900 p-6 text-slate-100 md:flex-row md:items-center md:justify-between md:p-8">
              <div>
                <h2 className="text-2xl font-bold text-white">Ready to build your fish identity catalog?</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Create an account and start processing your first survey session.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" variant="light" to="/register">
                  Create Account
                </Button>
                <Button size="lg" variant="secondary" to="/login">
                  Sign In
                </Button>
              </div>
            </Card.Body>
          </Card>
        </section>
      </div>
    </div>
  )
}

export default LandingPage
