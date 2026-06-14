"use client"

import { LogOut } from "lucide-react"
import { logout } from "@/lib/actions/auth"

export function LogoutButton() {
  const handleLogout = async () => {
    // 1. Limpiar rastro local criptográfico y obsoleto
    localStorage.removeItem("yape_pin_hash")
    localStorage.removeItem("yape_email")
    localStorage.removeItem("yape_pin")
    localStorage.removeItem("yape_pwd")
    
    // 2. Destruir sesión en el servidor y redirigir
    await logout()
  }

  return (
    <button onClick={handleLogout} className="w-9 h-9 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl flex items-center justify-center transition-colors">
      <LogOut size={14} className="text-white/80" />
    </button>
  )
}
