"use client"

import { BellRing, Flag, Volume2, VolumeX } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import QRCode from "react-qr-code"

import { pagosRecibidos, reclamarPago } from "@/lib/actions/comercios"
import { fechaHoraLima, horaLima, type MiComercio, type PagoRecibido, type Recibidos } from "@/lib/comercios"
import { formatearDinero } from "@/lib/inversiones"

const soles = (n: number) => formatearDinero(n, "PEN")
const CADA_MS = 4000
const ETIQUETA: Record<PagoRecibido["state"], string> = { done: "Pagado", disputed: "En reclamo", refunded: "Devuelto" }

/** Pantalla del cajero: cada pago aparece al instante (con aviso) para compararlo con la venta antes de entregar el pedido. */
export function PanelComercio({ comercios }: { comercios: MiComercio[] }) {
  const [codigo, setCodigo] = useState(comercios[0]?.code ?? "")
  const [pestana, setPestana] = useState<"recibidos" | "qr">("recibidos")
  const [datos, setDatos] = useState<Recibidos | null>(null)
  const [error, setError] = useState("")
  const [aviso, setAviso] = useState<PagoRecibido | null>(null)
  const [sonido, setSonido] = useState(false)
  const [reclamando, setReclamando] = useState<PagoRecibido | null>(null)
  const [motivo, setMotivo] = useState("")
  const [msgReclamo, setMsgReclamo] = useState("")
  const ultimoVisto = useRef(0)
  const audio = useRef<AudioContext | null>(null)
  const comercio = comercios.find((c) => c.code === codigo)

  const pitar = useCallback(() => {
    try {
      const ctx = audio.current
      if (ctx) {
        const osc = ctx.createOscillator()
        const ganancia = ctx.createGain()
        osc.connect(ganancia)
        ganancia.connect(ctx.destination)
        osc.frequency.value = 880
        ganancia.gain.setValueAtTime(0.2, ctx.currentTime)
        ganancia.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
        osc.start()
        osc.stop(ctx.currentTime + 0.5)
      }
      navigator.vibrate?.(200)
    } catch {
      /* sin sonido: el aviso visual basta */
    }
  }, [])

  useEffect(() => {
    if (!codigo) return
    ultimoVisto.current = 0
    setDatos(null)
    let vigente = true
    const cargar = async () => {
      const r = await pagosRecibidos(codigo, 0)
      if (!vigente) return
      if (r.estado === "sesion") return window.location.assign("/salir")
      if (r.estado === "error") return setError(r.error)
      setError("")
      const nuevos = r.datos.pagos.filter((p) => p.id > ultimoVisto.current && p.state === "done")
      // La primera carga no avisa (son pagos de antes); las siguientes sí.
      if (ultimoVisto.current > 0 && nuevos.length) {
        setAviso(nuevos[0])
        pitar()
      }
      ultimoVisto.current = Math.max(ultimoVisto.current, r.datos.ultimoId)
      setDatos(r.datos)
    }
    cargar()
    const reloj = setInterval(cargar, CADA_MS)
    return () => {
      vigente = false
      clearInterval(reloj)
    }
  }, [codigo, pitar])

  const activarSonido = () => {
    if (!sonido) {
      audio.current = audio.current ?? new AudioContext()
      void audio.current.resume()
      setSonido(true)
      pitar()
    } else {
      setSonido(false)
    }
  }

  const enviarReclamo = async () => {
    if (!reclamando || !comercio) return
    const r = await reclamarPago(comercio.code, reclamando.id, motivo)
    if (r.ok) {
      setDatos((d) => (d ? { ...d, pagos: d.pagos.map((p) => (p.id === reclamando.id ? { ...p, state: "disputed" } : p)) } : d))
      setReclamando(null)
      setMotivo("")
      setMsgReclamo("")
    } else setMsgReclamo(r.error || "No se pudo registrar el reclamo")
  }

  if (!comercio) return null

  return (
    <div className="relative flex-1 overflow-y-auto rounded-t-[2rem] bg-white px-5 pb-28 pt-5">
      {comercios.length > 1 && (
        <select value={codigo} onChange={(e) => setCodigo(e.target.value)} aria-label="Comercio" className="mb-3 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-[14px]">
          {comercios.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      )}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[18px] font-bold text-[#4a1862]">{comercio.name}</p>
          <p className="text-[12px] text-gray-400">{datos ? `Hoy: ${datos.hoy.count} cobros · ${soles(datos.hoy.total)}` : "Cargando…"}</p>
          {datos && (datos.hoy.benefit ?? 0) > 0 && (
            <p className="text-[11px] text-gray-400">{soles(datos.hoy.personal ?? 0)} de saldo · {soles(datos.hoy.benefit ?? 0)} de beneficios</p>
          )}
        </div>
        <button type="button" onClick={activarSonido} aria-pressed={sonido} className={`flex items-center gap-1 rounded-full px-3 py-2 text-[12px] font-bold ${sonido ? "bg-[#00b5ad] text-white" : "bg-gray-100 text-gray-500"}`}>
          {sonido ? <Volume2 size={15} aria-hidden /> : <VolumeX size={15} aria-hidden />}
          {sonido ? "Sonido activo" : "Activar sonido"}
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 rounded-2xl bg-gray-100 p-1 text-[13px] font-bold">
        {(["recibidos", "qr"] as const).map((p) => (
          <button key={p} type="button" onClick={() => setPestana(p)} aria-pressed={pestana === p} className={`rounded-xl py-2 ${pestana === p ? "bg-white text-[#681984] shadow" : "text-gray-500"}`}>
            {p === "recibidos" ? "Recibidos" : "Mi QR"}
          </button>
        ))}
      </div>

      {aviso && (
        <button type="button" onClick={() => setAviso(null)} className="mb-3 flex w-full items-center gap-3 rounded-2xl bg-[#00b5ad] p-4 text-left text-white shadow">
          <BellRing size={22} aria-hidden />
          <span>
            <span className="block text-[16px] font-bold">Recibiste {soles(aviso.amount)}</span>
            <span className="block text-[12px] opacity-90">de {aviso.payer} · {horaLima(aviso.at)} · toca para cerrar</span>
          </span>
        </button>
      )}
      {error && <p role="alert" className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-[12px] text-amber-700">{error}. Reintentando…</p>}

      {pestana === "recibidos" ? (
        <ul className="space-y-2">
          {datos?.pagos.length === 0 && <li className="rounded-2xl border border-dashed border-gray-200 py-6 text-center text-[13px] text-gray-400">Aún no hay cobros.</li>}
          {datos?.pagos.map((p) => (
            <li key={p.id} className={`rounded-2xl border p-3 ${p.state === "done" ? "border-gray-100 bg-white" : "border-amber-200 bg-amber-50"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-gray-900">{soles(p.amount)} <span className="text-[12px] font-normal text-gray-500">de {p.payer}</span></p>
                  <p className="text-[11px] text-gray-400">{fechaHoraLima(p.at)} · {p.number}</p>
                  {p.benefit > 0 && <p className="text-[11px] text-[#00b5ad]">{soles(p.benefit)} con beneficio</p>}
                  {p.flagged && p.state === "done" && <p className="text-[11px] font-semibold text-amber-600">Compara con la venta antes de entregar</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${p.state === "done" ? "bg-green-100 text-green-700" : "bg-amber-200 text-amber-800"}`}>{ETIQUETA[p.state]}</span>
              </div>
              {p.state === "done" && (
                <button type="button" onClick={() => { setReclamando(p); setMsgReclamo("") }} className="mt-2 flex items-center gap-1 text-[12px] font-semibold text-gray-400 active:text-red-500">
                  <Flag size={13} aria-hidden /> Este pago no corresponde
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-6">
          <p className="text-[12px] text-gray-500">Muéstralo o imprímelo. El cliente escanea, escribe el monto y paga; tú verás el cobro en «Recibidos».</p>
          <TarjetaQr titulo="QR libre" detalle="El cliente escribe el monto" valor={comercio.qr} />
          {comercio.presets.map((p) => <TarjetaQr key={p.qr} titulo={p.label} detalle={soles(p.amount)} valor={p.qr} />)}
        </div>
      )}

      {reclamando && (
        <div role="dialog" aria-modal="true" aria-label="Reclamar pago" className="absolute inset-0 z-50 flex items-end bg-black/50">
          <div className="w-full rounded-t-[2rem] bg-white p-6 pb-10">
            <p className="text-[16px] font-bold text-gray-900">Pago de {soles(reclamando.amount)} de {reclamando.payer}</p>
            <p className="mb-3 text-[12px] text-gray-400">Cuéntanos por qué no corresponde. Un administrador lo revisa.</p>
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={200} rows={3} className="w-full rounded-2xl border border-gray-200 p-3 text-[14px]" placeholder="Ej.: no hubo venta a ese monto" />
            {msgReclamo && <p role="alert" className="mt-1 text-[13px] text-red-500">{msgReclamo}</p>}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setReclamando(null)} className="h-[46px] rounded-2xl bg-gray-100 text-[14px] font-bold text-gray-600">Cancelar</button>
              <button type="button" onClick={enviarReclamo} disabled={motivo.trim().length < 3} className="h-[46px] rounded-2xl bg-red-500 text-[14px] font-bold text-white disabled:opacity-40">Enviar reclamo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TarjetaQr({ titulo, detalle, valor }: { titulo: string; detalle: string; valor: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
      <div className="mx-auto h-[200px] w-[200px] rounded-xl bg-white p-2">
        <QRCode value={valor} size={184} level="M" fgColor="#4a1862" style={{ width: "100%", height: "100%" }} />
      </div>
      <p className="mt-2 text-[15px] font-bold text-gray-900">{titulo}</p>
      <p className="text-[12px] text-gray-500">{detalle}</p>
    </div>
  )
}
