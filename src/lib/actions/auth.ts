"use server";

import { cookies } from "next/headers";
import { fetchFromOdoo } from "../api";
import { baseDeDatos, COOKIES_SESION, SESION_SEGUNDOS } from "../config";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function login(username: string, password: string) {
  try {
    const response = await fetchFromOdoo("/api/wallet/auth/login", {
      method: "POST",
      body: JSON.stringify({
        params: {
          username: username,
          password: password,
          // Base de datos del Odoo: sale de ODOO_DB (en producción es obligatoria).
          db: baseDeDatos(),
        }
      })
    });

    const result = response.result;

    if (result && result.success) {
      const cookieStore = await cookies();
      const opciones = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
        maxAge: SESION_SEGUNDOS,
      };
      cookieStore.set("wallet_token", String(result.token), opciones);
      cookieStore.set("wallet_user_email", username, opciones);

      revalidatePath("/", "layout");
      const wallet = result.wallet as { has_pin?: boolean } | undefined;
      return { success: true, hasPin: Boolean(wallet?.has_pin) };
    } else {
      return { success: false, error: result?.error || "Credenciales inválidas en Odoo" };
    }
  } catch (error) {
    console.error("Login Error:", error);
    return { success: false, error: "Error de conexión con el servidor" };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  for (const nombre of COOKIES_SESION) cookieStore.delete(nombre);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function getAuthToken() {
  const cookieStore = await cookies();
  return cookieStore.get("wallet_token")?.value;
}

export async function checkSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("wallet_token")?.value;
  const email = cookieStore.get("wallet_user_email")?.value;

  if (token && email) {
    return { active: true, email: email };
  }
  return { active: false };
}
