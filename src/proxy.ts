import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Puerta de entrada: las pantallas de la billetera exigen sesión. Es una primera barrera (solo mira que exista la
 * cookie); la validez real del token la comprueba cada pantalla contra el banco.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.get("wallet_token")?.value) {
    return NextResponse.redirect(new URL("/", request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/home/:path*", "/yapear/:path*", "/depositar/:path*"],
}
