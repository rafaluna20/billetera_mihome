"use server";

import { fetchFromOdoo } from "../api";
import { getAuthToken, logout } from "./auth";

export async function getWalletAccount() {
  const token = await getAuthToken();
  if (!token) return null;

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
}

export async function getWalletTransactions(limit = 10, offset = 0) {
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
      return result?.transactions || [];
    }
    return [];
  } catch (error) {
    console.error("Fetch Transactions Error:", error);
    return [];
  }
}
