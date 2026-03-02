"use client"
import { useEffect, useState } from "react"
import { API_BASE } from "@/lib/api"
import { Button } from "@/components/ui/button"
export default function AdminDashboard(){
  const [monitor,setMonitor]=useState(null)
  const [orders,setOrders]=useState([])
  const [tables,setTables]=useState([])
  const [selectedTable,setSelectedTable]=useState("")
  const [tname,setTname]=useState("")
  const [domain,setDomain]=useState("")
  const [qrShown,setQrShown]=useState(null) // { table_id, url, svg }
  function scaleSvg(svg, size=160){
    if(!svg) return svg
    let s = svg.replace(/width="[^"]*"/, `width="${size}"`).replace(/height="[^"]*"/, `height="${size}"`)
    if(!/style="/.test(s)) s = s.replace("<svg","<svg style=\"max-width:100%;height:auto\"")
    return s
  }
  function token(){ if(typeof window==='undefined')return null; return localStorage.getItem("admin_token") }
  useEffect(()=>{ load() },[])
  async function load(){
    const t=token()
    if(!t){ window.location.href="/admin/login"; return }
    const h={ Authorization: `Bearer ${t}` }
    const m=await fetch(`${API_BASE}/admin/tables/monitor`,{ headers:h }).then(r=>r.json())
    const o=await fetch(`${API_BASE}/admin/orders`,{ headers:h }).then(r=>r.json())
    const tbl=await fetch(`${API_BASE}/admin/tables`,{ headers:h }).then(r=>r.json())
    setMonitor(m)
    setOrders(o)
    setTables(tbl)
  }
  async function markPaid(id){
    const t=token()
    await fetch(`${API_BASE}/admin/orders/${id}/payment`,{ method:"PUT", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${t}` }, body: JSON.stringify({ status:"PAID", method:"COUNTER", amount_cents:0 })})
    load()
  }
  async function markUnpaid(id){
    const t=token()
    await fetch(`${API_BASE}/admin/orders/${id}/payment`,{ method:"PUT", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${t}` }, body: JSON.stringify({ status:"PENDING", method:"COUNTER", amount_cents:0 })})
    load()
  }
  async function updateStatus(id,status){
    await fetch(`${API_BASE}/kds/orders/${id}/status`,{ method:"PUT", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ status })})
    load()
  }
  async function cancelOrder(id){
    await updateStatus(id,"CANCELLED")
  }
  async function createTable(){
    const t=token()
    const res=await fetch(`${API_BASE}/tables`,{ method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${t}` }, body: JSON.stringify({ name:tname, domain })})
    if(!res.ok) return
    const data=await res.json()
    setQrShown({ table_id:data.table_id, url:data.url, svg:scaleSvg(data.qr_svg) })
    setTname("")
    setDomain("")
    load()
  }
  async function rotateQR(id){
    const t=token()
    const d=(typeof window!=="undefined"?window.location.origin:"").replace(/\/+$/,"")
    const res=await fetch(`${API_BASE}/admin/tables/${id}/rotate-token`,{ method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${t}` }, body: JSON.stringify({ domain: domain || d })})
    if(!res.ok) return
    const data=await res.json()
    setQrShown({ table_id:id, url:data.url, svg:scaleSvg(data.qr_svg) })
  }
  async function toggleActive(id,active){
    const t=token()
    await fetch(`${API_BASE}/admin/tables/${id}/active`,{ method:"PUT", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${t}` }, body: JSON.stringify({ active })})
    load()
  }
  function downloadQR(){
    if(!qrShown?.svg) return
    const blob=new Blob([qrShown.svg],{type:"image/svg+xml"})
    const a=document.createElement("a")
    a.href=URL.createObjectURL(blob)
    a.download=`table-${qrShown.table_id}-qr.svg`
    a.click()
    setTimeout(()=>URL.revokeObjectURL(a.href),1000)
  }
  function shareLink(){
    if(!qrShown?.url) return
    if(navigator.share){
      navigator.share({ title:"Table QR Link", text:"Order link", url:qrShown.url }).catch(()=>{})
    }else{
      navigator.clipboard?.writeText(qrShown.url)
    }
  }
  const filteredOrders = selectedTable ? orders.filter(o=>o.table_id===selectedTable) : orders
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Admin Dashboard</h2>
        <a href="/kitchen"><Button variant="outline">Open Kitchen (KDS)</Button></a>
      </div>
      <div className="mb-4">
        <a href="/admin/menu"><Button variant="outline">Manage Menu</Button></a>
        <a href="/admin/history" className="ml-2"><Button variant="outline">Order History</Button></a>
        <a href="/admin/sales" className="ml-2"><Button variant="outline">Sales</Button></a>
        <a href="/admin/ratings" className="ml-2"><Button variant="outline">Ratings</Button></a>
        <a href="/admin/payments" className="ml-2"><Button variant="outline">Pending Payments</Button></a>
      </div>
      <div className="mb-6 border rounded p-4">
        <div className="font-medium mb-2">Create Table</div>
        <div className="flex gap-2">
          <input className="border rounded p-2 flex-1" placeholder="Table Name" value={tname} onChange={e=>setTname(e.target.value)} />
          <input className="border rounded p-2 flex-1" placeholder="Domain e.g. https://domain.com" value={domain} onChange={e=>setDomain(e.target.value)} />
          <Button onClick={createTable}>Create</Button>
        </div>
        {qrShown && (
          <div className="mt-4">
            <div className="text-sm mb-2 break-all">URL: {qrShown.url}</div>
            <div className="bg-white p-2 border rounded inline-block" style={{width:160}}>
              <div style={{width:"100%"}} dangerouslySetInnerHTML={{__html:qrShown.svg}} />
            </div>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" onClick={()=>{ navigator.clipboard?.writeText(qrShown.url) }}>Copy Link</Button>
              <Button size="sm" variant="outline" onClick={shareLink}>Share Link</Button>
              <Button size="sm" variant="outline" onClick={downloadQR}>Download QR</Button>
            </div>
          </div>
        )}
      </div>
      <h3 className="text-lg font-semibold mb-2">Tables</h3>
      <div className="space-y-3 mb-8">
        {tables.map(t=>(
          <div key={t.id} className="border rounded p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{t.name}</div>
              <div className="text-sm">ID: {t.id.slice(0,8)}… | Active: {t.active? "Yes":"No"}</div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={()=>rotateQR(t.id)}>Generate QR</Button>
              <Button size="sm" variant="outline" onClick={()=>toggleActive(t.id,!t.active)}>{t.active?"Deactivate":"Activate"}</Button>
            </div>
          </div>
        ))}
      </div>
      {monitor&&(
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="border rounded p-3">Active Tables: {monitor.active.length}</div>
          <div className="border rounded p-3">Pending Payment: {monitor.pending_payment.length}</div>
          <div className="border rounded p-3">Completed: {monitor.completed.length}</div>
        </div>
      )}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Orders</h3>
        <select className="border rounded p-1" value={selectedTable} onChange={e=>setSelectedTable(e.target.value)}>
          <option value="">All tables</option>
          {tables.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div className="space-y-3">
        {filteredOrders.map(o=>(
          <div key={o.id} className="border rounded p-3">
            <div>
              <div className="font-medium">Table: {o.table_name||o.table_id.slice(0,6)}</div>
              <div className="text-sm">Time: {new Date(o.created_at*1000).toLocaleString()} | Status: {o.status} | Payment: {o.payment_status}</div>
              <div className="mt-2 text-sm">
                {o.items.map(it=>(
                  <div key={it.id} className="flex justify-between"><span>{it.name}</span><span>x{it.quantity}</span></div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Button onClick={()=>setOrders([])} variant="outline">Clear Recent Orders</Button>
      </div>
    </div>
  )
}
