import { Check, Eye, Fish, Layers, MapIcon } from 'lucide-react'
import Card from '../components/ui/Card'

const HowItWorks = () => {
  const steps = [
    {
      number: 1,
      icon: Fish,
      title: 'Set up a survey',
      description: 'Bring in your reef photos, connect them to a survey, and anchor the work to place and time.',
      details: [
        'Upload a full batch from one field visit',
        'Keep site coordinates and observation time together',
        'Return to the same survey later without losing progress',
      ],
    },
    {
      number: 2,
      icon: Layers,
      title: 'Review detections',
      description: 'Start with model suggestions, then clean them up so the survey reflects what you actually see.',
      details: [
        'Suggested boxes can be kept, removed, or redrawn',
        'Manual drawing helps when the model misses a fish',
        'Confirmed annotations carry forward into identity review',
      ],
    },
    {
      number: 3,
      icon: Eye,
      title: 'Confirm identities',
      description: 'Compare each fish against existing records and decide whether it is familiar or newly observed.',
      details: [
        'See the strongest match suggestions first',
        'Accept a match or create a new fish record',
        'Refresh suggestions when the reference gallery changes',
      ],
    },
    {
      number: 4,
      icon: MapIcon,
      title: 'Follow the history',
      description: 'Move from one survey to the bigger picture with maps, timelines, photos, and pair history.',
      details: [
        'Map sightings across reefs and return visits',
        'Review dates, locations, and confidence side by side',
        'Use the image gallery as a visual record for each fish',
      ],
    },
  ]

  return (
    <div className="page-shell">
      <div className="page-container">
        <div className="mb-8 max-w-3xl">
          <h1 className="page-title">How researchers use it</h1>
          <p className="page-subtitle">
            A practical review flow for turning reef survey photos into reliable fish histories.
          </p>
        </div>

        <div className="space-y-4">
          {steps.map((step) => (
            <Card key={step.number} className="stagger-in border-slate-200 bg-white">
              <Card.Body className="grid gap-4 md:grid-cols-[auto_1fr] md:items-start">
                <div className="flex items-center gap-3">
                  <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${step.number % 2 === 0 ? 'bg-teal-100 text-teal-700' : 'bg-primary-100 text-primary-700'}`}>
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-full bg-primary-500 px-3 text-sm font-bold text-white">
                    {step.number}
                  </div>
                </div>
                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-slate-900">{step.title}</h2>
                  <p className="text-sm text-slate-600 md:text-base">{step.description}</p>
                  <ul className="space-y-2">
                    {step.details.map((detail) => (
                      <li key={detail} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="mt-0.5 inline-flex rounded-full bg-teal-100 p-0.5 text-teal-700">
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
