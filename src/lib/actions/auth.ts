"use server";

import { cookies } from "next/headers";
import { fetchFromOdoo } from "../api";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminDb as db } from "@/lib/firebase/adminConfig";

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
      cookieStore.set("wallet_user_email", username, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      // ── Optimizacion Rendimiento: Guardar Firebase UID en cookie ──
      try {
        let firebaseUid = null;
        let firebaseCollection = "usuarios";
        
        const usersSnapshot = await db.collection("usuarios").where("email", "==", username).get();
        if (!usersSnapshot.empty) {
          firebaseUid = usersSnapshot.docs[0].id;
          firebaseCollection = "usuarios";
        } else {
          const usersEnSnapshot = await db.collection("users").where("email", "==", username).get();
          if (!usersEnSnapshot.empty) {
            firebaseUid = usersEnSnapshot.docs[0].id;
            firebaseCollection = "users";
          }
        }

        if (firebaseUid) {
          cookieStore.set("wallet_firebase_uid", firebaseUid, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
          });
          cookieStore.set("wallet_firebase_collection", firebaseCollection, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
          });
        }
      } catch (fbError) {
        console.error("Error al buscar UID de Firebase en login:", fbError);
        // No bloqueamos el login si falla Firebase, ya que el email ya está en cookie como respaldo
      }
      
      revalidatePath("/", "layout");
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
