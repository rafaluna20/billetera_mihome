/**
 * Configuración de la conexión con el banco (Odoo).
 *
 * En producción NO hay valores por defecto: si falta una variable, se falla con un mensaje claro en vez de
 * hablar sin querer con otro servidor (antes caía a un Odoo fijo y a la base "rel").
 */
const enProduccion = () => process.env.NODE_ENV === "production"

export function urlOdoo(): string {
  const url = process.env.NEXT_PUBLIC_ODOO_URL?.trim()
  if (url) return url.replace(/\/+$/, "")
  if (enProduccion()) throw new Error("Falta la variable de entorno NEXT_PUBLIC_ODOO_URL")
  return "http://localhost:8069"
}

export function baseDeDatos(): string {
  const db = process.env.ODOO_DB?.trim()
  if (db) return db
  if (enProduccion()) throw new Error("Falta la variable de entorno ODOO_DB")
  return "odoo"
}

/** Duración de la sesión de la app. El token del banco vale 24 h; aquí la cookie dura menos (dispositivo perdido = menos exposición). */
export const SESION_SEGUNDOS = 60 * 60 * 8

export const COOKIES_SESION = ["wallet_token", "wallet_user_email"] as const
