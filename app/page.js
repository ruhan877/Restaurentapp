"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { API_BASE } from "@/lib/api"
export default function Home() {
  const dishes = [
    { name: "Masala Dosa", desc: "Crispy rice crepe filled with spiced potatoes, served with coconut chutney and sambar. A South Indian classic loved for its textures and subtle heat.", img: "/images/masala-dosa.jpg" },
    { name: "Butter Chicken", desc: "Tender chicken simmered in velvety tomato butter gravy, finished with cream. Mild, rich, and a signature of North Indian comfort cuisine.", img: "/images/butter-chicken.jpg" },
    { name: "Paneer Tikka", desc: "Char-grilled cottage cheese marinated in yogurt and spices, smoky and succulent. A perfect vegetarian delight for all ages.", img: "/images/paneer-tikka.jpg" },
    { name: "Biryani", desc: "Aromatic basmati rice layered with saffron and spices, slow-cooked with meat or vegetables for deep flavors and irresistible aroma.", img: "/images/biryani.jpg" },
  ]
  const [ratings,setRatings]=useState({})
  const [showForm,setShowForm]=useState(false)
  const [form,setForm]=useState({ name:"", email:"", phone:"", comment:"", score:0, dish:"" })
  const [published,setPublished]=useState([])
  function setRating(name,score){
    setRatings(r=>({ ...r, [name]: score }))
    setForm(f=>({ ...f, dish:name, score }))
    setShowForm(true)
  }
  async function submitRating(){
    await fetch("/api/ratings",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(form)})
    setShowForm(false)
    fetch(`${API_BASE}/ratings/visible`).then(r=>r.json()).then(setPublished).catch(()=>{})
  }
  useEffect(()=>{
    fetch(`${API_BASE}/ratings/visible`).then(r=>r.json()).then(setPublished).catch(()=>setPublished([]))
  },[])
  return (
    <div className="min-h-screen bg-white">
      <section className="px-6 py-12 text-center bg-gradient-to-r from-orange-50 to-pink-50">
        <h1 className="text-3xl md:text-5xl font-bold">We serve India on a plate</h1>
        <p className="mt-3 text-gray-600">Classic recipes, modern QR ordering — fast, safe, and delicious.</p>
        
      </section>
      <section className="px-6 py-8">
        <h2 className="text-2xl font-semibold mb-4">Popular Dishes</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {dishes.map(d=>(
            <div key={d.name} className="border rounded overflow-hidden">
              <img
                src={d.img}
                alt={d.name}
                className="w-full h-40 object-cover"
                onError={(e)=>{ e.currentTarget.src=`/images/${d.name.toLowerCase().replace(/\s+/g,'-')}.jpg`; }}
              />
              <div className="p-3">
                <div className="font-medium">{d.name}</div>
                <div className="text-sm text-gray-600">{d.desc}</div>
                <div className="mt-2">
                  {[1,2,3,4,5].map(s=>(
                    <button key={s} onClick={()=>setRating(d.name,s)} className={`text-xl ${ (ratings[d.name]||0) >= s ? "text-yellow-500" : "text-gray-400"}`}>★</button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded p-4 w-80">
            <div className="font-medium mb-2">Rate {form.dish}</div>
            <input className="border rounded w-full p-2 mb-2" placeholder="Your name" value={form.name} onChange={e=>setForm(f=>({ ...f, name:e.target.value }))} />
            <input className="border rounded w-full p-2 mb-2" placeholder="Email (gmail)" value={form.email} onChange={e=>setForm(f=>({ ...f, email:e.target.value }))} />
            <input className="border rounded w-full p-2 mb-2" placeholder="Phone" value={form.phone} onChange={e=>setForm(f=>({ ...f, phone:e.target.value }))} />
            <textarea className="border rounded w-full p-2 mb-2" placeholder="Review" value={form.comment} onChange={e=>setForm(f=>({ ...f, comment:e.target.value }))} />
            <div className="flex gap-2 mb-2">
              {[1,2,3,4,5].map(s=>(
                <button key={s} onClick={()=>setForm(f=>({ ...f, score:s }))} className={`text-xl ${ (form.score||0) >= s ? "text-yellow-500" : "text-gray-400"}`}>★</button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={submitRating} className="flex-1">Send</Button>
              <Button onClick={()=>setShowForm(false)} variant="outline" className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}
      <section className="px-6 py-8">
        <h2 className="text-2xl font-semibold mb-4">Customer Reviews</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {published.map(r=>(
            <div key={r.id} className="border rounded p-3">
              <div className="font-medium">{r.dish||"Dish"}</div>
              <div className="text-lg">{"★".repeat(Number(r.score)||0)}</div>
              <div className="text-sm text-gray-600 mt-1">{r.comment}</div>
              <div className="text-sm mt-2">{r.name||"Guest"} ({r.email||"-"})</div>
            </div>
          ))}
          {published.length===0 && <div className="text-sm text-gray-600">No published reviews yet.</div>}
        </div>
      </section>
      <footer className="px-6 py-6 border-t mt-8 text-sm text-gray-600">
        <div className="flex flex-wrap justify-between">
          <div>© 2026 Aman Hotel & Restaurant</div>
          <div className="space-x-3">
            <a href="/about" className="underline">About</a>
            <a href="/contact" className="underline">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
