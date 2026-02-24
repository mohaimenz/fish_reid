import { Check, Eye, Fish, Layers, MapIcon } from 'lucide-react'
import Card from '../components/ui/Card'

const HowItWorks = () => {
  const steps = [
    {
      number: 1,
      icon: Fish,
      title: 'Upload Images',
      description: 'Upload underwater photos and attach survey metadata for location and timestamp context.',
      details: [
        'Supports batch uploads for field sessions',
        'Captures latitude/longitude and observation time',
        'Stores each upload under a reusable session',
      ],
    },
    {
      number: 2,
      icon: Layers,
      title: 'RabbitFish Detection',
      description: 'Run detector-assisted annotation to define the fish instances you want to identify.',
      details: [
        'ML-generated boxes can be reviewed and corrected',
        'Manual drawing mode supports edge cases',
        'Saved annotations become identification queries',
      ],
    },
    {
      number: 3,
      icon: Eye,
      title: 'Individual Identification',
      description: 'Compare each detection against fish identities in the gallery and review top candidate matches.',
      details: [
        'Top-3 suggestions ranked by match quality',
        'User confirms with Assign Positive or Create New Identity',
        'Re-Calculate Matches refreshes suggestions after gallery changes',
      ],
    },
    {
      number: 4,
      icon: MapIcon,
      title: 'Track History',
      description: 'Inspect each identified fish across timeline, gallery, and directed movement map.',
      details: [
        'Map lines connect sightings from earlier to later observations',
        'Timeline captures date and confidence context',
        'Gallery provides visual history for each identity',
      ],
    },
  ]

  return (
    <div className="page-shell">
      <div className="page-container">
        <div className="mb-8 max-w-3xl">
          <h1 className="page-title">How It Works</h1>
          <p className="page-subtitle">
            End-to-end workflow from image upload to long-term fish tracking.
          </p>
        </div>

        <div className="space-y-4">
          {steps.map((step) => (
            <Card key={step.number} className="stagger-in">
              <Card.Body className="grid gap-4 md:grid-cols-[auto_1fr] md:items-start">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-full bg-primary-600 px-3 text-sm font-bold text-white">
                    {step.number}
                  </div>
                </div>
                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-slate-900">{step.title}</h2>
                  <p className="text-sm text-slate-600 md:text-base">{step.description}</p>
                  <ul className="space-y-2">
                    {step.details.map((detail) => (
                      <li key={detail} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="mt-0.5 inline-flex rounded-full bg-emerald-100 p-0.5 text-emerald-700">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default HowItWorks
