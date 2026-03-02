"use client"
import { useEffect, useState } from "react"
import { API_BASE } from "@/lib/api"
import { Button } from "@/components/ui/button"
export default function StatusAssets(){
  const [cfg,setCfg]=useState({ cooking:"", ready:"", served:"" })
  function token(){ if(typeof window==='undefined')return null; return localStorage.getItem("admin_token") }
  async function load(){
    const t=token()
    if(!t){ window.location.href="/admin/login"; return }
    const data=await fetch(`${API_BASE}/admin/status-assets`,{ headers:{ Authorization:`Bearer ${t}` }}).then(r=>r.json())
    setCfg(data||{ cooking:"", ready:"", served:"" })
  }
  useEffect(()=>{ load() },[])
  async function upload(file, key){
    const t=token()
    const dataUrl = await new Promise((resolve, reject)=>{
      const reader=new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    const r=await fetch(`${API_BASE}/admin/upload-image`,{ method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${t}` }, body: JSON.stringify({ filename: file.name || "status.gif", data_url: dataUrl })})
    if(!r.ok) return
    const j=await r.json()
    setCfg(c=>({ ...c, [key]: j.url }))
  }
  async function save(){
    const t=token()
    await fetch(`${API_BASE}/admin/status-assets`,{ method:"PUT", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${t}` }, body: JSON.stringify(cfg)})
    load()
  }
  function StatusMedia({ src, className }) {
    if (!src) return null;
    const isVideo = src.toLowerCase().split('?')[0].endsWith(".mp4") || src.toLowerCase().split('?')[0].endsWith(".webm");
    const fullSrc = src.startsWith("http") ? src : (src.startsWith("/status-assets") ? src : `${API_BASE}${src}`);
    if (isVideo) {
      return (
        <video 
          src={fullSrc} 
          className={className} 
          autoPlay 
          loop 
          muted 
          playsInline
          preload="auto"
          style={{
            objectFit: 'cover',
            width: '100%',
            height: '100%',
            display: 'block'
          }}
          onCanPlay={(e) => {
            e.target.play().catch(err => console.log('Autoplay failed:', err));
          }}
          onError={(e) => {
            console.error('Video error:', e);
            e.target.style.display = 'none';
          }}
          key={fullSrc}
        />
      );
    }
    return <img src={fullSrc} alt="status" className={className} />;
  }
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Status Assets</h2>
        <Button href="/admin/dashboard" variant="outline">Back</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {["cooking","ready","served"].map(k=>(
          <div key={k} className="border rounded p-3">
            <div className="font-medium mb-2">{k[0].toUpperCase()+k.slice(1)}</div>
            <input className="border rounded w-full p-2 mb-2" placeholder="GIF/Video URL" value={cfg[k]} onChange={e=>setCfg(c=>({ ...c, [k]: e.target.value }))} />
            <input type="file" accept="image/gif,video/*" className="border rounded w-full p-2 mb-2" onChange={e=>{ const f=e.target.files?.[0]; if(f) upload(f,k) }} />
            {cfg[k] && <div className="mt-2"><StatusMedia src={cfg[k]} className="w-full h-32 object-cover rounded" /></div>}
          </div>
        ))}
      </div>
      <Button onClick={save} className="mt-4">Save</Button>
    </div>
  )
}
