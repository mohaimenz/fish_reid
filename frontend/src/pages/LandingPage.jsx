import { useNavigate } from 'react-router-dom'
import { ArrowRight, Fish, Layers, Eye, MapIcon } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

const LandingPage = () => {
  const navigate = useNavigate()

  const features = [
    {
      icon: <Fish className="w-8 h-8 text-primary-600" />,
      title: 'Upload Images',
      description: 'Upload underwater images with location and time metadata',
    },
    {
      icon: <Layers className="w-8 h-8 text-primary-600" />,
      title: 'ML Detection',
      description: 'Automatically detect RabbitFish instances using machine learning',
    },
    {
      icon: <Eye className="w-8 h-8 text-primary-600" />,
      title: 'Fish Re-Identification',
      description: 'Identify individual fish through visual similarity matching',
    },
    {
      icon: <MapIcon className="w-8 h-8 text-primary-600" />,
      title: 'Track History',
      description: 'Visualize historical sightings across time and geography',
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold mb-6">RabbitFish Tracker</h1>
          <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
            Advanced ML-based system for detecting, identifying, and tracking RabbitFish
            across underwater environments
          </p>
          <div className="flex justify-center space-x-4">
            <Button
              size="lg"
              variant="primary"
              onClick={() => navigate('/upload')}
              icon={<ArrowRight size={20} />}
              className="bg-white text-blue-700 hover:bg-blue-50"
            >
              Start Tracker
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/register')}
              className="border-white text-white hover:bg-blue-700"
            >
              Register
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <Card.Body className="py-8">
                  <div className="flex justify-center mb-4">{feature.icon}</div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </Card.Body>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4 text-gray-900">
            Ready to Start Tracking?
          </h2>
          <p className="text-gray-600 mb-8">
            Join marine biologists and researchers using AI-powered fish tracking
          </p>
          <Button size="lg" to="/register">
            Get Started
          </Button>
        </div>
      </section>
    </div>
  )
}

export default LandingPage
