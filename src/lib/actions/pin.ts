"use server"

import { fetchFromOdoo } from "../api"
import { getAuthToken } from "./auth"

/**
 * PIN de operaciones: se valida SIEMPRE en el servidor de la billetera (Odoo).
 * Esta app nunca guarda el PIN ni un hash: solo lo reenvía por HTTPS al servidor.
 */
export interface PinResult {
  success: boolean
  error?: string
  code?: string
  intentosRestantes?: number
}

const PIN_FORMATO = /^\d{4,6}$/

async function llamarPin(endpoint: string, params: Record<string, unknown>): Promise<PinResult> {
  const token = await getAuthToken()
  if (!token) {
    return { success: false, code: "no_autorizado", error: "Inicia sesión de nuevo." }
  }
  try {
    const response = await fetchFromOdoo(`/api/wallet/pin/${endpoint}`, {
      method: "POST",
      body: JSON.stringify({ params }),
      token,
    })
    const result = response.result
    if (result?.success) return { success: true }
    return {
      success: false,
      code: result?.code,
      error: result?.error || "No se pudo completar la operación",
      intentosRestantes: result?.intentos_restantes as number | undefined,
    }
  } catch {
    return { success: false, code: "conexion", error: "Error de conexión" }
  }
}

function pinInvalido(pin: string): PinResult | null {
  return PIN_FORMATO.test(pin) ? null : { success: false, code: "pin_formato", error: "El PIN debe tener entre 4 y 6 dígitos." }
}

/** Comprueba el PIN sin operar (desbloqueo de la app). Cuenta intentos y bloquea igual que una operación. */
export async function verificarPin(pin: string): Promise<PinResult> {
  return pinInvalido(pin) ?? llamarPin("verify", { pin })
}

/** Primer PIN: exige la contraseña de la cuenta. */
export async function crearPin(password: string, pin: string): Promise<PinResult> {
  if (!password) return { success: false, code: "password_incorrecta", error: "Falta la contraseña." }
  return pinInvalido(pin) ?? llamarPin("set", { password, pin })
}

export async function cambiarPin(pinActual: string, pinNuevo: string): Promise<PinResult> {
  return pinInvalido(pinNuevo) ?? llamarPin("change", { current_pin: pinActual, new_pin: pinNuevo })
}

/** "Olvidé mi PIN": envía un código al correo de la cuenta. */
export async function pedirCodigoPin(): Promise<PinResult> {
  return llamarPin("reset-request", {})
}

export async function restablecerPin(params: { codigo: string; password: string; pinNuevo: string }): Promise<PinResult> {
  return pinInvalido(params.pinNuevo) ?? llamarPin("reset", { code: params.codigo.trim(), password: params.password, new_pin: params.pinNuevo })
}
