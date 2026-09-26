"use server"

import { fetchFromOdoo } from "../api"
import type { PlataformaCobros, ResultadoPago } from "../servicios"
import { validarPago } from "../servicios"
import { getAuthToken } from "./auth"

/** Igual que las demás pantallas: se distingue "la sesión venció" de "no hubo conexión". */
export type ResultadoRecibos =
  | { estado: "ok"; plataformas: PlataformaCobros[] }
  | { estado: "sesion" }
  | { estado: "conexion" }

/**
 * Recibos pendientes del usuario. La billetera solo le pregunta al banco; el banco le pregunta a cada servicio por la
 * cuenta de ESTA sesión (nunca se manda un número de cuenta desde aquí).
 */
export async function obtenerRecibos(): Promise<ResultadoRecibos> {
  const token = await getAuthToken()
  if (!token) return { estado: "sesion" }
  try {
    const response = await fetchFromOdoo("/api/wallet/platform/charges", {
      method: "POST",
      body: JSON.stringify({ params: {} }),
      token,
    })
    const result = response.result
    if (result?.success && Array.isArray(result.platforms)) {
      return { estado: "ok", plataformas: result.platforms as PlataformaCobros[] }
    }
    if (result?.code === "no_autorizado" || result?.error === "Unauthorized") return { estado: "sesion" }
    return { estado: "conexion" }
  } catch {
    return { estado: "conexion" }
  }
}

/**
 * Paga UN recibo. Solo se envía QUÉ recibo y el PIN: el monto lo dicta el servicio (el banco se lo pregunta justo antes
 * de cobrar), así que ni un cliente manipulado puede pagar de menos.
 */
export async function pagarRecibo(params: { plataforma: string; recibo: string; pin: string }): Promise<ResultadoPago> {
  const token = await getAuthToken()
  if (!token) return { success: false, code: "no_autorizado", error: "Inicia sesión de nuevo." }
  const invalido = validarPago(params)
  if (invalido) return { success: false, code: "validacion", error: invalido }

  try {
    const response = await fetchFromOdoo("/api/wallet/platform/charge/pay", {
      method: "POST",
      body: JSON.stringify({ params: { platform: params.plataforma, charge_id: params.recibo, pin: params.pin } }),
      token,
    })
    const r = response.result
    if (r?.success) {
      return {
        success: true,
        operacion: r.transaction_id as string,
        monto: r.amount as number,
        saldo: r.balance as number,
        pendienteDeRegistro: !r.notified,
        repetido: Boolean(r.idempotent),
      }
    }
    return {
      success: false,
      code: r?.code,
      error: r?.error || "No se pudo completar el pago",
      intentosRestantes: r?.intentos_restantes as number | undefined,
    }
  } catch {
    // Resultado incierto: puede que el banco SÍ haya cobrado. Volver a intentar es seguro: cobra una sola vez por recibo.
    return { success: false, code: "conexion", error: "No pudimos confirmar el pago. Revisa tus movimientos; si insistes, no se cobrará dos veces." }
  }
}
