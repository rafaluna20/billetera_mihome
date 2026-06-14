"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import QRCode from "react-qr-code"
import { Lock, Smartphone, Headset, Fingerprint, Delete, LogIn, Loader2, Eye, EyeOff } from "lucide-react"
import { login } from "@/lib/actions/auth"

type AuthStep = "loading" | "register" | "create_pin" | "pin_login"

export default function LoginScreen() {
  const router = useRouter()
  const [step, setStep] = useState<AuthStep>("loading")
  
  // Registration state
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  
  // PIN state
  const [pin, setPin] = useState("")
  const [expectedPin, setExpectedPin] = useState("")
  const [keypadNums, setKeypadNums] = useState<number[]>([])
  const [bottomNum, setBottomNum] = useState<number>(0)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Initialize and check saved credentials
  useEffect(() => {
    const savedPin = localStorage.getItem("yape_pin")
    const savedEmail = localStorage.getItem("yape_email")
    const savedPwd = localStorage.getItem("yape_pwd")

    if (savedPin && savedEmail && savedPwd) {
      setExpectedPin(savedPin)
      setUsername(savedEmail)
      setPassword(savedPwd)
      setStep("pin_login")
      shuffleKeypad()
    } else {
      setStep("register")
    }
  }, [])

  const shuffleKeypad = () => {
    const nums = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]]
    }
    const bottom = nums.pop()!
    setKeypadNums(nums)
    setBottomNum(bottom)
  }

  // ─── STEP 1: LOGIN (Register device) ───────────────────────────────────────
  const handleRegisterLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      setError("Ingresa usuario y contraseña")
      return
    }
    setLoading(true)
    setError("")
    
    // Validar con Odoo
    const res = await login(username, password)
    setLoading(false)
    if (res.success) {
      // Guardar temporalmente y pedir PIN
      setStep("create_pin")
      shuffleKeypad()
    } else {
      setError(res.error || "Credenciales incorrectas")
    }
  }

  // ─── STEP 2 & 3: PIN PAD LOGIC ─────────────────────────────────────────────
  const handlePinPress = async (val: string | number) => {
    if (val === "DEL") {
      setPin(prev => prev.slice(0, -1))
      setError("")
      return
    }
    if (pin.length < 6) {
      const newPin = pin + val
      setPin(newPin)
      
      // Auto-submit when 6 digits reached
      if (newPin.length === 6) {
        if (step === "create_pin") {
          // Guardar todo en localStorage
          localStorage.setItem("yape_pin", newPin)
          localStorage.setItem("yape_email", username)
          localStorage.setItem("yape_pwd", password)
          window.location.href = "/home"
        } else if (step === "pin_login") {
          // Validar PIN y hacer login real
          if (newPin === expectedPin) {
            setLoading(true)
            const res = await login(username, password)
            if (res.success) {
              window.location.href = "/home"
            } else {
              setLoading(false)
              setPin("")
              setError("Error de conexión, intenta de nuevo")
            }
          } else {
            setError("Clave incorrecta")
            setPin("")
          }
        }
      }
    }
  }

  const resetAccount = () => {
    localStorage.removeItem("yape_pin")
    localStorage.removeItem("yape_email")
    localStorage.removeItem("yape_pwd")
    setUsername("")
    setPassword("")
    setPin("")
    setError("")
    setStep("register")
  }

  if (step === "loading") return <div className="min-h-screen bg-[#681984]" />

  const qrPayload = JSON.stringify({ type: "MHOME_PAY", app: "MiHome Billetera" })

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 sm:p-4">
      {/* Mobile Frame */}
      <div className="w-full h-[100dvh] sm:h-[844px] max-w-[390px] bg-[#681984] sm:rounded-[3rem] overflow-hidden relative shadow-[0_0_60px_rgba(104,25,132,0.5)] flex flex-col font-sans border-4 border-slate-800 sm:border-[#333]">

        {/* Decorative blobs (solo visibles en register para no ensuciar el de PIN) */}
        {step === "register" && (
          <>
            <div className="absolute top-[-60px] right-[-60px] w-64 h-64 bg-[#9b2dba]/25 rounded-full blur-3xl z-0" />
            <div className="absolute top-[100px] left-[-50px] w-48 h-48 bg-[#00b5ad]/15 rounded-full blur-3xl z-0" />
          </>
        )}

        {/* ─── PANTALLA: LOGIN INICIAL (REGISTRO) ─── */}
        {step === "register" && (
          <div className="flex-1 flex flex-col h-full z-10">
            <div className="flex-none px-6 pt-10 pb-6 flex flex-col items-center">
              <div className="w-[120px] h-[120px] bg-white rounded-3xl p-3 shadow-lg mb-4 flex items-center justify-center">
                <QRCode value={qrPayload} size={100} fgColor="#4a1862" />
              </div>
              <p className="text-white font-bold text-lg">MiHome Billetera</p>
            </div>

            <div className="flex-1 bg-white rounded-t-[2.5rem] px-7 pt-8 pb-10 flex flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.15)] mt-auto">
              <h2 className="text-[#4a1862] text-[20px] font-bold mb-1">Vincula tu cuenta</h2>
              <p className="text-gray-400 text-[13px] mb-6">Ingresa con tus credenciales para registrar este dispositivo.</p>

              <form onSubmit={handleRegisterLogin} className="flex flex-col gap-4 flex-1">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[#4a1862]/70 uppercase ml-1">Correo</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="usuario@correo.com"
                    className="h-[52px] rounded-2xl border-2 border-[#f0eaf6] bg-[#faf8fc] px-4 text-gray-900 text-[15px] focus:border-[#681984] focus:outline-none placeholder:text-gray-400"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[#4a1862]/70 uppercase ml-1">Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-[52px] rounded-2xl border-2 border-[#f0eaf6] bg-[#faf8fc] px-4 pr-12 text-gray-900 text-[15px] focus:border-[#681984] focus:outline-none placeholder:text-gray-400"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && <p className="text-red-500 text-[13px]">{error}</p>}

                <button type="submit" disabled={loading} className="mt-auto h-[54px] w-full bg-[#681984] text-white font-bold text-[16px] rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg">
                  {loading ? <Loader2 size={19} className="animate-spin" /> : "Continuar"}
                </button>

                <div className="text-center mt-3 mb-1">
                  <p className="text-gray-500 text-[13px]">
                    ¿No tienes una billetera digital?{" "}
                    <button 
                      type="button" 
                      onClick={() => alert("El registro se realiza desde la plataforma web principal.")}
                      className="text-[#00b5ad] font-bold"
                    >
                      Regístrate
                    </button>
                  </p>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── PANTALLA: PIN PAD (INGRESO O CREACIÓN) ─── */}
        {(step === "pin_login" || step === "create_pin") && (
          <div className="flex-1 flex flex-col h-full z-10 relative">
            
            {/* Loading Overlay */}
            {loading && (
              <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-sm flex flex-col items-center justify-center">
                <Loader2 size={40} className="text-[#681984] animate-spin mb-4" />
                <p className="text-[#4a1862] font-bold">Iniciando sesión...</p>
              </div>
            )}

            {/* QR Section */}
            <div className="flex-none px-6 pt-10 pb-6 flex flex-col items-center">
              <div className="bg-white rounded-[1.5rem] p-3 shadow-lg flex flex-col items-center relative">
                <div className="w-[140px] h-[140px] flex items-center justify-center">
                  <QRCode value={qrPayload} size={130} fgColor="#4a1862" />
                </div>
                {/* Yape-style center logo over QR */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-[#00b5ad] rounded-[10px] flex items-center justify-center border-[2.5px] border-white shadow-md">
                  <span className="text-white font-black text-[10px] leading-tight text-center">Mi<br/>Home</span>
                </div>
              </div>
            </div>

            {/* Action Buttons (Olvido de clave, Cambio de número, Ayuda) */}
            <div className="flex justify-center gap-6 px-6 pb-6">
              <button onClick={resetAccount} className="flex flex-col items-center gap-2">
                <div className="w-[52px] h-[52px] bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Lock size={22} className="text-white" />
                </div>
                <span className="text-white font-medium text-[11px] max-w-[60px] text-center leading-tight">
                  {step === "create_pin" ? "Cancelar" : "Olvido de clave"}
                </span>
              </button>
              
              <button className="flex flex-col items-center gap-2">
                <div className="w-[52px] h-[52px] bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <div className="relative">
                    <Smartphone size={22} className="text-white" />
                    <div className="absolute -bottom-1 -right-1 bg-[#681984] rounded-full p-0.5 border-2 border-[#681984]">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M17 1l4 4-4 4M7 23l-4-4 4-4M21 5H9a2 2 0 00-2 2v1M3 19h12a2 2 0 002-2v-1"/></svg>
                    </div>
                  </div>
                </div>
                <span className="text-white font-medium text-[11px] max-w-[60px] text-center leading-tight">
                  Cambio de número
                </span>
              </button>

              <button className="flex flex-col items-center gap-2">
                <div className="w-[52px] h-[52px] bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Headset size={22} className="text-white" />
                </div>
                <span className="text-white font-medium text-[11px] text-center leading-tight">
                  Ayuda
                </span>
              </button>
            </div>

            {/* Bottom Sheet — Keypad */}
            <div className="flex-1 bg-white rounded-t-[2.5rem] px-7 pt-8 pb-8 flex flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.15)] mt-auto">
              <h2 className="text-[#4a1862] text-[19px] font-bold text-center mb-4">
                {step === "create_pin" ? "Crea tu clave de 6 dígitos" : "Ingresa con tu clave"}
              </h2>

              {/* PIN Dots */}
              <div className="flex justify-center gap-3 mb-6">
                {[...Array(6)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-3.5 h-3.5 rounded-full transition-all ${i < pin.length ? 'bg-[#00b5ad]' : 'bg-gray-200'}`}
                  />
                ))}
              </div>

              {error && <p className="text-red-500 text-[13px] text-center font-medium -mt-2 mb-2">{error}</p>}

              {/* Keypad */}
              <div className="mt-auto grid grid-cols-3 gap-x-4 gap-y-3 px-2">
                {/* Top 9 numbers */}
                {keypadNums.map((num, i) => (
                  <button
                    key={i}
                    onClick={() => handlePinPress(num)}
                    className="h-[52px] bg-[#f5f6f8] hover:bg-[#e4e6eb] active:bg-[#d5d7dc] text-[#4a1862] font-semibold text-[24px] rounded-xl flex items-center justify-center transition-colors"
                  >
                    {num}
                  </button>
                ))}
                
                {/* Bottom row: Fingerprint, remaining num, Delete */}
                <button className="h-[52px] flex items-center justify-center text-[#681984]">
                  <Fingerprint size={32} strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => handlePinPress(bottomNum)}
                  className="h-[52px] bg-[#f5f6f8] hover:bg-[#e4e6eb] active:bg-[#d5d7dc] text-[#4a1862] font-semibold text-[24px] rounded-xl flex items-center justify-center transition-colors"
                >
                  {bottomNum}
                </button>
                <button
                  onClick={() => handlePinPress("DEL")}
                  className="h-[52px] bg-[#f5f6f8] hover:bg-[#e4e6eb] active:bg-[#d5d7dc] rounded-xl flex items-center justify-center text-gray-500 transition-colors"
                >
                  <Delete size={22} className="ml-1" />
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  )
}
