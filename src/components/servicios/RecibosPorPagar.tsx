"use client"

import { CheckCircle2, Loader2, Receipt, X } from "lucide-react"
import { useRef, useState } from "react"

import { pagarRecibo } from "@/lib/actions/servicios"
import { formatearDinero } from "@/lib/inversiones"
import { ETIQUETA_VENCIMIENTO, estadoVencimiento, fechaCorta, type PlataformaCobros, type Recibo, type ResultadoPago } from "@/lib/servicios"

interface Seleccion {
  plataforma: string
  nombrePlataforma: string
  recibo: Recibo
}

/** Recibos por pagar de cada servicio, con la hoja de confirmación (clave) y el comprobante. */
export function RecibosPorPagar({ plataformas, hoy }: { plataformas: PlataformaCobros[]; hoy: string }) {
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null)
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [cargando, setCargando] = useState(false)
  const [hecho, setHecho] = useState<{ recibo: Recibo; resultado: ResultadoPago } | null>(null)
  const [pagados, setPagados] = useState<Set<number>>(new Set())
  // Un doble toque nunca debe iniciar dos pagos a la vez (el banco además cobra una sola vez por recibo).
  const enCurso = useRef(false)

  const cerrar = () => {
    setSeleccion(null)
    setPin("")
    setError("")
    setHecho(null)
  }

  const confirmar = async () => {
    if (!seleccion || enCurso.current) return
    enCurso.current = true
    setCargando(true)
    setError("")
    try {
      const r = await pagarRecibo({ plataforma: seleccion.plataforma, recibo: String(seleccion.recibo.id), pin })
      if (r.success) {
        setPagados((previos) => new Set(previos).add(seleccion.recibo.id))
        setHecho({ recibo: seleccion.recibo, resultado: r })
        setSeleccion(null)
        setPin("")
      } else {
        setPin("")
        setError(
          r.code === "pin_invalido" && r.intentosRestantes !== undefined
            ? `Clave incorrecta. Te quedan ${r.intentosRestantes} intento(s).`
            : r.code === "saldo_insuficiente"
              ? "Tu saldo no alcanza para este recibo."
              : r.error || "No se pudo completar el pago"
        )
      }
    } catch {
      setError("No pudimos confirmar el pago. Revisa tus movimientos antes de reintentar.")
    } finally {
      enCurso.current = false
      setCargando(false)
    }
  }

  return (
    <section aria-labelledby="recibos-por-pagar" id="recibos">
      <h2 id="recibos-por-pagar" className="mb-3 text-[16px] font-bold text-[#4a1862]">Recibos por pagar</h2>

      {plataformas.length === 0 && <p className="rounded-2xl border border-dashed border-gray-200 py-6 text-center text-[13px] text-gray-400">No hay servicios para pagar por ahora.</p>}

      {plataformas.map((p) => (
        <div key={p.code} className="mb-5">
          {p.estado === "no_disponible" && (
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-[13px] text-amber-700">{p.name} no responde. Inténtalo de nuevo en unos minutos.</p>
          )}
          {p.estado === "no_vinculado" && (
            <p className="rounded-2xl bg-gray-50 px-4 py-3 text-[13px] text-gray-500">
              Tu billetera aún no está vinculada a tu cuenta de {p.name}. Pídele a Akallpa que la vincule para ver aquí tus recibos.
            </p>
          )}
          {p.estado === "ok" && (
            <>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">{p.name}</p>
              {p.charges.filter((r) => !pagados.has(r.id)).length === 0 ? (
                <p className="rounded-2xl border border-dashed border-gray-200 py-6 text-center text-[13px] text-gray-400">
                  {pagados.size ? "¡Listo! No te quedan recibos pendientes." : "No tienes recibos pendientes. ¡Estás al día!"}
                </p>
              ) : (
                <ul className="space-y-3">
                  {p.charges.filter((r) => !pagados.has(r.id)).map((r) => {
                    const venc = estadoVencimiento(r.due, hoy)
                    return (
                      <li key={r.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[14px] font-bold leading-snug text-gray-900">{r.concept}</p>
                            <p className="mt-0.5 text-[11px] text-gray-400">{r.reference}</p>
                            <p className="mt-1 text-[11px] text-gray-500">
                              Vence el {fechaCorta(r.due)}
                              {ETIQUETA_VENCIMIENTO[venc] && (
                                <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${venc === "vencido" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>
                                  {ETIQUETA_VENCIMIENTO[venc]}
                                </span>
                              )}
                            </p>
                          </div>
                          <p className="shrink-0 text-[16px] font-bold text-[#4a1862]">{formatearDinero(r.amount, r.currency)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSeleccion({ plataforma: p.code, nombrePlataforma: p.name, recibo: r })}
                          className="mt-3 h-[44px] w-full rounded-2xl bg-[#681984] text-[14px] font-bold text-white shadow active:scale-[0.98]"
                        >
                          Pagar con mi billetera
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      ))}
      {seleccion && (
        <div role="dialog" aria-modal="true" aria-label="Confirmar pago" className="absolute inset-0 z-50 flex items-end bg-black/50">
          <div className="w-full rounded-t-[2rem] bg-white p-6 pb-10">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-[12px] text-gray-400">{seleccion.nombrePlataforma}</p>
                <p className="text-[16px] font-bold leading-snug text-gray-900">{seleccion.recibo.concept}</p>
              </div>
              <button type="button" onClick={cerrar} aria-label="Cerrar" className="rounded-full p-1 text-gray-400"><X size={20} /></button>
            </div>
            <p className="mb-4 text-center text-[34px] font-bold text-[#4a1862]">{formatearDinero(seleccion.recibo.amount, seleccion.recibo.currency)}</p>
            <label htmlFor="clave-pago" className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#681984]">Tu clave</label>
            <input
              id="clave-pago" type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError("") }}
              placeholder="••••••"
              className="h-[52px] w-full rounded-2xl border-2 border-[#f0eaf6] bg-[#faf8fc] px-4 text-center text-[20px] tracking-[0.5em] text-gray-900 focus:border-[#681984] focus:outline-none"
            />
            {error && <p role="alert" className="mt-2 text-[13px] text-red-500">{error}</p>}
            <button
              type="button" onClick={confirmar} disabled={cargando || pin.length < 4}
              className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#00b5ad] text-[15px] font-bold text-white disabled:opacity-50"
            >
              {cargando ? <Loader2 size={18} className="animate-spin" /> : <Receipt size={18} />}
              {cargando ? "Pagando…" : "Confirmar pago"}
            </button>
          </div>
        </div>
      )}

      {hecho && (
        <div role="dialog" aria-modal="true" aria-label="Pago realizado" className="absolute inset-0 z-50 flex items-end bg-black/50">
          <div className="w-full rounded-t-[2rem] bg-white p-6 pb-10 text-center">
            <CheckCircle2 size={52} className="mx-auto text-[#00b5ad]" aria-hidden />
            <p className="mt-2 text-[20px] font-bold text-[#4a1862]">¡Pago realizado!</p>
            <p className="mt-1 text-[28px] font-bold text-gray-900">{formatearDinero(hecho.resultado.monto ?? hecho.recibo.amount, hecho.recibo.currency)}</p>
            <p className="mt-1 text-[13px] text-gray-500">{hecho.recibo.concept}</p>
            <p className="mt-3 text-[12px] text-gray-400">Operación</p>
            <p className="text-[13px] font-medium text-gray-800">{hecho.resultado.operacion}</p>
            {hecho.resultado.pendienteDeRegistro && (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
                Tu dinero ya se descontó. El recibo se marcará como pagado en unos minutos.
              </p>
            )}
            <button type="button" onClick={cerrar} className="mt-5 h-[48px] w-full rounded-2xl bg-[#681984] text-[14px] font-bold text-white">Listo</button>
          </div>
        </div>
      )}
    </section>
  )
}
