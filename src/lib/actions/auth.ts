"use server";

import { cookies } from "next/headers";
import { fetchFromOdoo } from "../api";
import { redirect } from "next/navigation";

export async function login(username: string, password: string) {
  try {
    const response = await fetchFromOdoo("/api/wallet/auth/login", {
      method: "POST",
      body: JSON.stringify({
        params: {
          username: username,
          password: password,
          db: "rel",
        }
      })
    });

    console.log("Odoo login response:", response);

    const result = response.result;

    if (result && result.success) {
      const cookieStore = await cookies();
      cookieStore.set("wallet_token", result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      
      return { success: true };
    } else {
      return { success: false, error: result?.error || "Credenciales inválidas en Odoo" };
    }
  } catch (error: any) {
    console.error("Login Error:", error);
    return { success: false, error: "Error de conexión con el servidor" };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("wallet_token");
  redirect("/");
}

export async function getAuthToken() {
  const cookieStore = await cookies();
  return cookieStore.get("wallet_token")?.value;
}
