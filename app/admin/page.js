"use client"
import { useEffect } from "react"
export default function AdminIndex(){
  useEffect(()=>{
    const t=typeof window!=="undefined"?localStorage.getItem("admin_token"):null
    window.location.replace(t?"/admin/dashboard":"/admin/login")
  },[])
  return null
}
