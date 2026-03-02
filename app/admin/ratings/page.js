"use client"
import { useEffect, useState } from "react"
import { API_BASE } from "@/lib/api"
import { Button } from "@/components/ui/button"
export default function Ratings(){
  const [rows,setRows]=useState([])
  function token(){ if(typeof window==='undefined')return null; return localStorage.getItem("admin_token") }
  async function load(){
    const t=token()
    if(!t){ window.location.href="/admin/login"; return }
    const data=await fetch(`${API_BASE}/admin/ratings`,{ headers:{ Authorization:`Bearer ${t}` }}).then(r=>r.json())
    setRows(data)
  }
  useEffect(()=>{ load() },[])
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Ratings</h2>
        <a href="/admin/dashboard" className="px-3 py-2 border rounded">Back</a>
      </div>
      <div className="space-y-2">
        {rows.map(r=>(
          <div key={r.id} className="border rounded p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{r.name||"Guest"}</div>
              <div className="text-sm">{new Date(r.created_at*1000).toLocaleString()}</div>
              <div className="text-sm">{r.comment}</div>
              <div className="text-sm">Email: {r.email||"-"}</div>
              <div className="text-sm">Phone: {r.phone||"-"}</div>
              <div className="text-sm">Dish: {r.dish||"-"}</div>
            </div>
            <div className="text-right">
              <div className="text-lg">{"★".repeat(Number(r.score)||0)}</div>
              <div className="mt-2">
                <Button size="sm" variant="outline" onClick={async()=>{ const t=token(); await fetch(`${API_BASE}/admin/ratings/${r.id}/visible`,{ method:"PUT", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${t}` }, body: JSON.stringify({ visible: r.visible?0:1 })}); load() }}>{r.visible? "Hide":"Show"}</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
