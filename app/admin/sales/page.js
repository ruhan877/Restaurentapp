"use client"
import { useEffect, useState } from "react"
import { API_BASE } from "@/lib/api"
import { Button } from "@/components/ui/button"
export default function Sales(){
  const [from,setFrom]=useState("")
  const [to,setTo]=useState("")
  const [rows,setRows]=useState([])
  const [orders,setOrders]=useState([])
  function token(){ if(typeof window==='undefined')return null; return localStorage.getItem("admin_token") }
  async function load(){
    const t=token()
    const f=from? Math.floor(new Date(from).getTime()/1000):0
    const tt=to? Math.floor(new Date(to).getTime()/1000):9999999999
    const res=await fetch(`${API_BASE}/admin/sales?from=${f}&to=${tt}`,{ headers:{ Authorization:`Bearer ${t}` }})
    const data=await res.json()
    setRows(data)
    const ord=await fetch(`${API_BASE}/admin/orders?from=${f}&to=${tt}`,{ headers:{ Authorization:`Bearer ${t}` }})
    const odata=await ord.json()
    setOrders(odata.filter(o=>o.payment_status==="PAID"))
  }
  useEffect(()=>{ load() },[])
  const max = Math.max(1,...rows.map(r=>Number(r.total_cents)||0))
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Sales</h2>
        <a href="/admin/dashboard"><Button variant="outline">Back</Button></a>
      </div>
      <div className="flex gap-2 mb-4">
        <input type="datetime-local" className="border rounded p-2" value={from} onChange={e=>setFrom(e.target.value)} />
        <input type="datetime-local" className="border rounded p-2" value={to} onChange={e=>setTo(e.target.value)} />
        <Button onClick={load}>Filter</Button>
      </div>
      {rows.length===0 ? (
        <div className="text-sm text-gray-600">No sales in selected range.</div>
      ) : (
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-600 mb-2">Daily Sales Overview</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              {rows.map(r=>(
                <div key={r.day} className="text-center group">
                  <div className="relative">
                    <div className="bg-gradient-to-t from-green-600 to-green-400 rounded-t transition-all duration-300 group-hover:from-green-700 group-hover:to-green-500" style={{height: Math.max(20, (Number(r.total_cents)/max)*200)}} />
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      ₹{(Number(r.total_cents)/100).toFixed(2)}
                    </div>
                  </div>
                  <div className="text-sm mt-2 font-medium">{r.day}</div>
                  <div className="text-xs text-gray-500">₹{(Number(r.total_cents)/100).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Total Revenue</div>
              <div className="text-2xl font-bold text-blue-800">₹{rows.reduce((sum, r) => sum + Number(r.total_cents), 0)/100}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600 font-medium">Average Daily</div>
              <div className="text-2xl font-bold text-green-800">₹{rows.length > 0 ? (rows.reduce((sum, r) => sum + Number(r.total_cents), 0)/(rows.length*100)).toFixed(2) : '0.00'}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-purple-600 font-medium">Total Orders</div>
              <div className="text-2xl font-bold text-purple-800">{orders.length}</div>
            </div>
          </div>
        </div>
      )}
      <h3 className="text-lg font-semibold mt-6 mb-4">Recent Orders</h3>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.slice(0,20).map((o, index) => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{o.customer_name||"Guest"}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(o.created_at*1000).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {o.items.length} items
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">₹{(o.items.reduce((s,x)=>s + x.price_cents*x.quantity,0)/100).toFixed(2)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
