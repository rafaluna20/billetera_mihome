/**
 * Recibos de servicios (luz, agua) que se pagan con la billetera. Lógica pura y tipos: sin React ni red.
 *
 * Los recibos y sus montos los decide la plataforma del servicio; la billetera solo los muestra y, al pagar, manda
 * únicamente QUÉ recibo (nunca el monto ni la cuenta).
 */
import { formatearDinero } from "./inversiones"

export interface Recibo {
  id: number
  reference: string
  concept: string
  amount: number
  currency: string
  issued: string | null
  due: string | null
}

export type PlataformaCobros = {
  code: string
  name: string
  app_url: string | null
  currency: string
} & (
  | { estado: "ok"; charges: Recibo[] }
  | { estado: "no_vinculado"; charges: [] }
  | { estado: "no_disponible"; charges: [] }
)

export interface ResultadoPago {
  success: boolean
  code?: string
  error?: string
  intentosRestantes?: number
  operacion?: string
  monto?: number
  saldo?: number
  /** El dinero salió, pero la plataforma aún no registró el pago (se reintenta sola) o lo rechazó. */
  pendienteDeRegistro?: boolean
  repetido?: boolean
}

const RE_PIN = /^\d{4,6}$/
const RE_ID = /^\d{1,18}$/
const RE_PLATAFORMA = /^[a-z][a-z0-9_]{2,39}$/

export function validarPago(p: { plataforma: string; recibo: string; pin: string }): string | null {
  if (!RE_PLATAFORMA.test(p.plataforma)) return "Elige un servicio."
  if (!RE_ID.test(p.recibo)) return "Recibo inválido."
  if (!RE_PIN.test(p.pin)) return "Ingresa tu clave (4 a 6 dígitos)."
  return null
}

/** Total a pagar de una lista de recibos (misma moneda). */
export function totalPendiente(recibos: Recibo[]): number {
  return Math.round(recibos.reduce((s, r) => s + r.amount, 0) * 100) / 100
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

/** "2026-09-20" → "20 sep 2026". Sin zona horaria: la fecha del recibo es un día, no un instante. */
export function fechaCorta(iso: string | null): string {
  if (!iso) return "—"
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return "—"
  return `${Number(m[3])} ${MESES[Number(m[2]) - 1] ?? ""} ${m[1]}`
}

export type EstadoVencimiento = "vencido" | "por_vencer" | "al_dia" | "sin_fecha"

/** ¿El recibo está vencido? `hoy` se recibe como parámetro (fecha ISO): la lógica no depende del reloj. */
export function estadoVencimiento(vence: string | null, hoy: string): EstadoVencimiento {
  if (!vence || !/^\d{4}-\d{2}-\d{2}/.test(vence)) return "sin_fecha"
  const d = vence.slice(0, 10)
  if (d < hoy) return "vencido"
  const dias = Math.round((Date.parse(d) - Date.parse(hoy)) / 86400000)
  return dias <= 3 ? "por_vencer" : "al_dia"
}

export const ETIQUETA_VENCIMIENTO: Record<EstadoVencimiento, string> = {
  vencido: "Vencido",
  por_vencer: "Por vencer",
  al_dia: "",
  sin_fecha: "",
}

export function resumenDeReciboParaPago(r: Recibo): string {
  return `${r.concept} · ${formatearDinero(r.amount, r.currency)}`
}
