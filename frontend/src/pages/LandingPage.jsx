import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Eye,
  Fish,
  FolderOpen,
  Layers,
  MapIcon,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import rabbitfishBanner from '../photos/rabbitfish-banner.jpg'

const LandingPage = () => {
  const navigate = useNavigate()

  const workflowSteps = [
    {
      icon: FolderOpen,
      title: '1. Start a survey',
      description:
        'Group reef photos into one survey so the review can continue over time instead of starting from scratch.',
    },
    {
      icon: Layers,
      title: '2. Review detections',
      description:
        'Begin with model suggestions, then keep, remove, or redraw boxes before moving on to identity review.',
    },
    {
      icon: Eye,
      title: '3. Confirm identities',
      description:
        'Compare each fish with the record, accept a likely match, or create a new individual when needed.',
    },
    {
      icon: Workflow,
      title: '4. Record pairings',
      description:
        'Note observed partners for the current survey and keep that relationship available for later review.',
    },
    {
      icon: MapIcon,
      title: '5. Follow the history',
      description:
        'Use the map, timeline, and photo record to understand where a fish has appeared over time.',
    },
  ]

  const platformHighlights = [
    {
      title: 'A living fish record',
      description: 'Each confirmed identity becomes part of a record you can revisit in future surveys.',
    },
    {
      title: 'Researcher-led review',
      description: 'The platform helps with suggestions, but the final call on detections and identities stays with the researcher.',
    },
    {
      title: 'Grounded in survey sites',
      description: 'Each survey can be tied to a named site so observations stay connected to place.',
    },
  ]

  const platformStats = [
    { label: 'Research Flow', value: 'Survey to sighting history' },
    { label: 'Match Suggestions', value: 'Top 3 records' },
    { label: 'Review Style', value: 'Researcher guided' },
    { label: 'History Views', value: 'Map + timeline + gallery' },
  ]

  return (
    <div className="page-shell overflow-hidden pt-10 md:pt-14">
      <div className="page-container space-y-12">
        <section>
          <Card className="relative min-h-[34rem] overflow-hidden border-slate-200 shadow-[0_14px_32px_rgba(15,23,42,0.10)]">
            <img
              src={rabbitfishBanner}
              alt="Rabbitfish in reef habitat"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,37,69,0.62)_0%,rgba(19,64,116,0.46)_38%,rgba(15,118,110,0.16)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(221,248,244,0.10),transparent_26%)]" />

            <Card.Body className="relative z-10 flex h-full flex-col justify-end p-8 md:p-10 lg:p-12">
              <div className="max-w-3xl">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                  <Sparkles size={14} />
                  Built for reef survey teams
                </div>

                <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight text-white md:text-5xl">
                  Turn reef survey photos into fish histories you can trust
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-100 md:text-base">
                  RabbitFish Tracker helps researchers organize survey photos, review detections,
                  confirm who is who, record observed pairs, and follow individual fish across
                  repeated visits to the reef.
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {['Upload', 'Detect', 'Identify', 'Pair', 'Track'].map((label) => (
                    <span
                      key={label}
                      className="rounded-full border border-white/20 bg-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white"
                    >
                      {label}
                    </span>
                  ))}
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Button
                    size="lg"
                    variant="primary"
                    onClick={() => navigate('/upload')}
                    icon={<ArrowRight size={18} />}
                    className="shadow-[0_10px_24px_rgba(47,111,237,0.28)]"
                  >
                    Start a Survey
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate('/how-it-works')}
                    className="border-white/25 bg-white/10 text-white hover:border-white/35 hover:bg-white/16"
                  >
                    See the Research Flow
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="stagger-in border-slate-200/80 bg-white/95">
            <Card.Header className="border-slate-200/70">
              <h2 className="text-xl font-bold text-slate-900">At a glance</h2>
            </Card.Header>
            <Card.Body className="grid gap-3 sm:grid-cols-2">
              {platformStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200/85 bg-slate-50/80 px-4 py-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-1 text-base font-bold text-slate-900">{item.value}</p>
                </div>
              ))}
            </Card.Body>
          </Card>

          <Card className="stagger-in overflow-hidden border-primary-200 bg-primary-100/90 shadow-[0_6px_18px_rgba(15,23,42,0.08)]">
            <Card.Body className="flex h-full flex-col justify-center space-y-4 p-6">
              <div className="inline-flex rounded-2xl bg-primary-700 p-3 text-white">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-950">Designed for careful review</h2>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Model suggestions help move the work along, but fish records only become part of
                  the long-term history after a researcher has confirmed them.
                </p>
              </div>
            </Card.Body>
          </Card>
        </section>

        <section>
          <div className="mb-5 max-w-3xl">
            <h2 className="page-title text-2xl">Research flow at a glance</h2>
            <p className="page-subtitle">
              The platform follows the same sequence many reef teams already use: survey setup,
              review, identification, pairing, and long-term follow-up.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {workflowSteps.map((step) => {
              const Icon = step.icon
              return (
                <Card key={step.title} className="stagger-in h-full">
                  <Card.Body className="flex h-full flex-col gap-4">
                    <div className={`inline-flex w-fit rounded-2xl p-3 ${step.icon === Eye || step.icon === Workflow ? 'bg-teal-100 text-teal-700' : 'bg-primary-100 text-primary-700'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
                      <p className="text-sm leading-6 text-slate-600">{step.description}</p>
                    </div>
                  </Card.Body>
                </Card>
              )
            })}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="overflow-hidden border-slate-200/85">
            <Card.Body className="space-y-5 p-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">
                <Fish size={14} />
                What Researchers Get
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">A research workflow that preserves continuity across surveys</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Instead of treating every photo batch as a separate task, the platform keeps
                  surveys, sites, fish records, and review decisions connected. That makes later
                  comparisons easier to revisit and easier to defend.
                </p>
              </div>
              <div className="rounded-2xl border border-coral-100 bg-coral-100/70 px-4 py-4 text-sm leading-6 text-slate-800">
                Best for teams that want model assistance without losing transparent researcher review.
              </div>
            </Card.Body>
          </Card>

          <div className="grid gap-4">
            {platformHighlights.map((item) => (
              <Card key={item.title} className="stagger-in">
                <Card.Body className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                  <p className="text-sm leading-6 text-slate-600">{item.description}</p>
                </Card.Body>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <Card className="overflow-hidden border-slate-200 bg-[linear-gradient(135deg,#0b2545_0%,#134074_55%,#0f766e_100%)] text-white shadow-[0_14px_32px_rgba(15,23,42,0.10)]">
            <Card.Body className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-8">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-bold text-white">Ready for the next reef survey?</h2>
                <p className="mt-2 text-sm leading-6 text-slate-200">
                  Create an account or sign in to begin a survey, upload field photos, and review
                  detections and identities with your team.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" variant="light" to="/register">
                  Join the Project
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
