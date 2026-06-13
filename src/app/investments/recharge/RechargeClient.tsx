"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, X, CheckCircle2, AlertCircle, Loader2, Share2, Calendar, Clock, TrendingUp, Building2 } from "lucide-react"
import { rechargeInvestment } from "@/lib/actions/investments"

type Step = "amount" | "confirm" | "success" | "error"

interface RechargeClientProps {
  walletBalance: number
  accountNumber: string
}

export default function RechargeClient({ walletBalance, accountNumber }: RechargeClientProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>("amount")
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [txRef, setTxRef] = useState("")

  const numAmount = parseFloat(amount) || 0

  const handleKeyPress = (key: string) => {
    if (key === "back") {
      setAmount(prev => prev.slice(0, -1))
    } else {
      if (amount.includes(".") && key === ".") return
      if (amount.split(".")[1]?.length >= 2) return
      setAmount(prev => prev + key)
    }
  }

  const handleConfirmAmount = () => {
    if (isNaN(numAmount) || numAmount < 10) {
      alert("El monto mínimo es S/ 10.00")
      return
    }
    if (numAmount > walletBalance) {
      alert(`Saldo insuficiente. Tu saldo disponible es S/ ${walletBalance.toFixed(2)}`)
      return
    }
    setStep("confirm")
  }

  const handleTransfer = async () => {
    setLoading(true)
    try {
      const res = await rechargeInvestment(numAmount)
      if (res.success) {
        setTxRef(res.reference)
        setStep("success")
      } else {
        setErrorMsg(res.error || "Error en la transacción")
        setStep("error")
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Algo salió mal")
      setStep("error")
    } finally {
      setLoading(false)
    }
  }

  const isInsufficient = numAmount > walletBalance && numAmount > 0
  const isBelowMinimum = numAmount > 0 && numAmount < 10

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 sm:p-4">
      <div className="w-full h-[100dvh] sm:h-[844px] max-w-[390px] bg-white sm:rounded-[3rem] overflow-hidden relative shadow-[0_0_60px_rgba(104,25,132,0.5)] flex flex-col font-sans border-4 border-slate-800 sm:border-[#333]">

        {/* Header */}
        {step !== "success" && (
          <div className="flex items-center justify-between px-6 pt-12 pb-4 bg-[#681984] text-white">
            <button onClick={() => step === "amount" ? router.back() : setStep("amount")} className="p-1">
              <ArrowLeft size={24} />
            </button>
            <span className="font-bold text-[16px]">Transferir a Inversiones</span>
            <div className="w-6" />
          </div>
        )}

        {/* ── AMOUNT STEP ── */}
        {step === "amount" && (
          <div className="flex-1 flex flex-col bg-[#681984]">
            <div className="flex flex-col items-center justify-center pt-6 pb-8 text-white">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-3 shadow-lg">
                <Building2 size={32} className="text-[#681984]" />
              </div>
              <h2 className="text-[20px] font-bold text-center leading-tight">InversionesPRO</h2>
              <p className="text-white/60 text-[14px]">Plataforma de Inversión</p>
            </div>

            {/* Amount Display */}
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-end gap-1">
                <span className="text-white/70 text-[24px] font-bold mb-1">S/</span>
                <span className={`text-[56px] font-medium leading-none ${amount ? (isInsufficient ? 'text-red-300' : 'text-white') : 'text-white/30'}`}>
                  {amount || "0"}
                </span>
              </div>
            </div>

            {/* Balance info */}
            <div className="text-center mb-2">
              <p className="text-white/60 text-[13px]">
                Saldo disponible:{" "}
                <span className="font-bold text-white">
                  S/ {walletBalance.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </span>
              </p>
              {isInsufficient && (
                <p className="text-red-300 text-[12px] mt-1 font-semibold">
                  ⚠️ Saldo insuficiente
                </p>
              )}
              {isBelowMinimum && !isInsufficient && (
                <p className="text-red-300 text-[12px] mt-1 font-semibold">
                  ⚠️ El monto mínimo es S/ 10.00
                </p>
              )}
            </div>

            {/* Quick amount shortcuts */}
            <div className="flex justify-center gap-2 px-6 mb-4">
              {[50, 100, 200, 500].map(q => (
                <button
                  key={q}
                  onClick={() => q <= walletBalance ? setAmount(String(q)) : null}
                  disabled={q > walletBalance}
                  className="flex-1 py-1.5 rounded-xl text-[12px] font-bold border border-white/30 text-white/80 hover:bg-white/10 disabled:opacity-30 transition-colors"
                >
                  S/{q}
                </button>
              ))}
            </div>

            {/* Keypad */}
            <div className="bg-white rounded-t-[2rem] pt-6 pb-8 px-6 shadow-[0_-8px_30px_rgba(0,0,0,0.1)]">
              <div className="grid grid-cols-3 gap-y-6 gap-x-4 mb-8">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"].map((key) => (
                  <button
                    key={key}
                    onClick={() => handleKeyPress(key)}
                    className="h-14 rounded-2xl text-[24px] font-medium text-gray-800 active:bg-gray-100 transition-colors"
                  >
                    {key}
                  </button>
                ))}
                <button
                  onClick={() => handleKeyPress("back")}
                  className="h-14 rounded-2xl flex items-center justify-center active:bg-gray-100 transition-colors"
                >
                  <X size={24} className="text-gray-800" />
                </button>
              </div>

              <button
                onClick={handleConfirmAmount}
                disabled={!amount || numAmount < 10 || isInsufficient}
                className="w-full h-[54px] bg-[#00b5ad] hover:bg-[#009c95] text-white font-bold text-[16px] rounded-2xl shadow-[0_4px_16px_rgba(0,181,173,0.35)] disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.98]"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* ── CONFIRM STEP ── */}
        {step === "confirm" && (
          <div className="flex-1 flex flex-col p-6 bg-[#faf8fc]">
            <h2 className="text-[#4a1862] text-[20px] font-bold mb-6">Confirma tu recarga</h2>

            <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-[#f0eaf6] flex flex-col items-center">
              <div className="w-14 h-14 bg-[#f5f0fa] rounded-full flex items-center justify-center mb-3">
                <Building2 size={24} className="text-[#681984]" />
              </div>
              <p className="text-gray-900 font-bold text-[18px]">InversionesPRO</p>
              <p className="text-gray-500 text-[13px] mb-5">Cuenta de Inversión</p>

              <div className="w-full h-px bg-gray-100 mb-5" />

              <div className="w-full flex justify-between font-bold">
                <span className="text-gray-700 text-[15px]">Monto a recargar</span>
                <span className="text-[#681984] text-[18px]">S/ {numAmount.toFixed(2)}</span>
              </div>

              <div className="w-full flex justify-between mt-2">
                <span className="text-gray-500 text-[13px]">Tu saldo disponible</span>
                <span className="text-gray-600 text-[13px] font-bold">S/ {walletBalance.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="w-full flex justify-between mt-2">
                <span className="text-gray-500 text-[13px]">Saldo tras transferencia</span>
                <span className="text-[#00b5ad] text-[13px] font-bold">S/ {(walletBalance - numAmount).toLocaleString("es-PE", { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="w-full flex justify-between mt-2">
                <span className="text-gray-500 text-[13px]">Comisión</span>
                <span className="text-[#00b5ad] text-[13px] font-bold">S/ 0.00</span>
              </div>
            </div>

            <div className="flex gap-3 mt-auto">
              <button onClick={() => setStep("amount")}
                className="flex-1 h-[54px] border-2 border-gray-200 text-gray-500 font-semibold rounded-2xl flex items-center justify-center gap-2">
                Cancelar
              </button>
              <button
                onClick={handleTransfer}
                disabled={loading}
                className="flex-[2] h-[54px] bg-[#681984] hover:bg-[#5a1570] text-white font-bold text-[16px] rounded-2xl flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(104,25,132,0.35)] active:scale-[0.98] disabled:opacity-60 transition-all"
              >
                {loading ? <><Loader2 size={18} className="animate-spin" /> Procesando...</> : "Confirmar Recarga"}
              </button>
            </div>
          </div>
        )}

        {/* ── SUCCESS STEP ── */}
        {step === "success" && (
          <div className="flex-1 flex flex-col bg-[#681984] relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-60">
              <div className="absolute top-[10%] left-[20%] w-3 h-8 bg-[#00b5ad] rotate-45 rounded-sm" />
              <div className="absolute top-[15%] right-[25%] w-4 h-6 bg-[#f59e0b] -rotate-12 rounded-sm" />
              <div className="absolute top-[5%] right-[10%] w-3 h-10 bg-[#cba3d6] rotate-12 rounded-sm" />
              <div className="absolute top-[30%] left-[5%] w-5 h-12 bg-[#00b5ad] rotate-[60deg] rounded-sm" />
            </div>

            <div className="flex justify-between items-center px-6 pt-12 pb-4 relative z-10">
              <div className="flex items-center gap-1">
                <div className="w-8 h-8 bg-[#00b5ad] rounded-full flex items-center justify-center -ml-2 border border-white">
                  <span className="text-white text-[10px] font-black leading-none">S/</span>
                </div>
                <span className="text-white font-bold text-2xl italic tracking-tight font-serif">MiHome</span>
              </div>
              <button onClick={() => router.push("/investments")} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <X size={20} className="text-white" />
              </button>
            </div>

            <div className="px-5 relative z-10">
              <div className="bg-white rounded-[1.5rem] p-6 shadow-xl">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-[#681984] font-bold text-[22px]">¡Recarga Exitosa!</h2>
                  <button className="flex items-center gap-1 text-[#00b5ad] font-semibold text-[14px]">
                    <Share2 size={16} /> Compartir
                  </button>
                </div>

                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-[#4a1862] text-[28px] font-semibold">S/</span>
                  <span className="text-[#4a1862] text-[52px] font-medium leading-none tracking-tight">
                    {numAmount.toFixed(2).replace(".00", "")}
                  </span>
                </div>

                <p className="text-gray-900 font-bold text-[20px] mb-2">InversionesPRO*</p>

                <div className="flex items-center gap-2 text-gray-500 text-[13px] mb-4">
                  <Calendar size={14} />
                  <span>{new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span className="text-gray-300">|</span>
                  <Clock size={14} />
                  <span>{new Date().toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                </div>

                <div className="h-px bg-gray-100 my-5" />

                <div className="mb-2">
                  <span className="text-gray-500 text-[11px] font-bold tracking-wider">DATOS DE LA TRANSACCIÓN</span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-[14px]">Origen</span>
                    <span className="text-gray-800 text-[14px] font-medium">Billetera MiHome</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-[14px]">Destino</span>
                    <span className="text-gray-800 text-[14px] font-medium">Plataforma InversionesPRO</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-[14px]">Nro. de operación</span>
                    <span className="text-gray-800 text-[14px] font-medium">{txRef}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-[14px]">N° de cuenta</span>
                    <span className="text-gray-800 text-[14px] font-medium">{accountNumber || "—"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 mt-6 bg-[#5a1570] rounded-t-[1.5rem] p-5 relative z-10 flex flex-col gap-3">
              <h3 className="text-white font-bold text-[16px]">Tus inversiones crecen</h3>
              <div className="w-full bg-gradient-to-r from-[#e6faf9] to-[#b3f0ec] rounded-2xl p-4 flex justify-between items-center shadow-lg">
                <div>
                  <span className="bg-[#00b5ad] text-white text-[10px] font-bold px-2 py-1 rounded-md">Tip Financiero</span>
                  <p className="font-bold text-[#006661] text-[14px] mt-2 leading-tight">Mantén tu saldo<br/>invertido y gana más</p>
                </div>
                <TrendingUp size={40} className="text-[#00b5ad]" />
              </div>
            </div>
          </div>
        )}

        {/* ── ERROR STEP ── */}
        {step === "error" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
            <div className="w-24 h-24 bg-red-50 border-2 border-red-100 rounded-full flex items-center justify-center mb-5">
              <AlertCircle size={50} className="text-red-400" />
            </div>
            <h2 className="text-gray-800 font-bold text-[22px] mb-2">Algo salió mal</h2>
            <p className="text-gray-400 text-[14px] mb-8 px-4">{errorMsg}</p>
            <button onClick={() => { setStep("amount"); setErrorMsg("") }}
              className="w-full h-[54px] bg-[#681984] text-white font-bold rounded-2xl">
              Intentar de nuevo
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
