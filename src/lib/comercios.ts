/**
 * Pagos a comercios (bodega, restaurante) y beneficios (bonos). Lógica pura y tipos: sin React ni red.
 *
 * El QR del comercio lo firma el banco; la billetera solo lo lee y le pregunta al banco quién es (el NOMBRE que se
 * muestra lo pone el administrador, no el QR). Con un QR de monto fijo, el monto lo dicta el QR.
 */

export const PREFIJO_QR_COMERCIO = "MIHOME1|"

/** ¿Este texto parece un QR de comercio? (La autenticidad la decide el banco, no esta función.) */
export function esQrComercio(texto: string): boolean {
  return typeof texto === "string" && texto.length <= 120 && texto.startsWith(PREFIJO_QR_COMERCIO) && texto.split("|").length === 4
}

/** Monto escrito por el cliente → número, o null si no es válido (positivo, máximo 2 decimales, tope razonable). */
export function montoDeTexto(texto: string): number | null {
  const limpio = texto.trim().replace(",", ".")
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(limpio)) return null
  const valor = Number(limpio)
  return valor > 0 ? valor : null
}

/** Reparto previsto de un pago: primero el bono (si se usa), lo demás del saldo personal. */
export function repartoPrevisto(monto: number, beneficio: number, usarBeneficio: boolean) {
  const centavos = (n: number) => Math.round(n * 100)
  const total = centavos(monto)
  const deBeneficio = usarBeneficio ? Math.min(centavos(Math.max(beneficio, 0)), total) : 0
  return { beneficio: deBeneficio / 100, personal: (total - deBeneficio) / 100 }
}

/** Clave única de UN intento de pago: si se reintenta el mismo pago se reutiliza, y el banco cobra una sola vez. */
export function nuevaLlave(): string {
  const azar = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().replace(/-/g, "") : `${Date.now()}${Math.random().toString(36).slice(2)}`
  return `pago-${azar}`.slice(0, 60)
}

const MENSAJES: Record<string, string> = {
  qr_invalido: "Este QR no es válido. Pide al comercio que te muestre el suyo.",
  comercio_inactivo: "Este comercio no puede cobrar por ahora.",
  monto_invalido: "Revisa el monto.",
  monto_no_coincide: "El monto no coincide con el del QR.",
  saldo_insuficiente: "Tu saldo no alcanza para este pago.",
  limite_pago: "Superas el máximo por pago de este comercio.",
  limite_diario: "Superas tu límite diario en este comercio.",
  limite_mensual: "Superas tu límite mensual en este comercio.",
  emisor_sin_fondos: "El beneficio no está disponible por ahora. Desactívalo y paga con tu saldo.",
  cuenta_inactiva: "Tu cuenta no está activa.",
  idempotencia_conflicto: "Este pago ya se intentó con otros datos. Vuelve a empezar.",
  no_autorizado: "Tu sesión venció. Vuelve a entrar.",
}

export function mensajeDeError(code?: string, respaldo?: string): string {
  return (code && MENSAJES[code]) || respaldo || "No se pudo completar la operación"
}

export interface InfoComercio {
  code: string
  name: string
  category: string
  maxPago: number
  /** Monto fijado por el QR (menú del día), o null si lo escribe el cliente. */
  montoFijo: number | null
  saldo: number
  beneficio: number
}

export type ResultadoQr =
  | { estado: "ok"; comercio: InfoComercio }
  | { estado: "sesion" }
  | { estado: "error"; code?: string; error: string }

export interface ResultadoPagoComercio {
  success: boolean
  code?: string
  error?: string
  intentosRestantes?: number
  numero?: string
  comercio?: string
  monto?: number
  deBeneficio?: number
  dePersonal?: number
  saldo?: number
  beneficio?: number
  repetido?: boolean
}

export interface MiComercio {
  code: string
  name: string
  category: string
  role: string
  qr: string
  presets: { label: string; amount: number; qr: string }[]
}

export interface PagoRecibido {
  id: number
  number: string
  at: string
  amount: number
  personal: number
  benefit: number
  state: "done" | "disputed" | "refunded"
  payer: string
  concept: string
  /** El banco lo marcó para revisión (monto alto o varios pagos seguidos): el cajero puede comprobarlo. */
  flagged?: boolean
}

export interface Recibidos {
  comercio: string
  hoy: { count: number; total: number; personal?: number; benefit?: number }
  ultimoId: number
  pagos: PagoRecibido[]
}

export interface ResumenBeneficios {
  saldo: number
  porEmisor: { issuer: string; amount: number }[]
  bonos: { id: number; issuer: string; amount: number; remaining: number; reason: string; at: string | null; state: string }[]
  gastos: { number: string; merchant: string; benefit: number; total: number; at: string | null; state: string }[]
}

export const ETIQUETA_BONO: Record<string, string> = { active: "Vigente", exhausted: "Gastado", void: "Anulado" }

/** Hora local de Lima de un instante ISO en UTC. */
export function horaLima(iso: string | null): string {
  if (!iso) return ""
  const fecha = new Date(iso)
  return Number.isNaN(fecha.getTime()) ? "" : fecha.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" })
}

export function fechaHoraLima(iso: string | null): string {
  if (!iso) return ""
  const fecha = new Date(iso)
  return Number.isNaN(fecha.getTime())
    ? ""
    : fecha.toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" })
}

export interface EstadoMensual {
  mes: string
  otorgado: number
  gastado: number
  devuelto: number
  bonos: { issuer: string; amount: number; reason: string; at: string | null }[]
  gastos: { number: string; merchant: string; benefit: number; total: number; at: string | null; state: string }[]
}

const RE_MES = /^\d{4}-(0[1-9]|1[0-2])$/

/** ¿Es un mes «AAAA-MM» válido? */
export function esMes(texto: unknown): texto is string {
  return typeof texto === "string" && RE_MES.test(texto)
}

/** Mes anterior o siguiente de un «AAAA-MM» (sin husos horarios: solo aritmética de calendario). */
export function mesDesplazado(mes: string, delta: number): string {
  const [anio, m] = mes.split("-").map(Number)
  const indice = anio * 12 + (m - 1) + delta
  return `${Math.floor(indice / 12)}-${String((indice % 12) + 1).padStart(2, "0")}`
}

/** Mes actual en Lima («AAAA-MM»). */
export function mesActualLima(ahora: Date = new Date()): string {
  return ahora.toLocaleDateString("en-CA", { timeZone: "America/Lima" }).slice(0, 7)
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

export function nombreDeMes(mes: string): string {
  const [anio, m] = mes.split("-").map(Number)
  return `${MESES[m - 1]} ${anio}`
}
