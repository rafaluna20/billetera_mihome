"use server";

import { fetchFromOdoo } from "../api";
import { getAuthToken } from "./auth";

export interface CuentaBilletera {
  name?: string;
  balance?: number;
  number?: string;
  daily_limit?: number;
  transaction_limit?: number;
}

export interface Movimiento {
  id?: number | string;
  description?: string;
  transaction_type_label?: string;
  partner_name?: string;
  recipient_name?: string;
  amount: number;
  date?: string;
}

/**
 * Resultado de pedir la cuenta. Se distingue "la sesión venció" (hay que volver a entrar) de "no hubo conexión"
 * (reintentar): antes las dos cosas se trataban igual y una falla de red cerraba la sesión.
 */
export type ResultadoCuenta =
  | { estado: "ok"; cuenta: CuentaBilletera }
  | { estado: "sesion" }
  | { estado: "conexion" };

export async function obtenerCuenta(): Promise<ResultadoCuenta> {
  const token = await getAuthToken();
  if (!token) return { estado: "sesion" };

  try {
    const response = await fetchFromOdoo("/api/wallet/account", {
      method: "POST",
      body: JSON.stringify({ params: {} }),
      token,
    });

    const result = response.result;
    if (result?.success && result.account) return { estado: "ok", cuenta: result.account as CuentaBilletera };
    // El banco responde "Unauthorized" cuando el token venció o fue invalidado.
    if (result?.error === "Unauthorized" || result?.error?.includes("Token")) return { estado: "sesion" };
    return { estado: "conexion" };
  } catch (error) {
    console.error("Fetch Account Error:", error);
    return { estado: "conexion" };
  }
}

export async function getWalletTransactions(limit = 10, offset = 0): Promise<Movimiento[]> {
  const token = await getAuthToken();
  if (!token) return [];

  try {
    const response = await fetchFromOdoo("/api/wallet/transactions", {
      method: "POST",
      body: JSON.stringify({ params: { limit, offset } }),
      token,
    });

    const result = response.result;

    if (result && result.success) {
      return (result.transactions as Movimiento[] | undefined) || [];
    }
    return [];
  } catch (error) {
    console.error("Fetch Transactions Error:", error);
    return [];
  }
}

export interface LimitesBilletera {
  porOperacion: number;
  porDia: number;
}

/** Límites reales de la cuenta (los que aplica el banco). `null` si no se pudieron obtener: la pantalla no inventa cifras. */
export async function obtenerLimites(): Promise<LimitesBilletera | null> {
  const r = await obtenerCuenta();
  if (r.estado !== "ok") return null;
  const { transaction_limit: porOperacion, daily_limit: porDia } = r.cuenta;
  if (typeof porOperacion !== "number" || typeof porDia !== "number") return null;
  return { porOperacion, porDia };
}
