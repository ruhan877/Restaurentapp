"use client"
import { useEffect, useState } from "react"
import { API_BASE } from "@/lib/api"
import { Button } from "@/components/ui/button"
export default function History(){
  const [from,setFrom]=useState("")
  const [to,setTo]=useState("")
  const [orders,setOrders]=useState([])
  const [loading,setLoading]=useState(false)
  const [chart,setChart]=useState([])
  function token(){ if(typeof window==='undefined')return null; return localStorage.getItem("admin_token") }
  async function load(){
    const t=token()
    const f=from? Math.floor(new Date(from).getTime()/1000):0
    const tt=to? Math.floor(new Date(to).getTime()/1000):9999999999
    setLoading(true)
    const res=await fetch(`${API_BASE}/admin/orders?from=${f}&to=${tt}`,{ headers:{ Authorization:`Bearer ${t}` }})
    const data=await res.json()
    setOrders(data)
    const map = {}
    for(const o of data){
      const day = new Date(o.created_at*1000).toISOString().slice(0,10)
      map[day] = (map[day]||0) + 1
    }
    setChart(Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0])))
    setLoading(false)
  }
  useEffect(()=>{ load() },[])
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Order History</h2>
        <a href="/admin/dashboard"><Button variant="outline">Back</Button></a>
      </div>
      <div className="flex gap-2 mb-4">
        <input type="datetime-local" className="border rounded p-2" value={from} onChange={e=>setFrom(e.target.value)} />
        <input type="datetime-local" className="border rounded p-2" value={to} onChange={e=>setTo(e.target.value)} />
        <Button onClick={load}>Filter</Button>
      </div>
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h4 className="text-sm font-medium text-gray-600 mb-4">Daily Order Volume</h4>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          {chart.length===0 ? <div className="text-sm text-gray-600 md:col-span-6">No orders in selected range.</div> : chart.map(([day,count])=>(
            <div key={day} className="text-center group">
              <div className="relative">
                <div className="bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all duration-300 group-hover:from-blue-700 group-hover:to-blue-500" style={{height: Math.max(20, count*25)}} />
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {count} orders
                </div>
              </div>
              <div className="text-sm mt-2 font-medium">{day}</div>
              <div className="text-xs text-gray-500">{count}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-sm text-orange-600 font-medium">Total Orders</div>
          <div className="text-2xl font-bold text-orange-800">{orders.length}</div>
        </div>
        <div className="bg-teal-50 p-4 rounded-lg">
          <div className="text-sm text-teal-600 font-medium">Avg Daily Orders</div>
          <div className="text-2xl font-bold text-teal-800">{chart.length > 0 ? (orders.length/chart.length).toFixed(1) : '0'}</div>
        </div>
        <div className="bg-indigo-50 p-4 rounded-lg">
          <div className="text-sm text-indigo-600 font-medium">Peak Day</div>
          <div className="text-lg font-bold text-indigo-800">{chart.length > 0 ? chart.reduce((max, [day, count]) => count > max[1] ? [day, count] : max, ['', 0])[0] : 'N/A'}</div>
        </div>
      </div>
      <h3 className="text-lg font-semibold mb-4">Order Details</h3>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Table</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map(o=>(
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{o.table_name||o.table_id.slice(0,6)}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(o.created_at*1000).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      o.status === 'SERVED' ? 'bg-green-100 text-green-800' :
                      o.status === 'READY' ? 'bg-blue-100 text-blue-800' :
                      o.status === 'COOKING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {o.status}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      o.payment_status === 'PAID' ? 'bg-green-100 text-green-800' :
                      o.payment_status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {o.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {o.items.length} items
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">{o.customer_name||"Guest"}</div>
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
