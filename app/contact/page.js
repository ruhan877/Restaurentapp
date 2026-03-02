"use client"
export default function Contact(){
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-3">Contact Us</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-3">
          <div className="font-medium mb-2">Aman Hotel & Restaurant</div>
          <div>MG Road, Pune, MH 411001</div>
          <div>Phone: +91 98765 43210</div>
          <div>Email: hello@amanrestaurant.example</div>
        </div>
        <div className="border rounded p-3">
          <div className="font-medium mb-2">Hours</div>
          <div>Mon–Fri: 11:00–23:00</div>
          <div>Sat–Sun: 10:00–23:30</div>
        </div>
      </div>
      <div className="mt-4 border rounded p-3">
        <div className="font-medium mb-2">Feedback</div>
        <p className="text-gray-700">We’d love to hear from you. Please reach out by phone or email.</p>
      </div>
    </div>
  )
}
