"use server"

import { fetchFromOdoo } from "../api"
import { getAuthToken } from "./auth"

/**
 * Depósitos a plataformas (p. ej. Akallpa Inversiones). La billetera no conoce a las plataformas:
 * solo pide al banco la lista de las disponibles y mueve dinero de la cuenta del usuario a la de la plataforma.
 * El PIN se valida en el servidor del banco en cada depósito.
 */
export interface Plataforma {
  code: string
  name: string
}

export interface DepositoResult {
  success: boolean
  error?: string
  code?: string
  intentosRestantes?: number
  saldo?: number
  repetido?: boolean
}

const RE_PLATAFORMA = /^[a-z][a-z0-9_]{2,39}$/
const RE_LLAVE = /^[A-Za-z0-9_.:-]{8,100}$/
const RE_PIN = /^\d{4,6}$/

export async function listarPlataformas(): Promise<Plataforma[]> {
  const token = await getAuthToken()
  if (!token) return []
  try {
    const response = await fetchFromOdoo("/api/wallet/platform/list", {
      method: "POST",
      body: JSON.stringify({ params: {} }),
      token,
    })
    const result = response.result
    return result?.success && Array.isArray(result.platforms) ? result.platforms : []
  } catch {
    return []
  }
}

export async function depositarEnPlataforma(params: {
  platform: string
  amount: number
  pin: string
  /** Clave de idempotencia de ESTE intento: reintentar con la misma nunca deposita dos veces. */
  llave: string
}): Promise<DepositoResult> {
  const token = await getAuthToken()
  if (!token) return { success: false, code: "no_autorizado", error: "Inicia sesión de nuevo." }

  const centavos = Math.round(params.amount * 100)
  if (!RE_PLATAFORMA.test(params.platform)) return { success: false, code: "validacion", error: "Elige una plataforma." }
  if (!Number.isFinite(params.amount) || params.amount <= 0 || Math.abs(params.amount * 100 - centavos) > 1e-6) {
    return { success: false, code: "monto_invalido", error: "Ingresa un monto válido (hasta 2 decimales)." }
  }
  if (!RE_PIN.test(params.pin)) return { success: false, code: "pin_requerido", error: "Ingresa tu clave (4 a 6 dígitos)." }
  if (!RE_LLAVE.test(params.llave)) return { success: false, code: "validacion", error: "Solicitud inválida. Recarga la página." }

  try {
    const response = await fetchFromOdoo("/api/wallet/platform/deposit", {
      method: "POST",
      body: JSON.stringify({
        params: { platform: params.platform, amount: centavos / 100, idempotency_key: params.llave, pin: params.pin },
      }),
      token,
    })
    const result = response.result
    if (result?.success) return { success: true, saldo: result.balance as number | undefined, repetido: Boolean(result.idempotent) }
    return {
      success: false,
      code: result?.code,
      error: result?.error || "No se pudo completar el depósito",
      intentosRestantes: result?.intentos_restantes as number | undefined,
    }
  } catch {
    // Resultado incierto: puede que el banco SÍ lo haya aplicado. Reintentar con la misma llave es seguro.
    return { success: false, code: "conexion", error: "No pudimos confirmar el depósito. Reintenta: no se cobrará dos veces." }
  }
}
