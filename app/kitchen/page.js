"use client"
import { useEffect, useState } from "react"
import { API_BASE, api } from "@/lib/api"
import { Button } from "@/components/ui/button"
const STATUSES=["COOKING","READY","SERVED"]
export default function Kitchen() {
  const [orders,setOrders]=useState([])
  useEffect(()=>{
    let mounted=true
    load()
    const id=setInterval(()=>{ if(mounted) load() }, 1000)
    return ()=>{ mounted=false; clearInterval(id) }
  },[])
  async function load(){
    const data=await api("/orders/kds")
    setOrders(data)
  }
  async function setStatus(id,status){
    await fetch(`${API_BASE}/kds/orders/${id}/status`,{ method:"PUT", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ status })})
    load()
  }
  async function setItemDone(orderId,itemId){
    await fetch(`${API_BASE}/orders/${orderId}/items/${itemId}/done`,{ method:"PUT" })
    load()
  }
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Kitchen Dashboard</h2>
      <div className="space-y-3">
        {orders.map(o=>(
          <div key={o.id} className="border rounded p-3">
            <div className="flex justify-between">
              <div>Table: {o.table_id.slice(0,6)}</div>
              <div>{new Date(o.created_at*1000).toLocaleTimeString()}</div>
              <div>Status: {o.status}</div>
            </div>
            <div className="mt-2 text-sm">
              {o.items.filter(it=>!it.done).map(it=>(
                <div key={it.id} className="flex justify-between items-center gap-3">
                  <div className="w-16 h-16 bg-gray-100 overflow-hidden rounded">
                    {it.image_url && <img src={it.image_url?.startsWith("http")? it.image_url : `${API_BASE}${it.image_url}`} alt={it.name} className="w-full h-full object-cover" />}
                  </div>
                  <span className="flex-1">{it.name}</span>
                  <div className="flex items-center gap-2">
                    <span>x{it.quantity}</span>
                    <Button size="sm" onClick={()=>setItemDone(o.id,it.id)}>Done</Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              {STATUSES.map(s=>(
                <Button 
                  key={s} 
                  size="sm" 
                  variant={o.status===s ? "default" : "outline"}
                  onClick={()=>setStatus(o.id,s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
