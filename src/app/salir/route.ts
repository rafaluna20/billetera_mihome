import { NextResponse } from "next/server"

import { COOKIES_SESION } from "@/lib/config"

/**
 * Cierra la sesión local cuando el banco ya no reconoce el token (venció o fue invalidado).
 * Las cookies solo se pueden borrar en un Route Handler o una Server Action, no mientras se dibuja una página:
 * por eso la pantalla de inicio redirige aquí en vez de borrarlas ella misma.
 */
export function GET(request: Request) {
  const respuesta = NextResponse.redirect(new URL("/", request.url))
  for (const nombre of COOKIES_SESION) respuesta.cookies.delete(nombre)
  return respuesta
}
