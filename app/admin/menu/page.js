"use client"
import { useEffect, useState } from "react"
import { API_BASE } from "@/lib/api"
import { Button } from "@/components/ui/button"
export default function AdminMenu(){
  const [items,setItems]=useState([])
  const [form,setForm]=useState({ name:"", price_rupees:0, description:"", image_url:"", category:"Main", available:true, file:null })
  const [editing,setEditing]=useState(null) // item id or null
  function token(){ if(typeof window==='undefined')return null; return localStorage.getItem("admin_token") }
  async function load(){
    const t=token()
    const res=await fetch(`${API_BASE}/menu/all`,{ headers:{ Authorization:`Bearer ${t}` }})
    const data=await res.json()
    setItems(data)
  }
  useEffect(()=>{ load() },[])
  async function uploadIfNeeded(){
    if(!form.file) return form.image_url || ""
    const t=token()
    const dataUrl = await new Promise((resolve, reject)=>{
      const reader=new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(form.file)
    })
    const r=await fetch(`${API_BASE}/admin/upload-image`,{ method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${t}` }, body: JSON.stringify({ filename: form.file.name || "image.png", data_url: dataUrl })})
    if(!r.ok) return ""
    const j=await r.json()
    return j.url || ""
  }
  async function save(){
    const t=token()
    const url = await uploadIfNeeded()
    const body={ name:form.name, price_cents:Math.round((Number(form.price_rupees)||0)*100), description:form.description, image_url:url || form.image_url, category:form.category, available: !!form.available }
    const res=await fetch(`${API_BASE}/menu`,{ method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${t}` }, body: JSON.stringify(body)})
    if(res.ok){ setForm({ name:"", price_rupees:0, description:"", image_url:"", category:"Main", available:true, file:null }); load() }
  }
  async function update(id,patch){
    const t=token()
    const body={ ...patch }
    await fetch(`${API_BASE}/menu/${id}`,{ method:"PUT", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${t}` }, body: JSON.stringify(body)})
    load()
  }
  async function updateCurrent(){
    if(!editing) return
    const t=token()
    const url = await uploadIfNeeded()
    const body={ name:form.name, price_cents:Math.round((Number(form.price_rupees)||0)*100), description:form.description, image_url:url || form.image_url, category:form.category, available: !!form.available }
    await fetch(`${API_BASE}/menu/${editing}`,{ method:"PUT", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${t}` }, body: JSON.stringify(body)})
    setEditing(null)
    setForm({ name:"", price_rupees:0, description:"", image_url:"", category:"Main", available:true, file:null })
    load()
  }
  async function remove(id){
    const t=token()
    await fetch(`${API_BASE}/menu/${id}`,{ method:"DELETE", headers:{ Authorization:`Bearer ${t}` }})
    if(editing===id) setEditing(null)
    load()
  }
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Manage Menu</h2>
        <a href="/admin/dashboard" className="px-3 py-2 border rounded">Back to Dashboard</a>
      </div>
      <div className="border rounded p-4 mb-6">
        <div className="font-medium mb-2">Add Item</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input className="border rounded p-2" placeholder="Name" value={form.name} onChange={e=>setForm(f=>({ ...f, name:e.target.value }))} />
          <input className="border rounded p-2" placeholder="Price (₹)" value={form.price_rupees} onChange={e=>setForm(f=>({ ...f, price_rupees:e.target.value }))} />
          <input className="border rounded p-2" placeholder="Image URL" value={form.image_url} onChange={e=>setForm(f=>({ ...f, image_url:e.target.value }))} />
          <input className="border rounded p-2" type="file" onChange={e=>setForm(f=>({ ...f, file: e.target.files?.[0]||null }))} />
          <input className="border rounded p-2" placeholder="Category" value={form.category} onChange={e=>setForm(f=>({ ...f, category:e.target.value }))} />
          <textarea className="border rounded p-2 md:col-span-2" placeholder="Description" value={form.description} onChange={e=>setForm(f=>({ ...f, description:e.target.value }))} />
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.available} onChange={e=>setForm(f=>({ ...f, available:e.target.checked }))} /> Available</label>
        </div>
        <Button onClick={save} className="mt-3">Save Item</Button>
      </div>
      <div className="space-y-3">
        {items.map(it=>(
          <div key={it.id} className="border rounded p-3 flex gap-3">
            <div className="w-20 h-20 bg-gray-100 overflow-hidden rounded">
              {it.image_url && (
                <img
                  src={it.image_url.startsWith("http") ? it.image_url : `${API_BASE}${it.image_url}`}
                  alt={it.name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex-1">
              <div className="font-medium">{it.name} <span className="text-sm text-gray-500">({it.category})</span></div>
              <div className="text-sm">₹{(it.price_cents/100).toFixed(2)}</div>
              <div className="text-sm text-gray-500">{it.description}</div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={()=>update(it.id,{ available: it.available?0:1 })}>{it.available? "Disable":"Enable"}</Button>
                <Button size="sm" variant="outline" onClick={()=>{ setEditing(it.id); setForm({ name:it.name, price_rupees:(it.price_cents/100), description:it.description||"", image_url:it.image_url||"", category:it.category||"Main", available: !!it.available, file:null }) }}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={()=>remove(it.id)}>Delete</Button>
              </div>
              {editing===it.id && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input className="border rounded p-2" placeholder="Name" value={form.name} onChange={e=>setForm(f=>({ ...f, name:e.target.value }))} />
                  <input className="border rounded p-2" placeholder="Price (₹)" value={form.price_rupees} onChange={e=>setForm(f=>({ ...f, price_rupees:e.target.value }))} />
                  <input className="border rounded p-2" placeholder="Image URL" value={form.image_url} onChange={e=>setForm(f=>({ ...f, image_url:e.target.value }))} />
                  <input className="border rounded p-2" type="file" onChange={e=>setForm(f=>({ ...f, file: e.target.files?.[0]||null }))} />
                  <input className="border rounded p-2" placeholder="Category" value={form.category} onChange={e=>setForm(f=>({ ...f, category:e.target.value }))} />
                  <textarea className="border rounded p-2 md:col-span-2" placeholder="Description" value={form.description} onChange={e=>setForm(f=>({ ...f, description:e.target.value }))} />
                  <label className="flex items-center gap-2"><input type="checkbox" checked={form.available} onChange={e=>setForm(f=>({ ...f, available:e.target.checked }))} /> Available</label>
                  <div className="md:col-span-2 flex gap-2">
                    <Button onClick={updateCurrent}>Update</Button>
                    <Button onClick={()=>setEditing(null)} variant="outline">Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
