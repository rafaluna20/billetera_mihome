"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  X, Smartphone, ChevronRight, ArrowLeft,
  Loader2, AlertCircle, User, QrCode,
  Mail, CreditCard, Share2, Calendar, Clock, MessageSquare
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { searchWalletUsers, transferFunds, type ResultadoTransferencia, type TipoBusqueda, type WalletContact } from "@/lib/actions/transfer"
import QRScanner from "@/components/QRScanner"
import { obtenerLimites, type LimitesBilletera } from "@/lib/actions/wallet"

type Step =
  | "menu"
  | "por_numero"
  | "por_correo"
  | "por_cuenta"
  | "qr"
  | "amount"
  | "confirm"
  | "success"
  | "error"

interface Recipient {
  name: string
  phone?: string
  email?: string
  account_number?: string
}

const avatarColors = [
  "bg-purple-600","bg-indigo-600","bg-pink-600",
  "bg-orange-500","bg-teal-600","bg-blue-600",
]
function colorForName(name: string) {
  return avatarColors[name.charCodeAt(0) % avatarColors.length]
}
const MIN_CONSULTA = 3
function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
}

// ─── Reutilizable: Pantalla de input + lista de sugerencias ──────────────────
function SearchInputScreen({
  title,
  placeholder,
  inputType,
  icon: Icon,
  iconColor,
  onSelect,
  onBack,
  suggestionsKey,
}: {
  title: string
  placeholder: string
  inputType: string
  icon: LucideIcon
  iconColor: string
  onSelect: (r: Recipient) => void
  onBack: () => void
  suggestionsKey: "phone" | "email" | "account_number"
}) {
  const [query, setQuery] = useState("")
  const [contacts, setContacts] = useState<WalletContact[]>([])
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState("")
  const tipoBusqueda: TipoBusqueda = suggestionsKey === "account_number" ? "account" : suggestionsKey
  const consultaLista = query.trim().length >= MIN_CONSULTA

  useEffect(() => {
    if (!consultaLista) return
    let vigente = true
    const temporizador = setTimeout(async () => {
      setLoading(true)
      const r = await searchWalletUsers(query, tipoBusqueda)
      if (!vigente) return // llegó tarde: ya se escribió otra cosa
      setContacts(r)
      setLoading(false)
    }, 350)
    return () => {
      vigente = false
      clearTimeout(temporizador)
    }
  }, [query, tipoBusqueda, consultaLista])
  const resultados = consultaLista ? contacts : []

  // Lo que se escribe a mano se verifica con el banco: solo se sigue si existe una billetera con ese dato,
  // y el nombre que se muestra es el del banco, no lo que escribió quien envía.
  const confirmManual = async () => {
    const texto = query.trim()
    if (texto.length < MIN_CONSULTA) return
    setNotice("")
    setLoading(true)
    const r = await searchWalletUsers(texto, tipoBusqueda)
    setLoading(false)
    if (r.length === 1) {
      onSelect(r[0])
      return
    }
    setContacts(r)
    setNotice(r.length === 0 ? "No encontramos una billetera con ese dato." : "Hay varios resultados: elige uno de la lista.")
  }

  return (
    <>
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={onBack}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <h1 className="text-gray-900 font-bold text-[20px]">{title}</h1>
        </div>

        {/* Input */}
        <div className={`flex items-center gap-3 border-2 border-[#681984] bg-[#faf8fc] rounded-2xl px-4 py-3.5`}>
          <Icon size={20} className={iconColor} />
          <input
            autoFocus
            type={inputType}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && confirmManual()}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-[15px] text-gray-800 placeholder-gray-300 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")}>
              <X size={15} className="text-gray-400" />
            </button>
          )}
        </div>

        {/* Confirm manual button */}
        {consultaLista && (
          <button
            onClick={confirmManual}
            disabled={loading}
            className="mt-3 w-full flex items-center justify-between bg-[#f5f0fa] border border-[#e8dff0] rounded-2xl px-4 py-3 hover:bg-[#ede6f6] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#681984] rounded-xl flex items-center justify-center">
                <Icon size={17} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-[#4a1862] font-bold text-[14px]">{query}</p>
                <p className="text-gray-400 text-[11px]">Usar este {suggestionsKey === "phone" ? "número" : suggestionsKey === "email" ? "correo" : "número de cuenta"}</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-[#681984]" />
          </button>
        )}
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-3">
          <p className="text-gray-500 text-[12px] font-semibold uppercase tracking-wider">
            {consultaLista ? "Resultados" : "Buscar una billetera"}
          </p>
        </div>

        {loading && consultaLista ? (
          <div className="flex justify-center py-8">
            <Loader2 size={22} className="text-[#681984] animate-spin" />
          </div>
        ) : resultados.length === 0 ? (
          <div className="flex flex-col items-center py-12 px-6 text-center">
            <User size={38} className="text-gray-200 mb-3" />
            <p className="text-gray-400 text-[14px]">
              {notice || (consultaLista ? "No se encontraron resultados" : `Escribe al menos ${MIN_CONSULTA} caracteres para buscar`)}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 px-3">
            {resultados.map((c, i) => {
              const displayValue =
                suggestionsKey === "phone" ? c.phone :
                suggestionsKey === "email" ? c.email :
                c.account_number
              if (!displayValue) return null
              return (
                <button
                  key={i}
                  onClick={() => onSelect(c)}
                  className="w-full flex items-center gap-4 px-3 py-3.5 hover:bg-gray-50 rounded-2xl transition-colors text-left"
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${colorForName(c.name)}`}>
                    <span className="text-white font-bold text-[13px]">{getInitials(c.name)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-bold text-[15px] leading-tight">{c.name}</p>
                    <p className="text-gray-400 text-[13px] mt-0.5 truncate">{displayValue}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function YapearPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("menu")
  const [recipient, setRecipient] = useState<Recipient | null>(null)
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [txResult, setTxResult] = useState<ResultadoTransferencia["transaction"] | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  // PIN de operaciones: lo valida el servidor en cada transferencia; aquí no se guarda
  const [pin, setPin] = useState("")
  const [pinError, setPinError] = useState("")
  // Clave de idempotencia del envío en curso: se reutiliza en los reintentos mientras no cambien destino ni monto.
  const llaveEnvio = useRef<{ firma: string; llave: string } | null>(null)
  // Límites reales de la cuenta (los que aplica el banco). Mientras no lleguen, no se muestra ninguna cifra.
  const [limites, setLimites] = useState<LimitesBilletera | null>(null)
  useEffect(() => {
    obtenerLimites().then(setLimites)
  }, [])

  const selectRecipient = (r: Recipient) => {
    setRecipient(r)
    setStep("amount")
  }

  const handleQRScan = async (raw: string) => {
    // El QR lo puede fabricar cualquiera: solo se toma el número de cuenta, y el nombre que se muestra
    // es el que devuelve el banco para esa cuenta (un QR falso no puede hacerse pasar por otra persona).
    // QR de un comercio (bodega, restaurante): se paga en su propia pantalla.
    if (raw.startsWith("MIHOME1|") && raw.length <= 120) {
      router.push(`/pagar?qr=${encodeURIComponent(raw)}`)
      return
    }
    let cuenta = ""
    try {
      const data = raw.length <= 1000 ? JSON.parse(raw) : null
      if (data?.type === "MHOME_PAY" && typeof data.account === "string") cuenta = data.account.trim().toUpperCase()
    } catch {
      /* no es JSON */
    }
    if (!cuenta) {
      setErrorMsg("El QR no es válido para MiHome")
      setStep("error")
      return
    }
    const encontrados = await searchWalletUsers(cuenta, "account")
    if (encontrados.length !== 1) {
      setErrorMsg("Esa cuenta no existe o no está activa.")
      setStep("error")
      return
    }
    selectRecipient(encontrados[0])
  }

  const handleKey = (val: string) => {
    if (val === "DEL") { setAmount(p => p.slice(0, -1)); return }
    if (val === "." && amount.includes(".")) return
    if (amount.replace(".", "").length >= 8) return
    setAmount(p => p + val)
  }

  const handleTransfer = async () => {
    if (!recipient || !amount) return
    const num = parseFloat(amount)
    if (isNaN(num) || num <= 0) { setErrorMsg("Monto inválido"); return }
    if (!/^\d{4,6}$/.test(pin)) { setPinError("Ingresa tu clave (4 a 6 dígitos) para confirmar."); return }
    setPinError("")
    const destino = recipient.account_number || recipient.email || recipient.phone || recipient.name
    const firma = `${destino}|${num}`
    if (llaveEnvio.current?.firma !== firma) llaveEnvio.current = { firma, llave: `TXN-${crypto.randomUUID()}` }
    setLoading(true)
    let res: Awaited<ReturnType<typeof transferFunds>>
    try {
      res = await transferFunds({
      llave: llaveEnvio.current.llave,
      pin,
      // Con número de cuenta se usa solo ese (correo y teléfono de un contacto llegan enmascarados)
      destinationAccountNumber: recipient.account_number,
      destinationEmail: recipient.account_number ? undefined : recipient.email,
      destinationPhone: recipient.account_number ? undefined : recipient.phone,
      amount: num,
      description: description || `Yapeo a ${recipient.name}`,
      })
    } catch {
      // Se cortó la conexión (o el servidor tardó demasiado): no se sabe si se envió. Nunca dejar la pantalla colgada.
      setLoading(false)
      setPinError("Se perdió la conexión. Toca «¡Yapear ahora!» otra vez: si ya se envió, no se enviará dos veces.")
      return
    }
    setLoading(false)
    setPin("")
    if (res.success) { llaveEnvio.current = null; setTxResult(res.transaction ?? null); setStep("success") }
    else if (res.code?.startsWith("pin_")) {
      // Error de clave: se queda en la confirmación para reintentar (el servidor cuenta los intentos)
      setPinError(
        res.code === "pin_no_configurado"
          ? "Aún no tienes clave. Cierra sesión e ingresa de nuevo para crearla."
          : res.code === "pin_invalido" && res.intentosRestantes !== undefined
            ? `Clave incorrecta. Te quedan ${res.intentosRestantes} intento(s).`
            : res.error || "Clave incorrecta"
      )
    }
    else { setErrorMsg(res.error || "Error en la transferencia"); setStep("error") }
  }

  const compartirComprobante = async () => {
    const texto = `Yapeé S/ ${parseFloat(amount).toFixed(2)} a ${recipient?.name ?? ""}. Operación: ${txResult?.reference ?? "—"}`
    try {
      if (navigator.share) await navigator.share({ title: "Comprobante MiHome", text: texto })
      else await navigator.clipboard.writeText(texto)
    } catch {
      /* la persona canceló el menú de compartir */
    }
  }

  const menuOptions = [
    {
      id: "por_numero" as Step,
      label: "Por número de celular",
      sub: "Ingresa el número del destinatario",
      icon: Smartphone,
      bg: "bg-[#f3e8ff]",
      iconColor: "text-[#681984]",
      accent: "#681984",
    },
    {
      id: "por_correo" as Step,
      label: "Por correo electrónico",
      sub: "Busca por el email registrado",
      icon: Mail,
      bg: "bg-[#e8f5f5]",
      iconColor: "text-[#00b5ad]",
      accent: "#00b5ad",
    },
    {
      id: "por_cuenta" as Step,
      label: "Por número de cuenta",
      sub: "Ingresa el código WAL del usuario",
      icon: CreditCard,
      bg: "bg-[#fff8e8]",
      iconColor: "text-[#f59e0b]",
      accent: "#f59e0b",
    },
    {
      id: "qr" as Step,
      label: "Escanear código QR",
      sub: "Apunta al QR de la pantalla de inicio",
      icon: QrCode,
      bg: "bg-[#e8eeff]",
      iconColor: "text-[#4f6ef7]",
      accent: "#4f6ef7",
    },
  ]

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 sm:p-4">
      <div className="w-full h-[100dvh] sm:h-[844px] max-w-[390px] bg-white sm:rounded-[3rem] overflow-hidden relative flex flex-col font-sans border-4 border-slate-800 sm:border-[#333] shadow-[0_0_60px_rgba(0,0,0,0.5)]">

        {/* ── MENÚ PRINCIPAL ── */}
        {step === "menu" && (
          <>
            {/* Top purple header */}
            <div className="flex-shrink-0 bg-[#681984] px-6 pt-12 pb-8 relative overflow-hidden">
              <div className="absolute top-[-40px] right-[-40px] w-40 h-40 bg-white/5 rounded-full" />
              <div className="absolute bottom-[-20px] left-[-20px] w-28 h-28 bg-white/5 rounded-full" />
              <div className="relative flex items-center gap-3 mb-4">
                <button onClick={() => router.back()}
                  className="w-9 h-9 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center">
                  <X size={20} className="text-white" />
                </button>
                <h1 className="text-white font-bold text-[22px]">Yapear</h1>
              </div>
              <p className="text-white/60 text-[14px] ml-12">¿Cómo quieres enviar dinero?</p>
            </div>

            {/* Options list */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
              {menuOptions.map((opt, i) => (
                <button
                  key={opt.id}
                  onClick={() => setStep(opt.id)}
                  className="w-full flex items-center gap-4 bg-white border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50 rounded-3xl p-4 transition-all active:scale-[0.98] group"
                >
                  {/* Number badge */}
                  <div className="relative">
                    <div className={`w-14 h-14 ${opt.bg} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                      <opt.icon size={26} className={opt.iconColor} />
                    </div>
                    <div
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ backgroundColor: opt.accent }}
                    >
                      {i + 1}
                    </div>
                  </div>

                  <div className="flex-1 text-left">
                    <p className="text-gray-900 font-bold text-[15px] leading-tight">{opt.label}</p>
                    <p className="text-gray-400 text-[12px] mt-0.5">{opt.sub}</p>
                  </div>

                  <ChevronRight
                    size={20}
                    className="text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0"
                    style={{ color: undefined }}
                  />
                </button>
              ))}

              {/* Info card */}
              <div className="mt-2 bg-[#faf8fc] border border-[#f0eaf6] rounded-2xl p-4">
                <p className="text-[#681984] font-semibold text-[13px] mb-1.5">💡 Sin comisión</p>
                <p className="text-gray-400 text-[12px]">
                  Todos los yapeos dentro de MiHome son gratuitos e instantáneos. El dinero llega al instante.
                </p>
              </div>
            </div>
          </>
        )}

        {/* ── POR NÚMERO ── */}
        {step === "por_numero" && (
          <SearchInputScreen
            title="Por número de celular"
            placeholder="9XX XXX XXX"
            inputType="tel"
            icon={Smartphone}
            iconColor="text-[#681984]"
            suggestionsKey="phone"
            onSelect={selectRecipient}
            onBack={() => setStep("menu")}
          />
        )}

        {/* ── POR CORREO ── */}
        {step === "por_correo" && (
          <SearchInputScreen
            title="Por correo electrónico"
            placeholder="usuario@correo.com"
            inputType="email"
            icon={Mail}
            iconColor="text-[#00b5ad]"
            suggestionsKey="email"
            onSelect={selectRecipient}
            onBack={() => setStep("menu")}
          />
        )}

        {/* ── POR CUENTA ── */}
        {step === "por_cuenta" && (
          <SearchInputScreen
            title="Por número de cuenta"
            placeholder="WAL00000001"
            inputType="text"
            icon={CreditCard}
            iconColor="text-[#f59e0b]"
            suggestionsKey="account_number"
            onSelect={selectRecipient}
            onBack={() => setStep("menu")}
          />
        )}

        {/* ── QR SCANNER ── */}
        {step === "qr" && (
          <div className="flex-1 flex flex-col">
            <div className="flex-shrink-0 bg-[#681984] px-6 pt-12 pb-6">
              <div className="flex items-center gap-3">
                <button onClick={() => setStep("menu")}
                  className="w-9 h-9 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center">
                  <ArrowLeft size={18} className="text-white" />
                </button>
                <h1 className="text-white font-bold text-[20px]">Escanear código QR</h1>
              </div>
              <p className="text-white/60 text-[13px] mt-2 ml-12">
                Apunta la cámara al QR de la pantalla de inicio del destinatario
              </p>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8 gap-4">
              <QRScanner
                onScan={handleQRScan}
                onError={e => { setErrorMsg(e); setStep("error") }}
              />
            </div>
          </div>
        )}

        {/* ── AMOUNT ── */}
        {step === "amount" && recipient && (
          <div className="flex-1 flex flex-col bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-12 pb-2">
              <button onClick={() => setStep("menu")} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                <ArrowLeft size={22} className="text-gray-800" />
              </button>
              <h2 className="text-gray-900 font-bold text-[17px]">Yapear a</h2>
              <button onClick={() => setStep("menu")} className="p-2 -mr-2 rounded-full hover:bg-gray-100">
                <X size={22} className="text-gray-800" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col px-5 pt-4">
              {/* Name */}
              <h3 className="text-center text-[#681984] font-bold text-[22px] mb-6">
                {recipient.name}*
              </h3>

              {/* Amount Display */}
              <div className="flex justify-center items-baseline gap-1 mb-3">
                <span className="text-[#cba3d6] text-4xl font-semibold">S/</span>
                <div className="flex items-center">
                  <span className={`text-[72px] font-medium tracking-tight leading-none ${amount ? "text-[#681984]" : "text-gray-300"}`}>
                    {amount || "0"}
                  </span>
                  <div className="w-[2px] h-[60px] bg-[#681984] ml-1 animate-pulse" />
                </div>
              </div>

              {/* Limits Pill */}
              <div className="flex justify-center mb-8">
                {limites && (
                  <div className="bg-[#f8f9fa] text-gray-400 text-[11px] px-4 py-2 rounded-full font-medium">
                    Límite por yapeo S/{limites.porOperacion.toLocaleString("es-PE")}, límite total por día S/{limites.porDia.toLocaleString("es-PE")}
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="flex justify-center mb-8">
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Agregar mensaje"
                  className="w-4/5 text-center border-b border-gray-200 focus:border-[#00b5ad] text-gray-600 text-[15px] placeholder-gray-400 focus:outline-none pb-2 bg-transparent font-medium"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => setStep("confirm")}
                  disabled={!amount || parseFloat(amount) <= 0}
                  className="flex-1 h-[52px] bg-[#00b5ad] text-white font-bold text-[15px] rounded-xl flex items-center justify-center active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  Yapear
                </button>
              </div>
            </div>

            {/* Custom Keypad */}
            <div className="bg-[#d2d5db] px-2 pb-8 pt-2">
              <div className="grid grid-cols-3 gap-2">
                {/* Row 1 */}
                <button onClick={() => handleKey("1")} className="bg-white rounded-lg h-[46px] flex flex-col items-center justify-center shadow-sm active:bg-gray-100">
                  <span className="text-[22px] text-black leading-none mt-1">1</span>
                </button>
                <button onClick={() => handleKey("2")} className="bg-white rounded-lg h-[46px] flex flex-col items-center justify-center shadow-sm active:bg-gray-100">
                  <span className="text-[22px] text-black leading-none mt-1">2</span>
                  <span className="text-[9px] text-black font-bold tracking-widest mt-0.5">ABC</span>
                </button>
                <button onClick={() => handleKey("3")} className="bg-white rounded-lg h-[46px] flex flex-col items-center justify-center shadow-sm active:bg-gray-100">
                  <span className="text-[22px] text-black leading-none mt-1">3</span>
                  <span className="text-[9px] text-black font-bold tracking-widest mt-0.5">DEF</span>
                </button>
                
                {/* Row 2 */}
                <button onClick={() => handleKey("4")} className="bg-white rounded-lg h-[46px] flex flex-col items-center justify-center shadow-sm active:bg-gray-100">
                  <span className="text-[22px] text-black leading-none mt-1">4</span>
                  <span className="text-[9px] text-black font-bold tracking-widest mt-0.5">GHI</span>
                </button>
                <button onClick={() => handleKey("5")} className="bg-white rounded-lg h-[46px] flex flex-col items-center justify-center shadow-sm active:bg-gray-100">
                  <span className="text-[22px] text-black leading-none mt-1">5</span>
                  <span className="text-[9px] text-black font-bold tracking-widest mt-0.5">JKL</span>
                </button>
                <button onClick={() => handleKey("6")} className="bg-white rounded-lg h-[46px] flex flex-col items-center justify-center shadow-sm active:bg-gray-100">
                  <span className="text-[22px] text-black leading-none mt-1">6</span>
                  <span className="text-[9px] text-black font-bold tracking-widest mt-0.5">MNO</span>
                </button>

                {/* Row 3 */}
                <button onClick={() => handleKey("7")} className="bg-white rounded-lg h-[46px] flex flex-col items-center justify-center shadow-sm active:bg-gray-100">
                  <span className="text-[22px] text-black leading-none mt-1">7</span>
                  <span className="text-[9px] text-black font-bold tracking-widest mt-0.5">PQRS</span>
                </button>
                <button onClick={() => handleKey("8")} className="bg-white rounded-lg h-[46px] flex flex-col items-center justify-center shadow-sm active:bg-gray-100">
                  <span className="text-[22px] text-black leading-none mt-1">8</span>
                  <span className="text-[9px] text-black font-bold tracking-widest mt-0.5">TUV</span>
                </button>
                <button onClick={() => handleKey("9")} className="bg-white rounded-lg h-[46px] flex flex-col items-center justify-center shadow-sm active:bg-gray-100">
                  <span className="text-[22px] text-black leading-none mt-1">9</span>
                  <span className="text-[9px] text-black font-bold tracking-widest mt-0.5">WXYZ</span>
                </button>

                {/* Row 4 */}
                <div className="col-span-1" /> {/* Empty left space */}
                <button onClick={() => handleKey("0")} className="bg-white rounded-lg h-[46px] flex items-center justify-center shadow-sm active:bg-gray-100">
                  <span className="text-[22px] text-black">0</span>
                </button>
                <button onClick={() => handleKey("DEL")} className="rounded-lg h-[46px] flex items-center justify-center active:bg-gray-400/20">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 4H8C7.46957 4 6.96086 4.21071 6.58579 4.58579C6.21071 4.96086 6 5.46957 6 6V18C6 18.5304 6.21071 19.0391 6.58579 19.4142C6.96086 19.7893 7.46957 20 8 20H21C21.5304 20 22.0391 19.7893 22.4142 19.4142C22.7893 19.0391 23 18.5304 23 18V6C23 5.46957 22.7893 4.96086 22.4142 4.58579C22.0391 4.21071 21.5304 4 21 4V4Z" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6 10L2 12L6 14" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18 9L12 15" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 9L18 15" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CONFIRM ── */}
        {step === "confirm" && recipient && (
          <div className="flex-1 flex flex-col p-6">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setStep("amount")}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                <ArrowLeft size={20} className="text-gray-700" />
              </button>
              <h2 className="text-gray-900 font-bold text-[20px]">Confirmar Yapeo</h2>
            </div>

            <div className="flex flex-col items-center mb-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${colorForName(recipient.name)}`}>
                <span className="text-white font-bold text-[18px]">{getInitials(recipient.name)}</span>
              </div>
              <p className="text-gray-900 font-bold text-[18px]">{recipient.name}</p>
              <p className="text-gray-400 text-[13px]">{recipient.phone || recipient.email || recipient.account_number}</p>
            </div>

            <div className="bg-[#faf8fc] border-2 border-[#f0eaf6] rounded-3xl p-5 space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-400 text-[14px]">Monto</span>
                <span className="text-[#4a1862] font-black text-[22px]">S/ {parseFloat(amount).toFixed(2)}</span>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex justify-between">
                <span className="text-gray-400 text-[14px]">Comisión</span>
                <span className="text-[#00b5ad] font-semibold">S/ 0.00 🎉</span>
              </div>
              {description && <>
                <div className="h-px bg-gray-100" />
                <div className="flex justify-between">
                  <span className="text-gray-400 text-[14px]">Mensaje</span>
                  <span className="text-gray-600 text-[14px] max-w-[55%] text-right">{description}</span>
                </div>
              </>}
              <div className="h-px bg-gray-100" />
              <div className="flex justify-between font-bold">
                <span className="text-gray-700 text-[15px]">Total a debitar</span>
                <span className="text-[#681984] text-[18px]">S/ {parseFloat(amount).toFixed(2)}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-[11px] font-bold text-[#4a1862]/70 uppercase ml-1">Tu clave</label>
              <input
                type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setPinError("") }}
                placeholder="••••••"
                className="mt-1.5 w-full h-[52px] rounded-2xl border-2 border-[#f0eaf6] bg-[#faf8fc] px-4 text-gray-900 text-[18px] tracking-[0.4em] text-center focus:border-[#681984] focus:outline-none placeholder:text-gray-400"
              />
              {pinError && <p className="text-red-500 text-[13px] mt-2 text-center">{pinError}</p>}
            </div>

            <div className="flex gap-3 mt-auto">
              <button onClick={() => { setPin(""); setPinError(""); setStep("menu") }}
                className="flex-1 h-[54px] border-2 border-gray-200 text-gray-500 font-semibold rounded-2xl flex items-center justify-center gap-2">
                <X size={17} /> Cancelar
              </button>
              <button
                onClick={handleTransfer}
                disabled={loading}
                className="flex-[2] h-[54px] bg-[#00b5ad] hover:bg-[#009c95] text-white font-bold text-[16px] rounded-2xl flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(0,181,173,0.35)] active:scale-[0.98] disabled:opacity-60 transition-all"
              >
                {loading ? <><Loader2 size={18} className="animate-spin" /> Enviando...</> : "¡Yapear ahora!"}
              </button>
            </div>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {step === "success" && (
          <div className="flex-1 flex flex-col bg-[#681984] relative overflow-hidden">
            {/* Fake Confetti Background */}
            <div className="absolute inset-0 pointer-events-none opacity-60">
              <div className="absolute top-[10%] left-[20%] w-3 h-8 bg-[#00b5ad] rotate-45 rounded-sm" />
              <div className="absolute top-[15%] right-[25%] w-4 h-6 bg-[#f59e0b] -rotate-12 rounded-sm" />
              <div className="absolute top-[5%] right-[10%] w-3 h-10 bg-[#cba3d6] rotate-12 rounded-sm" />
              <div className="absolute top-[30%] left-[5%] w-5 h-12 bg-[#00b5ad] rotate-[60deg] rounded-sm" />
              <div className="absolute top-[40%] right-[5%] w-4 h-10 bg-[#cba3d6] -rotate-45 rounded-sm" />
            </div>

            {/* Header */}
            <div className="flex justify-between items-center px-6 pt-12 pb-4 relative z-10">
              <div className="flex items-center gap-1">
                <div className="w-8 h-8 bg-[#00b5ad] rounded-full flex items-center justify-center -ml-2 border border-white">
                  <span className="text-white text-[10px] font-black leading-none">S/</span>
                </div>
                <span className="text-white font-bold text-2xl italic tracking-tight font-serif">MiHome</span>
              </div>
              <button onClick={() => router.push("/home")} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <X size={20} className="text-white" />
              </button>
            </div>

            {/* Main Receipt Card */}
            <div className="px-5 relative z-10">
              <div className="bg-white rounded-[1.5rem] p-6 shadow-xl relative">
                
                {/* Header Card */}
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-[#681984] font-bold text-[22px]">¡Yapeaste!</h2>
                  <button onClick={compartirComprobante} className="flex items-center gap-1 text-[#00b5ad] font-semibold text-[14px]">
                    <Share2 size={16} /> Compartir
                  </button>
                </div>

                {/* Amount */}
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-[#4a1862] text-[28px] font-semibold">S/</span>
                  <span className="text-[#4a1862] text-[52px] font-medium leading-none tracking-tight">
                    {parseFloat(amount).toFixed(2).replace(".00", "")}
                  </span>
                </div>

                {/* Name */}
                <p className="text-gray-900 font-bold text-[20px] mb-2">{recipient?.name}*</p>

                {/* Date/Time */}
                <div className="flex items-center gap-2 text-gray-500 text-[13px] mb-4">
                  <Calendar size={14} />
                  <span>{new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span className="text-gray-300">|</span>
                  <Clock size={14} />
                  <span>{new Date().toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                </div>

                {/* Message Bubble */}
                {description && (
                  <div className="bg-[#f2f4f8] rounded-2xl p-3 flex items-center gap-3 mb-6">
                    <div className="bg-[#4a1862] p-1.5 rounded-lg">
                      <MessageSquare size={14} className="text-white" />
                    </div>
                    <p className="text-gray-700 text-[14px] font-medium">{description}</p>
                  </div>
                )}

                <div className="h-px bg-gray-100 my-5" />


                {/* Transaction Data */}
                <div className="mb-2">
                  <span className="text-gray-500 text-[11px] font-bold tracking-wider">DATOS DE LA TRANSACCIÓN</span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-[14px]">Nro. de celular</span>
                    <span className="text-gray-800 text-[14px] font-medium">
                      {recipient?.phone ? `*** *** ${recipient.phone.slice(-3)}` : "No disponible"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-[14px]">Destino</span>
                    <span className="text-gray-800 text-[14px] font-medium">MiHome Billetera</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-[14px]">Nro. de operación</span>
                    <span className="text-gray-800 text-[14px] font-medium">{txResult?.reference || "—"}</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* ── ERROR ── */}
        {step === "error" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-24 h-24 bg-red-50 border-2 border-red-100 rounded-full flex items-center justify-center mb-5">
              <AlertCircle size={50} className="text-red-400" />
            </div>
            <h2 className="text-gray-800 font-bold text-[22px] mb-2">Algo salió mal</h2>
            <p className="text-gray-400 text-[14px] mb-8 px-4">{errorMsg}</p>
            <button onClick={() => { setStep("menu"); setErrorMsg("") }}
              className="w-full h-[54px] bg-[#681984] text-white font-bold rounded-2xl">
              Intentar de nuevo
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
