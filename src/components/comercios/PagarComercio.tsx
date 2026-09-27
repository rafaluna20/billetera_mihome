"use client"

import { AlertTriangle, CheckCircle2, Gift, Loader2, Store, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"

import { leerQrComercio, pagarComercio } from "@/lib/actions/comercios"
import {
  mensajeDeError, montoDeTexto, nuevaLlave, repartoPrevisto, type InfoComercio, type ResultadoPagoComercio,
} from "@/lib/comercios"
import { formatearDinero } from "@/lib/inversiones"

const soles = (n: number) => formatearDinero(n, "PEN")

/** Pago en un comercio: muestra QUIÉN cobra (nombre del administrador), el monto, el reparto bono/saldo y pide la clave. */
export function PagarComercio({ qr }: { qr: string }) {
  const [comercio, setComercio] = useState<InfoComercio | null>(null)
  const [errorQr, setErrorQr] = useState("")
  const [montoTexto, setMontoTexto] = useState("")
  const [usarBeneficio, setUsarBeneficio] = useState(true)
  const [pidiendoClave, setPidiendoClave] = useState(false)
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [cargando, setCargando] = useState(false)
  const [hecho, setHecho] = useState<ResultadoPagoComercio | null>(null)
  const enCurso = useRef(false)
  // Una llave por intento: se reutiliza al reintentar el MISMO pago (el banco cobra una sola vez) y cambia si cambia el monto.
  const llave = useRef({ clave: "", huella: "" })

  useEffect(() => {
    let vigente = true
    leerQrComercio(qr).then((r) => {
      if (!vigente) return
      if (r.estado === "ok") setComercio(r.comercio)
      else if (r.estado === "sesion") window.location.assign("/salir")
      else setErrorQr(mensajeDeError(r.code, r.error))
    })
    return () => {
      vigente = false
    }
  }, [qr])

  const monto = comercio?.montoFijo ?? montoDeTexto(montoTexto)
  const reparto = useMemo(
    () => (comercio && monto ? repartoPrevisto(monto, comercio.beneficio, usarBeneficio) : null),
    [comercio, monto, usarBeneficio],
  )
  const saldoAlcanza = !reparto || !comercio || reparto.personal <= comercio.saldo + 1e-9
  const excedeMaximo = Boolean(comercio && monto && monto > comercio.maxPago)
  const puedePagar = Boolean(comercio && monto && reparto && saldoAlcanza && !excedeMaximo)

  const confirmar = async () => {
    if (!comercio || !monto || enCurso.current) return
    enCurso.current = true
    setCargando(true)
    setError("")
    const huella = `${monto}|${usarBeneficio}`
    if (llave.current.huella !== huella) llave.current = { clave: nuevaLlave(), huella }
    try {
      const r = await pagarComercio({ qr, monto: comercio.montoFijo ? null : monto, pin, llave: llave.current.clave, usarBeneficio })
      if (r.success) {
        setHecho(r)
        setPidiendoClave(false)
      } else {
        setPin("")
        setError(
          r.code === "pin_invalido" && r.intentosRestantes !== undefined
            ? `Clave incorrecta. Te quedan ${r.intentosRestantes} intento(s).`
            : mensajeDeError(r.code, r.error),
        )
      }
    } finally {
      enCurso.current = false
      setCargando(false)
    }
  }

  if (errorQr) {
    return (
      <div className="flex-1 rounded-t-[2rem] bg-white px-6 pt-10 text-center">
        <AlertTriangle size={44} className="mx-auto text-amber-500" aria-hidden />
        <p role="alert" className="mt-3 text-[15px] font-semibold text-gray-800">{errorQr}</p>
        <Link href="/pagar" className="mt-6 inline-block rounded-2xl bg-[#681984] px-6 py-3 text-[14px] font-bold text-white">Escanear otro QR</Link>
      </div>
    )
  }
  if (!comercio) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-t-[2rem] bg-white">
        <Loader2 className="animate-spin text-[#681984]" aria-label="Leyendo el QR" />
      </div>
    )
  }

  if (hecho) {
    return (
      <div className="flex-1 rounded-t-[2rem] bg-white px-6 pt-10 text-center">
        <CheckCircle2 size={56} className="mx-auto text-[#00b5ad]" aria-hidden />
        <p className="mt-2 text-[20px] font-bold text-[#4a1862]">¡Pago realizado!</p>
        <p className="mt-1 text-[30px] font-bold text-gray-900">{soles(hecho.monto ?? 0)}</p>
        <p className="text-[14px] text-gray-500">{hecho.comercio}</p>
        <div className="mx-auto mt-4 max-w-[280px] space-y-1 rounded-2xl bg-gray-50 p-4 text-left text-[13px] text-gray-700">
          {(hecho.deBeneficio ?? 0) > 0 && <p className="flex justify-between"><span>Con tu beneficio</span><b>{soles(hecho.deBeneficio ?? 0)}</b></p>}
          {(hecho.dePersonal ?? 0) > 0 && <p className="flex justify-between"><span>Con tu saldo</span><b>{soles(hecho.dePersonal ?? 0)}</b></p>}
          <p className="flex justify-between border-t border-gray-200 pt-1 text-gray-500"><span>Operación</span><span>{hecho.numero}</span></p>
        </div>
        <p className="mt-3 text-[12px] text-gray-400">Muéstrale esta pantalla al cajero si te la pide.</p>
        <Link href="/servicios" className="mt-5 inline-block w-full rounded-2xl bg-[#681984] px-6 py-3 text-[14px] font-bold text-white">Listo</Link>
      </div>
    )
  }

  return (
    <div className="relative flex-1 overflow-y-auto rounded-t-[2rem] bg-white px-6 pb-28 pt-8">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#681984]/10 text-[#681984]"><Store size={26} aria-hidden /></div>
        <p className="mt-3 text-[12px] font-bold uppercase tracking-wide text-gray-400">Vas a pagar a</p>
        <p className="text-[22px] font-bold leading-tight text-[#4a1862]">{comercio.name}</p>
      </div>

      <div className="mt-6">
        {comercio.montoFijo ? (
          <p className="text-center text-[38px] font-bold text-gray-900">{soles(comercio.montoFijo)}</p>
        ) : (
          <>
            <label htmlFor="monto-comercio" className="mb-1 block text-center text-[11px] font-bold uppercase tracking-wide text-[#681984]">Monto (S/)</label>
            <input
              id="monto-comercio" inputMode="decimal" autoComplete="off" value={montoTexto} placeholder="0.00"
              onChange={(e) => { setMontoTexto(e.target.value.replace(/[^\d.,]/g, "")); setError("") }}
              className="h-[64px] w-full rounded-2xl border-2 border-[#f0eaf6] bg-[#faf8fc] text-center text-[32px] font-bold text-gray-900 focus:border-[#681984] focus:outline-none"
            />
          </>
        )}
        {excedeMaximo && <p role="alert" className="mt-2 text-center text-[13px] text-red-500">El máximo por pago aquí es {soles(comercio.maxPago)}.</p>}
      </div>

      {comercio.beneficio > 0 && (
        <label className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-[#00b5ad]/30 bg-[#00b5ad]/5 p-4">
          <span className="flex items-center gap-3">
            <Gift size={20} className="text-[#00b5ad]" aria-hidden />
            <span>
              <span className="block text-[14px] font-bold text-gray-900">Usar mi beneficio</span>
              <span className="block text-[12px] text-gray-500">Tienes {soles(comercio.beneficio)}</span>
            </span>
          </span>
          <input type="checkbox" checked={usarBeneficio} onChange={(e) => setUsarBeneficio(e.target.checked)} className="h-5 w-5 accent-[#00b5ad]" />
        </label>
      )}

      {reparto && (
        <div className="mt-4 space-y-1 rounded-2xl bg-gray-50 p-4 text-[13px] text-gray-700">
          {reparto.beneficio > 0 && <p className="flex justify-between"><span>Con tu beneficio</span><b>{soles(reparto.beneficio)}</b></p>}
          {reparto.personal > 0 && <p className="flex justify-between"><span>Con tu saldo</span><b>{soles(reparto.personal)}</b></p>}
          {!saldoAlcanza && <p role="alert" className="pt-1 text-red-500">Tu saldo ({soles(comercio.saldo)}) no alcanza para este pago.</p>}
        </div>
      )}

      <button
        type="button" disabled={!puedePagar} onClick={() => { setPidiendoClave(true); setError("") }}
        className="mt-6 h-[52px] w-full rounded-2xl bg-[#681984] text-[15px] font-bold text-white shadow disabled:opacity-40"
      >
        Continuar
      </button>

      {pidiendoClave && (
        <div role="dialog" aria-modal="true" aria-label="Confirmar pago" className="absolute inset-0 z-50 flex items-end bg-black/50">
          <div className="w-full rounded-t-[2rem] bg-white p-6 pb-10">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-[12px] text-gray-400">Pagas a</p>
                <p className="text-[16px] font-bold leading-snug text-gray-900">{comercio.name}</p>
              </div>
              <button type="button" onClick={() => { setPidiendoClave(false); setPin(""); setError("") }} aria-label="Cerrar" className="rounded-full p-1 text-gray-400"><X size={20} /></button>
            </div>
            <p className="mb-4 text-center text-[34px] font-bold text-[#4a1862]">{soles(monto ?? 0)}</p>
            <label htmlFor="clave-comercio" className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#681984]">Tu clave</label>
            <input
              id="clave-comercio" type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError("") }} placeholder="••••••"
              className="h-[52px] w-full rounded-2xl border-2 border-[#f0eaf6] bg-[#faf8fc] px-4 text-center text-[20px] tracking-[0.5em] text-gray-900 focus:border-[#681984] focus:outline-none"
            />
            {error && <p role="alert" className="mt-2 text-[13px] text-red-500">{error}</p>}
            <button
              type="button" onClick={confirmar} disabled={cargando || pin.length < 4}
              className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#00b5ad] text-[15px] font-bold text-white disabled:opacity-50"
            >
              {cargando ? <Loader2 size={18} className="animate-spin" /> : null}
              {cargando ? "Pagando…" : "Confirmar pago"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
