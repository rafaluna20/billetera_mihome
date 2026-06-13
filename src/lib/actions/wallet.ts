"use server";

import { cache } from "react";
import { fetchFromOdoo } from "../api";
import { getAuthToken, logout } from "./auth";

export const getWalletAccount = cache(async () => {
  const token = await getAuthToken();
  if (!token) return null;

  if (token === "MOCK_TOKEN_DEMO") {
    return {
      id: 999,
      number: "WAL-DEMO-001",
      balance: 15420.50,
      state: "active",
    };
  }

  try {
    const response = await fetchFromOdoo("/api/wallet/account", {
      method: "POST",
      body: JSON.stringify({ params: {} }),
      token,
    });

    const result = response.result;
    
    if (result && result.success) {
      return result.account;
    } else if (result?.error === "Unauthorized" || result?.error?.includes("Token")) {
      await logout(); // Session expired
      return null;
    }
    return null;
  } catch (error) {
    console.error("Fetch Account Error:", error);
    return null;
  }
});

export const getWalletTransactions = cache(async (limit = 10, offset = 0) => {
  const token = await getAuthToken();
  if (!token) return [];

  if (token === "MOCK_TOKEN_DEMO") {
    return [
      { id: 1, description: "Movistar", date: new Date().toISOString(), amount: -30.00 },
      { id: 2, description: "Recarga de saldo", date: new Date(Date.now() - 86400000).toISOString(), amount: 150.00 },
      { id: 3, description: "Transferencia a Juan", date: new Date(Date.now() - 172800000).toISOString(), amount: -45.50 },
    ];
  }

  try {
    const response = await fetchFromOdoo("/api/wallet/transactions", {
      method: "POST",
      body: JSON.stringify({ params: { limit, offset } }),
      token,
    });

    const result = response.result;

    if (result && result.success) {
      return result?.transactions || [];
    }
    return [];
  } catch (error) {
    console.error("Fetch Transactions Error:", error);
    return [];
  }
});
