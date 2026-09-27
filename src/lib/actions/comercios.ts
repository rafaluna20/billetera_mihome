"use server"

import { fetchFromOdoo } from "../api"
import type { EstadoMensual, MiComercio, Recibidos, ResultadoPagoComercio, ResultadoQr, ResumenBeneficios } from "../comercios"
import { esMes, esQrComercio } from "../comercios"
import { getAuthToken } from "./auth"

/** Respuesta del banco: sus campos se validan al usarlos (todo lo demás cae en el error genérico). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Resultado = Record<string, any>

/** Todas estas acciones usan el token de la sesión: el banco toma de ahí quién es la persona, nunca de un parámetro. */
async function llamar(ruta: string, params: Record<string, unknown>) {
  const token = await getAuthToken()
  if (!token) return { sesion: true as const }
  const respuesta = await fetchFromOdoo(ruta, { method: "POST", body: JSON.stringify({ params }), token })
  return { sesion: false as const, r: respuesta.result as Resultado | undefined }
}

const esSesion = (r: { code?: string; error?: string } | undefined) => r?.code === "no_autorizado" || r?.error === "Unauthorized"

/** Quién cobra (nombre puesto por el administrador) y con qué saldos se puede pagar. */
export async function leerQrComercio(qr: string): Promise<ResultadoQr> {
  if (!esQrComercio(qr)) return { estado: "error", code: "qr_invalido", error: "Este QR no es de un comercio." }
  try {
    const x = await llamar("/api/wallet/merchant/lookup", { qr })
    if (x.sesion) return { estado: "sesion" }
    const r = x.r
    if (r?.success) {
      return {
        estado: "ok",
        comercio: {
          code: r.merchant.code, name: r.merchant.name, category: r.merchant.category, maxPago: r.merchant.max_payment,
          montoFijo: typeof r.amount === "number" ? r.amount : null, saldo: r.balance, beneficio: r.benefit_balance,
        },
      }
    }
    if (esSesion(r)) return { estado: "sesion" }
    return { estado: "error", code: r?.code, error: r?.error || "No se pudo leer el QR" }
  } catch {
    return { estado: "error", code: "conexion", error: "Sin conexión. Inténtalo de nuevo." }
  }
}

/**
 * Paga en un comercio. Se manda el QR (el banco lo vuelve a validar), el monto que escribió el cliente (ignorado si el
 * QR ya trae uno), la clave y una llave de intento: si el resultado es incierto, reintentar con la MISMA llave es seguro.
 */
export async function pagarComercio(params: {
  qr: string; monto: number | null; pin: string; llave: string; usarBeneficio: boolean
}): Promise<ResultadoPagoComercio> {
  if (!esQrComercio(params.qr) || !/^\d{4,6}$/.test(params.pin)) {
    return { success: false, code: "validacion", error: "Revisa los datos del pago." }
  }
  try {
    const x = await llamar("/api/wallet/merchant/pay", {
      qr: params.qr, amount: params.monto, pin: params.pin, idempotency_key: params.llave, use_benefit: params.usarBeneficio,
    })
    if (x.sesion) return { success: false, code: "no_autorizado", error: "Inicia sesión de nuevo." }
    const r = x.r
    if (r?.success) {
      return {
        success: true, numero: r.payment, comercio: r.merchant, monto: r.amount, deBeneficio: r.benefit_amount,
        dePersonal: r.personal_amount, saldo: r.balance, beneficio: r.benefit_balance, repetido: Boolean(r.idempotent),
      }
    }
    return { success: false, code: r?.code, error: r?.error || "No se pudo completar el pago", intentosRestantes: r?.intentos_restantes }
  } catch {
    // Resultado incierto: puede que el banco SÍ haya cobrado. Reintentar con la misma llave cobra una sola vez.
    return { success: false, code: "conexion", error: "No pudimos confirmar el pago. Revisa tus movimientos; si insistes, no se cobrará dos veces." }
  }
}

export async function resumenBeneficios(): Promise<{ estado: "ok"; resumen: ResumenBeneficios } | { estado: "sesion" } | { estado: "conexion" }> {
  try {
    const x = await llamar("/api/wallet/benefit/summary", {})
    if (x.sesion) return { estado: "sesion" }
    const r = x.r
    if (r?.success) {
      return {
        estado: "ok",
        resumen: { saldo: r.balance, porEmisor: r.by_issuer, bonos: r.grants, gastos: r.spent },
      }
    }
    return esSesion(r) ? { estado: "sesion" } : { estado: "conexion" }
  } catch {
    return { estado: "conexion" }
  }
}

/** Comercios donde la persona es personal (cajero o encargado), con los QR para mostrar. */
export async function misComercios(): Promise<MiComercio[]> {
  try {
    const x = await llamar("/api/wallet/merchant/my", {})
    return !x.sesion && x.r?.success ? (x.r.merchants as MiComercio[]) : []
  } catch {
    return []
  }
}

/** Pagos recibidos por un comercio (solo su personal). `desdeId` trae únicamente lo nuevo. */
export async function pagosRecibidos(code: string, desdeId = 0): Promise<{ estado: "ok"; datos: Recibidos } | { estado: "sesion" } | { estado: "error"; error: string }> {
  try {
    const x = await llamar("/api/wallet/merchant/received", { code, since_id: desdeId })
    if (x.sesion) return { estado: "sesion" }
    const r = x.r
    if (r?.success) return { estado: "ok", datos: { comercio: r.merchant, hoy: r.today, ultimoId: r.last_id, pagos: r.payments } }
    return esSesion(r) ? { estado: "sesion" } : { estado: "error", error: r?.error || "No se pudieron cargar los pagos" }
  } catch {
    return { estado: "error", error: "Sin conexión" }
  }
}

export async function reclamarPago(code: string, pagoId: number, motivo: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const x = await llamar("/api/wallet/merchant/dispute", { code, payment_id: pagoId, reason: motivo })
    if (x.sesion) return { ok: false, error: "Inicia sesión de nuevo." }
    return x.r?.success ? { ok: true } : { ok: false, error: x.r?.error || "No se pudo registrar el reclamo" }
  } catch {
    return { ok: false, error: "Sin conexión" }
  }
}

/** Estado de cuenta de beneficios de un mes («AAAA-MM»): lo recibido y lo gastado. */
export async function estadoMensual(mes: string): Promise<{ estado: "ok"; datos: EstadoMensual } | { estado: "sesion" } | { estado: "conexion" }> {
  if (!esMes(mes)) return { estado: "conexion" }
  try {
    const x = await llamar("/api/wallet/benefit/statement", { month: mes })
    if (x.sesion) return { estado: "sesion" }
    const r = x.r
    if (r?.success) {
      return {
        estado: "ok",
        datos: { mes: r.month, otorgado: r.granted_total, gastado: r.spent_total, devuelto: r.refunded_total, bonos: r.grants, gastos: r.spent },
      }
    }
    return esSesion(r) ? { estado: "sesion" } : { estado: "conexion" }
  } catch {
    return { estado: "conexion" }
  }
}
