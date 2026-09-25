"use server";

import { cookies } from "next/headers";
import { fetchFromOdoo } from "../api";
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
          db: "rel",
        }
      })
    });

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
      cookieStore.set("wallet_user_email", username, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      revalidatePath("/", "layout");
      return { success: true, hasPin: Boolean(result.wallet?.has_pin) };
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
  cookieStore.delete("wallet_user_email");
  cookieStore.delete("wallet_firebase_uid");
  cookieStore.delete("wallet_firebase_collection");
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
