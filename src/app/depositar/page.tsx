"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react"
import { depositarEnPlataforma, listarPlataformas, type Plataforma } from "@/lib/actions/plataformas"

const CLASE_INPUT =
  "w-full h-[52px] rounded-2xl border-2 border-[#f0eaf6] bg-[#faf8fc] px-4 text-gray-900 text-[15px] focus:border-[#681984] focus:outline-none placeholder:text-gray-400"

function parsearMonto(texto: string): number {
  const limpio = texto.replace(/\s/g, "").replace(",", ".")
  return /^\d+(\.\d{1,2})?$/.test(limpio) ? Number(limpio) : NaN
}

export default function DepositarPage() {
  const [plataformas, setPlataformas] = useState<Plataforma[] | null>(null)
  const [plataforma, setPlataforma] = useState("")
  const [monto, setMonto] = useState("")
  const [pin, setPin] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [hecho, setHecho] = useState<{ monto: number; nombre: string; saldo?: number } | null>(null)

  // Clave de idempotencia de este intento: mientras no cambien plataforma y monto, un reintento la reutiliza
  // (si la respuesta se perdió, el banco no deposita dos veces).
  const llaveRef = useRef<{ firma: string; llave: string } | null>(null)

  useEffect(() => {
    listarPlataformas().then((lista) => {
      setPlataformas(lista)
      if (lista.length === 1) setPlataforma(lista[0].code)
    })
  }, [])

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    const importe = parsearMonto(monto)
    if (!plataforma) return setError("Elige una plataforma.")
    if (!(importe > 0)) return setError("Ingresa un monto válido (hasta 2 decimales).")
    if (!/^\d{4,6}$/.test(pin)) return setError("Ingresa tu clave (4 a 6 dígitos).")

    const firma = `${plataforma}|${importe}`
    if (llaveRef.current?.firma !== firma) llaveRef.current = { firma, llave: crypto.randomUUID() }

    setLoading(true)
    setError("")
    let res: Awaited<ReturnType<typeof depositarEnPlataforma>>
    try {
      res = await depositarEnPlataforma({ platform: plataforma, amount: importe, pin, llave: llaveRef.current.llave })
    } catch {
      // Se cortó la conexión: no se sabe si se aplicó. Reintentar con la misma llave es seguro; nunca dejar la pantalla colgada.
      setLoading(false)
      setError("Se perdió la conexión. Toca Depositar otra vez: si ya se hizo, no se depositará dos veces.")
      return
    }
    setLoading(false)
    setPin("")
    if (res.success) {
      llaveRef.current = null
      const nombre = plataformas?.find((p) => p.code === plataforma)?.name ?? plataforma
      setHecho({ monto: importe, nombre, saldo: res.saldo })
      return
    }
    if (res.code === "pin_invalido") {
      setError(
        res.intentosRestantes !== undefined
          ? `Clave incorrecta. Te quedan ${res.intentosRestantes} intento(s).`
          : "Clave incorrecta."
      )
    } else if (res.code === "pin_no_configurado") {
      setError("Aún no tienes clave. Cierra sesión e ingresa de nuevo para crearla.")
    } else if (res.code === "saldo_insuficiente") {
      setError("No tienes saldo suficiente en tu billetera.")
    } else if (res.code === "idempotencia_conflicto") {
      llaveRef.current = null
      setError("No pudimos procesar el intento. Vuelve a pulsar Depositar.")
    } else {
      setError(res.error || "No se pudo completar el depósito")
    }
  }

  const formatSoles = (n: number) =>
    new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2 }).format(n)

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 sm:p-4">
      <div className="w-full h-[100dvh] sm:h-[844px] max-w-[390px] bg-white sm:rounded-[3rem] overflow-hidden relative shadow-[0_0_60px_rgba(104,25,132,0.5)] flex flex-col font-sans border-4 border-slate-800 sm:border-[#333]">
        <div className="flex items-center gap-3 p-6 pb-2">
          <Link href="/home" aria-label="Volver" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <ArrowLeft size={20} className="text-gray-700" />
          </Link>
          <h1 className="text-gray-900 font-bold text-[20px]">Depositar en una plataforma</h1>
        </div>

        {hecho ? (
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
            <CheckCircle2 size={56} className="text-[#00b5ad] mb-4" />
            <p className="text-gray-900 font-bold text-[20px]">¡Depósito enviado!</p>
            <p className="text-gray-500 text-[14px] mt-2">
              {formatSoles(hecho.monto)} a {hecho.nombre}.
              {hecho.saldo !== undefined && <> Tu saldo en la billetera: {formatSoles(hecho.saldo)}.</>}
            </p>
            <p className="text-gray-400 text-[13px] mt-4">
              Vuelve al portal de la plataforma y pulsa «Ya deposité» para ver el monto en tu cuenta.
            </p>
            <Link href="/home" className="mt-8 h-[54px] w-full bg-[#681984] text-white font-bold text-[16px] rounded-2xl flex items-center justify-center">
              Volver al inicio
            </Link>
          </div>
        ) : (
          <form onSubmit={enviar} className="flex-1 flex flex-col gap-4 p-6" noValidate>
            <p className="text-gray-400 text-[13px]">
              El dinero sale de tu billetera hacia la cuenta de la plataforma. Necesitas tu clave para confirmar.
            </p>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="plataforma" className="text-[11px] font-bold text-[#4a1862]/70 uppercase ml-1">Plataforma</label>
              {plataformas === null ? (
                <div className="h-[52px] flex items-center text-gray-400 text-[14px]"><Loader2 size={18} className="animate-spin mr-2" /> Cargando…</div>
              ) : plataformas.length === 0 ? (
                <p className="text-gray-500 text-[14px]">No hay plataformas disponibles por ahora.</p>
              ) : (
                <select id="plataforma" value={plataforma} onChange={(e) => setPlataforma(e.target.value)} className={CLASE_INPUT}>
                  <option value="">Elige una plataforma</option>
                  {plataformas.map((p) => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="monto" className="text-[11px] font-bold text-[#4a1862]/70 uppercase ml-1">Monto (S/)</label>
              <input id="monto" inputMode="decimal" value={monto} onChange={(e) => { setMonto(e.target.value); setError("") }} placeholder="0.00" className={CLASE_INPUT} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="pin" className="text-[11px] font-bold text-[#4a1862]/70 uppercase ml-1">Tu clave</label>
              <input
                id="pin" type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError("") }}
                placeholder="••••••"
                className={`${CLASE_INPUT} tracking-[0.4em] text-center text-[18px]`}
              />
            </div>

            {error && <p role="alert" className="text-red-500 text-[13px] text-center">{error}</p>}

            <button
              type="submit" disabled={loading || !plataformas?.length}
              className="mt-auto h-[54px] w-full bg-[#00b5ad] hover:bg-[#009c95] text-white font-bold text-[16px] rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60 transition-all"
            >
              {loading ? <><Loader2 size={18} className="animate-spin" /> Depositando...</> : "Depositar"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
