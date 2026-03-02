"use client"
import { useState } from "react"
import { API_BASE } from "@/lib/api"
import { Button } from "@/components/ui/button"
export default function AdminLogin(){
  const [username,setUsername]=useState("")
  const [password,setPassword]=useState("")
  const [err,setErr]=useState(null)
  const [mode,setMode]=useState("login") // 'login' | 'signup'
  async function login(){
    setErr(null)
    const res=await fetch(`${API_BASE}/admin/login`,{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ username,password })})
    if(!res.ok){ setErr("Invalid"); return }
    const data=await res.json()
    localStorage.setItem("admin_token",data.token)
    window.location.href="/admin/dashboard"
  }
  async function signup(){
    setErr(null)
    if(!username || !password){ setErr("Username and password required"); return }
    const res=await fetch(`${API_BASE}/admin/bootstrap`,{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ username,password })})
    if(!res.ok){
      const t=await res.json().catch(()=>({}))
      setErr(t?.error||"Sign up failed")
      return
    }
    await login()
  }
  return (
    <div className="p-6 max-w-sm mx-auto">
      <h2 className="text-xl font-semibold mb-4">{mode==="login"?"Admin Login":"Create Admin"}</h2>
      <div className="flex gap-2 mb-4">
        <Button onClick={()=>setMode("login")} variant={mode==="login" ? "default" : "outline"}>Login</Button>
        <Button onClick={()=>setMode("signup")} variant={mode==="signup" ? "default" : "outline"}>Sign up</Button>
      </div>
      <input className="border rounded w-full p-2 mb-2" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} />
      <input className="border rounded w-full p-2 mb-2" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      {err&&<div className="text-red-600 text-sm mb-2">{err}</div>}
      {mode==="login" ? (
        <Button onClick={login} className="w-full">Login</Button>
      ) : (
        <Button onClick={signup} className="w-full">Sign up</Button>
      )}
    </div>
  )
}
