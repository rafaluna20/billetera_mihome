"use server"

import { fetchFromOdoo } from "../api"
import type { PlataformaInversion } from "../inversiones"
import { getAuthToken } from "./auth"

/**
 * Resultado de pedir las inversiones. Se distingue "la sesión venció" de "no hubo conexión" para no cerrar la sesión
 * por una falla de red (el mismo criterio que la cuenta de la pantalla de inicio).
 */
export type ResultadoInversiones =
  | { estado: "ok"; plataformas: PlataformaInversion[] }
  | { estado: "sesion" }
  | { estado: "conexion" }

/**
 * Dónde tiene invertido su dinero la persona. La billetera solo le pregunta al banco; el banco le pregunta a cada
 * plataforma por la cuenta de ESTA sesión. La billetera nunca manda un número de cuenta: no hay nada que manipular.
 */
export async function obtenerInversiones(): Promise<ResultadoInversiones> {
  const token = await getAuthToken()
  if (!token) return { estado: "sesion" }
  try {
    const response = await fetchFromOdoo("/api/wallet/platform/positions", {
      method: "POST",
      body: JSON.stringify({ params: {} }),
      token,
    })
    const result = response.result
    if (result?.success && Array.isArray(result.platforms)) {
      return { estado: "ok", plataformas: result.platforms as PlataformaInversion[] }
    }
    if (result?.code === "no_autorizado" || result?.error === "Unauthorized") return { estado: "sesion" }
    return { estado: "conexion" }
  } catch {
    return { estado: "conexion" }
  }
}
