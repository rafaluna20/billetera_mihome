"use server"

import { fetchFromOdoo } from "../api"
import { getAuthToken } from "./auth"

/** Contacto tal como lo entrega el banco: nombre, correo y teléfono ENMASCARADOS; el número de cuenta completo. */
export interface WalletContact {
  name: string
  email: string
  phone: string
  account_number: string
  masked?: boolean
  initials?: string
}

export type TipoBusqueda = "phone" | "email" | "account" | "account_number" | "all"

const MIN_BUSQUEDA = 3
const RE_LLAVE = /^[A-Za-z0-9_.:-]{8,100}$/

function iniciales(nombre: string): string {
  return nombre.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
}

export async function searchWalletUsers(query: string, searchType: TipoBusqueda = "all"): Promise<WalletContact[]> {
  const token = await getAuthToken()
  const texto = query.trim()
  // El banco exige 3 caracteres como mínimo: no se le pregunta antes (antes se enviaba "a" y siempre fallaba).
  if (!token || texto.length < MIN_BUSQUEDA) return []

  try {
    const odooSearchType = searchType === "account_number" ? "account" : searchType
    const response = await fetchFromOdoo("/api/wallet/users/search", {
      method: "POST",
      body: JSON.stringify({ params: { query: texto, search_type: odooSearchType } }),
      token,
    })
    const result = response.result
    if (result && result.success) {
      const usuarios = (result.users as WalletContact[] | undefined) || []
      return usuarios.map((u) => ({ ...u, initials: iniciales(u.name || "") }))
    }
    return []
  } catch {
    return []
  }
}

export interface ResultadoTransferencia {
  success: boolean
  transaction?: { reference?: string; [clave: string]: unknown }
  error?: string
  code?: string
  intentosRestantes?: number
}

export async function transferFunds(params: {
  destinationEmail?: string
  destinationAccountNumber?: string
  destinationPhone?: string
  amount: number
  description?: string
  pin: string
  /** Clave de idempotencia de ESTE envío: reintentar con la misma nunca transfiere dos veces. */
  llave: string
}): Promise<ResultadoTransferencia> {
  const token = await getAuthToken()
  if (!token) return { success: false, error: "No autenticado" }

  if (!RE_LLAVE.test(params.llave)) return { success: false, error: "Solicitud inválida. Recarga la página." }
  const idempotencyKey = params.llave

  try {
    const body: Record<string, unknown> = {
      pin: params.pin,
      amount: params.amount,
      description: params.description || "Yapeo MiHome",
    }

    // El número de cuenta es lo único que identifica sin ambigüedad al destino (correo y teléfono llegan enmascarados).
    if (params.destinationAccountNumber) body.destination_account_number = params.destinationAccountNumber
    else if (params.destinationEmail) body.destination_email = params.destinationEmail
    else if (params.destinationPhone) body.destination_phone = params.destinationPhone

    const response = await fetchFromOdoo("/api/wallet/transfer", {
      method: "POST",
      body: JSON.stringify({ params: body }),
      token,
      headers: { "Idempotency-Key": idempotencyKey },
    })

    const result = response.result
    if (result && result.success) {
      return { success: true, transaction: result.transaction as ResultadoTransferencia["transaction"] }
    }
    return {
      success: false,
      error: result?.error || "Error en la transferencia",
      code: result?.code,
      intentosRestantes: result?.intentos_restantes as number | undefined,
    }
  } catch {
    // Resultado incierto: puede que el banco SÍ lo haya aplicado. Reintentar con la misma llave es seguro.
    return { success: false, code: "conexion", error: "No pudimos confirmar el envío. Reintenta: no se enviará dos veces." }
  }
}
