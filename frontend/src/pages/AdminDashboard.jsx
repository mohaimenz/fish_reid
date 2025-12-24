import Card from '../components/ui/Card'

const AdminDashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <Card.Body className="text-center">
              <p className="text-gray-600 text-sm">Total Users</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">--</p>
            </Card.Body>
          </Card>
          
          <Card>
            <Card.Body className="text-center">
              <p className="text-gray-600 text-sm">Total Uploads</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">--</p>
            </Card.Body>
          </Card>
          
          <Card>
            <Card.Body className="text-center">
              <p className="text-gray-600 text-sm">Identified Fish</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">--</p>
            </Card.Body>
          </Card>
        </div>

        <Card>
          <Card.Header>
            <h2 className="text-xl font-semibold">Admin Panel</h2>
          </Card.Header>
          <Card.Body>
            <p className="text-gray-600">
              Administrative features and controls will be implemented here.
            </p>
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}

export default AdminDashboard
