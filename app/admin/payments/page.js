"use client"
import { useEffect, useState } from "react"
import { API_BASE } from "@/lib/api"
import { Button } from "@/components/ui/button"
export default function PendingPayments(){
  const [orders,setOrders]=useState([])
  function token(){ if(typeof window==='undefined')return null; return localStorage.getItem("admin_token") }
  async function load(){
    const t=token()
    if(!t){ window.location.href="/admin/login"; return }
    const res=await fetch(`${API_BASE}/admin/payments/pending`,{ headers:{ Authorization:`Bearer ${t}` }}).then(r=>r.json())
    setOrders(res)
  }
  useEffect(()=>{ load(); const id=setInterval(load,1000); return ()=>clearInterval(id) },[])
  async function confirm(id){
    const t=token()
    await fetch(`${API_BASE}/admin/orders/${id}/payment`,{ method:"PUT", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${t}` }, body: JSON.stringify({ status:"PAID", method:"ONLINE" })})
    load()
  }
  async function reject(id){
    const t=token()
    await fetch(`${API_BASE}/admin/orders/${id}/payment`,{ method:"PUT", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${t}` }, body: JSON.stringify({ status:"CANCELLED", method:"ONLINE" })})
    load()
  }
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Pending Payments</h2>
        <a href="/admin/dashboard"><Button variant="outline">Back</Button></a>
      </div>
      <div className="space-y-3">
        {orders.map(o=>(
          <div key={o.id} className="border rounded p-3">
            <div className="flex justify-between">
              <div className="font-medium">Table: {o.table_name||o.table_id.slice(0,6)}</div>
              <div>{new Date(o.created_at*1000).toLocaleString()}</div>
              <div>Status: {o.status} | Payment: {o.payment_status}</div>
            </div>
            <div className="text-sm mt-1">Customer: {o.customer_name||"Guest"}</div>
            <div className="mt-2 text-sm">
              {o.items.map(it=>(
                <div key={it.id} className="flex justify-between"><span>{it.name}</span><span>x{it.quantity}</span></div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Button onClick={()=>confirm(o.id)} className="px-3 py-2 bg-green-600 text-white rounded">Confirm Paid</Button>
              <Button onClick={()=>reject(o.id)} variant="outline">Reject</Button>
            </div>
          </div>
        ))}
        {orders.length===0 && <div className="text-sm text-gray-600">No pending payments.</div>}
      </div>
    </div>
  )
}
