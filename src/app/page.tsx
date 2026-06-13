"use client"

import { Headset, Loader2, LogIn } from "lucide-react"
import { useState } from "react"
import { login } from "@/lib/actions/auth"
import { useRouter } from "next/navigation"

export default function LoginScreen() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      setError("Por favor, ingresa tu correo y contraseña")
      return
    }

    setLoading(true)
    setError("")
    
    const res = await login(username, password)
    
    if (res.success) {
      router.push("/home")
    } else {
      setError(res.error || "Credenciales incorrectas")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 sm:p-4">
      {/* Mobile Frame Container */}
      <div className="w-full h-[100dvh] sm:h-[844px] max-w-[390px] bg-[#681984] sm:rounded-[3rem] overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col font-sans border-4 border-slate-800 sm:border-[#333]">
        
        {/* Status Bar (Simulated) */}
        <div className="flex justify-between items-center px-6 pt-3 text-white text-sm font-semibold relative z-20">
          <span>12:30</span>
          <div className="flex gap-1.5 items-center">
            <div className="flex gap-0.5 items-end h-3">
              <div className="w-1 bg-white h-1.5 rounded-sm"></div>
              <div className="w-1 bg-white h-2 rounded-sm"></div>
              <div className="w-1 bg-white h-2.5 rounded-sm"></div>
              <div className="w-1 bg-white h-3 rounded-sm"></div>
            </div>
            <div className="ml-1 w-6 h-3 border border-white/50 rounded-[3px] relative flex items-center p-[1px]">
              <div className="bg-white w-full h-full rounded-[1px]"></div>
              <div className="absolute -right-[3px] bg-white/50 w-[2px] h-1.5 rounded-r-sm"></div>
            </div>
          </div>
        </div>

        {/* Top Section with Branding */}
        <div className="flex-none px-6 pt-2 pb-10 flex flex-col items-center relative z-10">
          <div className="w-full flex justify-end">
            <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors text-white text-sm font-medium px-4 py-2 rounded-full backdrop-blur-sm">
              <Headset size={16} />
              <span>Ayuda</span>
            </button>
          </div>
          
          <div className="mt-12 mb-4 flex flex-col items-center">
            {/* Logo */}
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.2)] mb-4">
              <span className="text-[#00b5ad] font-bold text-2xl tracking-tighter">Mi<br/>Home</span>
            </div>
            <h1 className="text-white text-2xl font-bold">Billetera Digital</h1>
            <p className="text-white/80 text-sm mt-1">Conectado a InversionesPRO</p>
          </div>
        </div>

        {/* Bottom Sheet - Form */}
        <div className="flex-1 bg-white rounded-t-[2rem] p-8 flex flex-col relative z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
          <h2 className="text-[#4a1862] text-[22px] font-bold text-center mb-6">
            Inicia Sesión
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-1">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700 ml-1">Correo electrónico / Usuario</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="h-14 rounded-xl border border-gray-200 bg-gray-50 px-4 text-base focus:border-[#00b5ad] focus:ring-1 focus:ring-[#00b5ad] focus:outline-none transition-all"
                disabled={loading}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700 ml-1">Contraseña</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-14 rounded-xl border border-gray-200 bg-gray-50 px-4 text-base focus:border-[#00b5ad] focus:ring-1 focus:ring-[#00b5ad] focus:outline-none transition-all"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-500 text-sm p-3 rounded-lg border border-red-100 flex items-center justify-center text-center">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="mt-4 h-14 w-full bg-[#00b5ad] hover:bg-[#009c95] text-white font-semibold text-lg rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70 shadow-lg shadow-[#00b5ad]/30"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  Ingresar
                  <LogIn className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          {/* Link */}
          <div className="text-center pb-2 mt-auto pt-6">
            <button className="text-[#681984] hover:text-[#4a1862] font-medium text-[15px] transition-colors">
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
