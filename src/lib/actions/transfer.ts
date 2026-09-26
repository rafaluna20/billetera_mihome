"use server"

import { fetchFromOdoo } from "../api"
import { getAuthToken } from "./auth"

export interface WalletContact {
  name: string
  email: string
  phone: string
  account_number: string
  initials?: string
}

export async function searchWalletUsers(query: string, searchType: "phone" | "email" | "account" | "account_number" | "all" = "all"): Promise<WalletContact[]> {
  const token = await getAuthToken()
  if (!token) return []

  try {
    const odooSearchType = searchType === "account_number" ? "account" : searchType
    const response = await fetchFromOdoo("/api/wallet/users/search", {
      method: "POST",
      body: JSON.stringify({ params: { query: query || "a", search_type: odooSearchType } }),
      token,
    })
    const result = response.result
    if (result && result.success) {
      return (result.users || []).map((u: any) => ({
        ...u,
        initials: u.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
      }))
    }
    return []
  } catch {
    return []
  }
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
}) {
  const token = await getAuthToken()
  if (!token) return { success: false, error: "No autenticado" }

  if (!/^[A-Za-z0-9_.:-]{8,100}$/.test(params.llave)) return { success: false, error: "Solicitud inválida. Recarga la página." }
  const idempotencyKey = params.llave

  try {
    const body: any = {
      pin: params.pin,
      amount: params.amount,
      description: params.description || "Yapeo MiHome",
    }

    if (params.destinationEmail) body.destination_email = params.destinationEmail
    else if (params.destinationAccountNumber) body.destination_account_number = params.destinationAccountNumber
    else if (params.destinationPhone) body.destination_phone = params.destinationPhone

    const response = await fetchFromOdoo("/api/wallet/transfer", {
      method: "POST",
      body: JSON.stringify({ params: body }),
      token,
      headers: { "Idempotency-Key": idempotencyKey },
    })

    const result = response.result
    if (result && result.success) {
      return { success: true, transaction: result.transaction }
    }
    return {
      success: false,
      error: result?.error || "Error en la transferencia",
      code: result?.code as string | undefined,
      intentosRestantes: result?.intentos_restantes as number | undefined,
    }
  } catch {
    // Resultado incierto: puede que el banco SÍ lo haya aplicado. Reintentar con la misma llave es seguro.
    return { success: false, code: "conexion", error: "No pudimos confirmar el envío. Reintenta: no se enviará dos veces." }
  }
}
