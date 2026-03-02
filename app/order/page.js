"use client"
import { useEffect, useMemo, useState } from "react"
import { api, setSessionToken, API_BASE } from "@/lib/api"
import { Button } from "@/components/ui/button"

export default function OrderPage() {
  const [error, setError] = useState(null)
  const [menu, setMenu] = useState([])
  const [cart, setCart] = useState([])
  const [awaitingPayment,setAwaitingPayment]=useState(false)
  const [customerName,setCustomerName]=useState("")
  const [showPrompt,setShowPrompt]=useState(true)
  const [showCart,setShowCart]=useState(false)
  const token = useMemo(
    () =>
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("token")
        : null,
    []
  )
  useEffect(() => {
    let mounted = true
    let intervalId = null
    async function run() {
      if (!token) {
        window.location.href = "/access-denied"
        return
      }
      if (showPrompt) {
        return
      }
      try {
        const res = await api("/sessions/validate", {
          method: "POST",
          body: JSON.stringify({ token }),
        })
        setSessionToken(res.session_token)
        const loadMenu = async () => {
          try{
            const items = await api("/menu")
            if (mounted) setMenu(items)
          }catch(e){
            // attempt single revalidation if session expired
            try{
              await api("/sessions/validate",{ method:"POST", body: JSON.stringify({ token }) })
            }catch{}
          }
        }
        await loadMenu()
        intervalId = setInterval(() => {
          if (mounted) loadMenu()
        }, 3000)
      } catch (e) {
        setError("ACCESS DENIED")
      }
    }
    run()
    return () => {
      mounted = false
      if (intervalId) clearInterval(intervalId)
    }
  }, [token, showPrompt])
  useEffect(()=>{
    if(typeof window!=="undefined"){
      const n = localStorage.getItem("customer_name")||""
      if(n){
        setCustomerName(n)
        setShowPrompt(false)
      }
    }
  },[])

  function addToCart(item) {
    setCart((c) => {
      const i = c.findIndex((x) => x.id === item.id)
      if (i >= 0) {
        const copy = [...c]
        copy[i] = { ...copy[i], qty: copy[i].qty + 1 }
        return copy
      }
      return [
        ...c,
        {
          id: item.id,
          name: item.name,
          price_cents: item.price_cents,
          qty: 1,
        },
      ]
    })
  }
  function updateQty(id, delta) {
    setCart((c) =>
      c.map((x) => (x.id === id ? { ...x, qty: Math.max(1, x.qty + delta) } : x))
    )
  }
  function removeItem(id) {
    setCart((c) => c.filter((x) => x.id !== id))
  }
  const [txn,setTxn]=useState("")
  const [tracking,setTracking]=useState({ open:false, orderId:null, status:null, payment_status:null })
  async function placeOrder() {
    const items = cart.map((x) => ({
      menu_item_id: x.id,
      quantity: x.qty,
      price_cents: x.price_cents,
    }))
    const total = items.reduce((s,x)=>s + (x.price_cents * x.quantity), 0)
    if(!awaitingPayment){
      const pa = "amanullashaikh92-1@oksbi"
      const am = (total/100).toFixed(2)
      const pn = "Restaurant"
      const tn = encodeURIComponent("Order payment")
      const upi = `upi://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&am=${encodeURIComponent(am)}&cu=INR&tn=${tn}`
      try{
        window.open(upi,"_blank")
      }catch{}
      setAwaitingPayment(true)
      return
    }
    const amount_inr = (total/100).toFixed(2)
    if(!txn || txn.trim().length<12){
      alert("Enter UPI transaction reference (12+ chars) to confirm payment")
      return
    }
    const res = await api("/orders/checkout", {
      method: "POST",
      body: JSON.stringify({ items, method: "ONLINE", customer_name: customerName||"", txn: txn.trim(), amount_inr }),
    })
    setCart([])
    setTracking({ open:true, orderId: res.order_id, status: "NEW", payment_status: "PENDING" })
    setAwaitingPayment(false)
  }
  useEffect(()=>{
    let id=null
    async function poll(){
      if(!tracking.open || !tracking.orderId) return
      const ord = await api(`/orders/${tracking.orderId}`)
      setTracking(t=>({ ...t, status: ord.status, payment_status: ord.payment_status }))
      if(ord.status==="SERVED"){
        setTracking({ open:false, orderId:null, status:null })
        setShowCart(false)
      }
    }
    if(tracking.open && tracking.orderId){
      id=setInterval(poll, 1000)
    }
    return ()=>{ if(id) clearInterval(id) }
  },[tracking.open, tracking.orderId])
  const [assets,setAssets]=useState({ cooking:"", ready:"", served:"" })
  useEffect(()=>{
    fetch(`${API_BASE.replace(/\/$/,"")}/assets/status`).then(r=>r.json()).then(setAssets).catch(()=>{})
  },[])
  function resolveAsset(path){
    if(!path) return ""
    if(/^https?:\/\//.test(path)) return path
    if(path.startsWith("/uploads")) return `${API_BASE.replace(/\/$/,"")}${path}`
    return path
  }
  function StatusMedia({ src, className }) {
    if (!src) return null;
    const isVideo = src.toLowerCase().split('?')[0].endsWith(".mp4") || src.toLowerCase().split('?')[0].endsWith(".webm");
    if (isVideo) {
      return (
        <video 
          src={src} 
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
          key={src}
        />
      );
    }
    return <img src={src} alt="status" className={className} />;
  }
  if (error)
    return <div className="p-8 text-red-600 text-center">{error}</div>
  const total = cart.reduce((s, x) => s + x.price_cents * x.qty, 0)
  if(showPrompt){
    return (
      <div className="p-6 max-w-sm mx-auto">
        <h2 className="text-xl font-semibold mb-3">Welcome</h2>
        <p className="text-sm mb-3">Please enter your name to continue.</p>
        <input className="border rounded w-full p-2 mb-2" placeholder="Your name" value={customerName} onChange={e=>setCustomerName(e.target.value)} />
        <Button className="w-full" onClick={()=>{ const n = customerName.trim(); if(!n) return; localStorage.setItem("customer_name", n); setShowPrompt(false) }}>Next</Button>
      </div>
    )
  }
  return (
    <div className="p-4">
      <div>
        <h2 className="text-xl font-semibold mb-2">Menu</h2>
        <div className="grid grid-cols-1 gap-2">
          {menu
            .filter((m) => m.available === 1)
            .map((m) => (
              <div key={m.id} className="border rounded p-3 flex items-center justify-between gap-3">
                <div className="w-20 h-20 bg-gray-100 overflow-hidden rounded">
                  {m.image_url && (
                    <img
                      src={m.image_url.startsWith("http") ? m.image_url : `${API_BASE}${m.image_url}`}
                      alt={m.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1">
                <div className="font-medium">{m.name}</div>
                  <div className="text-sm text-gray-500">{m.description}</div>
                <div className="text-sm">₹{(m.price_cents / 100).toFixed(2)}</div>
                </div>
                <Button size="sm" onClick={() => addToCart(m)}>Add</Button>
              </div>
            ))}
        </div>
      </div>
      <Button onClick={()=>setShowCart(s=>!s)} className="fixed bottom-4 right-4 w-12 h-12 rounded-full bg-black text-white flex items-center justify-center shadow-lg" size="icon">
        🛒
      </Button>
      {showCart && (
        <div className="fixed bottom-20 right-4 w-72 max-w-[90vw] bg-white border rounded shadow-lg p-3">
          <div className="font-semibold mb-2">Cart</div>
          <div className="space-y-2 max-h-64 overflow-auto">
            {cart.map(x=>(
              <div key={x.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={()=>updateQty(x.id,-1)}>-</Button>
                  <span>{x.qty}</span>
                  <Button size="sm" variant="outline" onClick={()=>updateQty(x.id,1)}>+</Button>
                  <span className="ml-2">{x.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>₹{((x.price_cents*x.qty)/100).toFixed(2)}</span>
                  <Button size="sm" variant="outline" onClick={()=>removeItem(x.id)}>x</Button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 font-semibold">Total: ₹{(total/100).toFixed(2)}</div>
          {awaitingPayment && (
            <input className="border rounded w-full p-2 mb-2" placeholder="UPI Transaction Ref" value={txn} onChange={e=>setTxn(e.target.value)} />
          )}
          <Button onClick={placeOrder} disabled={cart.length===0} className="mt-2 w-full">
            {awaitingPayment? "Confirm Payment" : "Pay & Place Order"}
          </Button>
        </div>
      )}
      {tracking.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded p-4 w-80 text-center">
            <div className="text-xl font-semibold mb-2">Order Status</div>
            <div className="mb-1">
              {tracking.payment_status==="CANCELLED" ? "Order cancelled" : 
               tracking.payment_status==="PENDING" ? "Awaiting payment confirmation…" : 
               "Order confirmed"}
            </div>
            <div className="mb-3">
              {tracking.payment_status==="CANCELLED" ? "Your order has been cancelled" :
               tracking.status==="COOKING" ? "Cooking your food…" : 
               tracking.status==="READY" ? "Ready for serving" : 
               tracking.status==="SERVED" ? "Served!" : 
               "Preparing…"}
            </div>
            {tracking.payment_status!=="CANCELLED" && (
              <div className="mb-3">
                <StatusMedia 
                  src={resolveAsset(tracking.status==="COOKING" ? assets.cooking : tracking.status==="READY" ? assets.ready : tracking.status==="SERVED" ? assets.served : "") || resolveAsset(tracking.status==="COOKING" ? "/status-assets/GIF/cooking.mp4" : tracking.status==="READY" ? "/status-assets/GIF/ready.mp4" : "/status-assets/GIF/served.mp4")} 
                  className="w-full h-40 object-cover rounded" 
                />
              </div>
            )}
            {tracking.payment_status==="CANCELLED" && (
              <div className="mb-3">
                <Button onClick={() => window.location.reload()} className="w-full">
                  Back to Menu
                </Button>
              </div>
            )}
            <div className="text-sm text-gray-600">
              {tracking.payment_status==="CANCELLED" ? "You can place a new order anytime." : "We'll auto-return to menu when served."}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
