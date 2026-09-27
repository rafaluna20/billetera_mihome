"use server"

import { cookies } from "next/headers"

import { fetchFromOdoo } from "../api"
import { COOKIES_SESION, SESION_SEGUNDOS } from "../config"
import type { EventoSeguridad, ResultadoPerfil, ResultadoSeguridad } from "../perfil"
import { validarContrasenaNueva } from "../perfil"
import { getAuthToken } from "./auth"

/** Respuesta del banco: sus campos se validan al usarlos. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Resultado = Record<string, any>

async function llamar(ruta: string, params: Record<string, unknown>) {
  const token = await getAuthToken()
  if (!token) return { sesion: true as const }
  const respuesta = await fetchFromOdoo(ruta, { method: "POST", body: JSON.stringify({ params }), token })
  return { sesion: false as const, r: respuesta.result as Resultado | undefined }
}

const esSesion = (r: Resultado | undefined) => r?.code === "no_autorizado" || r?.error === "Unauthorized"

/** Datos de la propia cuenta. La cuenta sale del token de la sesión, nunca de un parámetro. */
export async function obtenerPerfil(): Promise<ResultadoPerfil> {
  try {
    const x = await llamar("/api/wallet/profile", {})
    if (x.sesion) return { estado: "sesion" }
    const r = x.r
    if (r?.success && r.profile) {
      const p = r.profile
      return {
        estado: "ok",
        perfil: {
          name: p.name, email: p.email, phone: p.phone, cuenta: p.account_number, estado: p.state,
          correoVerificado: Boolean(p.email_verified), tieneClave: Boolean(p.has_pin), miembroDesde: p.member_since,
          limiteDiario: p.daily_limit, limitePorOperacion: p.transaction_limit,
        },
      }
    }
    return esSesion(r) ? { estado: "sesion" } : { estado: "conexion" }
  } catch {
    return { estado: "conexion" }
  }
}

export async function actividadDeSeguridad(): Promise<EventoSeguridad[]> {
  try {
    const x = await llamar("/api/wallet/security/events", {})
    return !x.sesion && x.r?.success ? (x.r.events as EventoSeguridad[]) : []
  } catch {
    return []
  }
}

/**
 * Cambia la contraseña. El banco exige la actual, cierra todas las demás sesiones y entrega un token nuevo: aquí se
 * guarda en la cookie para que ESTA sesión siga abierta.
 */
export async function cambiarContrasena(actual: string, nueva: string, repetida: string, correo = ""): Promise<ResultadoSeguridad> {
  const invalida = validarContrasenaNueva(actual, nueva, repetida, correo)
  if (invalida) return { success: false, code: "validacion", error: invalida }
  try {
    const x = await llamar("/api/wallet/auth/change-password", { current_password: actual, new_password: nueva })
    if (x.sesion) return { success: false, code: "no_autorizado", error: "Inicia sesión de nuevo." }
    const r = x.r
    if (r?.success && typeof r.token === "string") {
      const cookieStore = await cookies()
      cookieStore.set("wallet_token", r.token, {
        httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESION_SEGUNDOS,
      })
      return { success: true }
    }
    return { success: false, code: r?.code, error: r?.error || "No se pudo cambiar la contraseña" }
  } catch {
    return { success: false, code: "conexion", error: "Error de conexión. Revisa si cambió antes de reintentar." }
  }
}

/** Cierra la sesión en TODOS los dispositivos (pide la clave de 6 dígitos) y también en este. */
export async function cerrarSesionEnTodos(pin: string): Promise<ResultadoSeguridad> {
  if (!/^\d{4,6}$/.test(pin)) return { success: false, code: "pin_formato", error: "Escribe tu clave." }
  try {
    const x = await llamar("/api/wallet/auth/logout-all", { pin })
    if (x.sesion) return { success: false, code: "no_autorizado", error: "Inicia sesión de nuevo." }
    const r = x.r
    if (r?.success) {
      const cookieStore = await cookies()
      for (const nombre of COOKIES_SESION) cookieStore.delete(nombre)
      return { success: true }
    }
    return { success: false, code: r?.code, error: r?.error || "No se pudo cerrar las sesiones", intentosRestantes: r?.intentos_restantes }
  } catch {
    return { success: false, code: "conexion", error: "Error de conexión" }
  }
}
