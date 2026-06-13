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
  if (!token || token === "MOCK_TOKEN_DEMO") {
    // Mock contacts for demo
    const mock: WalletContact[] = [
      { name: "Ana García", phone: "977111222", email: "ana@demo.com", account_number: "WAL00000002" },
      { name: "Luis Torres", phone: "987333444", email: "luis@demo.com", account_number: "WAL00000003" },
      { name: "María López", phone: "944555666", email: "maria@demo.com", account_number: "WAL00000004" },
    ]
    if (!query) return mock
    return mock.filter(c => {
      if (searchType === "phone") return c.phone.includes(query)
      if (searchType === "email") return c.email.includes(query)
      if (searchType === "account" || searchType === "account_number") return c.account_number.includes(query.toUpperCase())
      return c.name.toLowerCase().includes(query.toLowerCase()) || c.phone.includes(query)
    })
  }

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
}) {
  const token = await getAuthToken()
  if (!token) return { success: false, error: "No autenticado" }

  if (token === "MOCK_TOKEN_DEMO") {
    return {
      success: true,
      transaction: { reference: "DEMO-TX-001", state: "done", amount: params.amount, fee: 0 }
    }
  }

  const idempotencyKey = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

  try {
    const body: any = {
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
    return { success: false, error: result?.error || "Error en la transferencia" }
  } catch {
    return { success: false, error: "Error de conexión" }
  }
}
