"use client"
export default function AccessDenied(){
  return <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="text-2xl font-semibold mb-2">ACCESS DENIED</div>
      <div className="text-gray-600">Valid table QR session required</div>
    </div>
  </div>
}
