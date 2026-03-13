import Card from '../components/ui/Card'

const AdminDashboard = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold text-slate-900">Project Overview</h1>
        
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.08)]">
            <Card.Body className="text-center">
              <p className="text-sm text-slate-600">Researchers</p>
              <p className="mt-2 text-4xl font-bold text-slate-900">--</p>
            </Card.Body>
          </Card>
          
          <Card className="border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.08)]">
            <Card.Body className="text-center">
              <p className="text-sm text-slate-600">Uploaded Photos</p>
              <p className="mt-2 text-4xl font-bold text-slate-900">--</p>
            </Card.Body>
          </Card>
          
          <Card className="border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.08)]">
            <Card.Body className="text-center">
              <p className="text-sm text-slate-600">Confirmed Fish Records</p>
              <p className="mt-2 text-4xl font-bold text-slate-900">--</p>
            </Card.Body>
          </Card>
        </div>

        <Card className="border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.08)]">
          <Card.Header>
            <h2 className="text-xl font-semibold">Project Controls</h2>
          </Card.Header>
          <Card.Body>
            <p className="text-slate-600">
              Administrative tools and project-level controls will appear here as the platform grows.
            </p>
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}

export default AdminDashboard
