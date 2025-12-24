import Card from '../components/ui/Card'

const HowItWorks = () => {
  const steps = [
    {
      number: 1,
      title: 'Upload Images',
      description: 'Upload underwater images with location metadata (latitude, longitude) and timestamp information.',
      details: [
        'Support for multiple image formats',
        'Interactive map for location selection',
        'Automatic metadata extraction',
      ],
    },
    {
      number: 2,
      title: 'RabbitFish Detection',
      description: 'Our ML model automatically detects RabbitFish instances in your images with confidence scores.',
      details: [
        'State-of-the-art object detection',
        'Bounding box visualization',
        'Human-in-the-loop verification',
      ],
    },
    {
      number: 3,
      title: 'Individual Identification',
      description: 'Visual re-identification matches detected fish with historical observations.',
      details: [
        'Visual similarity matching',
        'Top-3 match suggestions',
        'Confidence-based ranking',
      ],
    },
    {
      number: 4,
      title: 'Track History',
      description: 'Visualize spatiotemporal patterns and historical sightings of individual fish.',
      details: [
        'Interactive map visualization',
        'Chronological timeline',
        'Photo gallery of sightings',
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h1>
          <p className="text-lg text-gray-600">
            A step-by-step guide to tracking RabbitFish using ML
          </p>
        </div>

        <div className="space-y-8">
          {steps.map((step) => (
            <Card key={step.number} className="overflow-hidden">
              <div className="flex items-start p-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
                    {step.number}
                  </div>
                </div>
                <div className="ml-6 flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 mb-4">{step.description}</p>
                  <ul className="space-y-2">
                    {step.details.map((detail, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-700">
                        <svg
                          className="w-4 h-4 text-green-500 mr-2"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default HowItWorks
