"use client"
export default function About(){
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-3">About Us</h1>
      <p className="text-gray-700 mb-4">
        We’re a modern Indian restaurant embracing QR ordering to deliver fast, secure service.
        Our kitchen crafts classics with care — and our tech keeps your experience smooth.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded p-3">Fresh ingredients sourced daily</div>
        <div className="border rounded p-3">Authentic recipes with a modern twist</div>
        <div className="border rounded p-3">Contactless ordering and payments</div>
      </div>
    </div>
  )
}
