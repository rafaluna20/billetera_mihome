import { afterEach, describe, expect, test, vi } from "vitest"
import { NextRequest } from "next/server"

import { baseDeDatos, SESION_SEGUNDOS, urlOdoo } from "@/lib/config"
import { proxy } from "@/proxy"
import { GET as salir } from "@/app/salir/route"

afterEach(() => vi.unstubAllEnvs())

describe("configuración del banco", () => {
  test("en desarrollo hay valores por defecto locales", () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("NEXT_PUBLIC_ODOO_URL", "")
    vi.stubEnv("ODOO_DB", "")
    expect(urlOdoo()).toBe("http://localhost:8069")
    expect(baseDeDatos()).toBe("odoo")
  })

  test("en producción NO hay valores por defecto: sin variables falla con un mensaje claro", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("NEXT_PUBLIC_ODOO_URL", "")
    vi.stubEnv("ODOO_DB", "")
    expect(() => urlOdoo()).toThrow(/NEXT_PUBLIC_ODOO_URL/)
    expect(() => baseDeDatos()).toThrow(/ODOO_DB/)
  })

  test("usa las variables y quita la barra final de la URL", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("NEXT_PUBLIC_ODOO_URL", "https://banco.example.com//")
    vi.stubEnv("ODOO_DB", "mi_base")
    expect(urlOdoo()).toBe("https://banco.example.com")
    expect(baseDeDatos()).toBe("mi_base")
  })

  test("la sesión dura 8 horas, menos que el token del banco (24 h)", () => {
    expect(SESION_SEGUNDOS).toBe(8 * 3600)
    expect(SESION_SEGUNDOS).toBeLessThan(24 * 3600)
  })
})

describe("proxy: puerta de las pantallas de la billetera", () => {
  const pedir = (ruta: string, cookie?: string) =>
    proxy(new NextRequest(`http://localhost${ruta}`, cookie ? { headers: { cookie } } : undefined))

  test("sin sesión redirige al inicio", () => {
    for (const ruta of ["/home", "/yapear", "/depositar"]) {
      const r = pedir(ruta)
      expect(r.status).toBe(307)
      expect(new URL(r.headers.get("location")!).pathname).toBe("/")
    }
  })

  test("con sesión deja pasar", () => {
    const r = pedir("/home", "wallet_token=abc")
    expect(r.headers.get("location")).toBeNull()
    expect(r.headers.get("x-middleware-next")).toBe("1")
  })

  test("una cookie vacía no cuenta como sesión", () => {
    expect(pedir("/yapear", "wallet_token=").status).toBe(307)
  })
})

describe("/salir", () => {
  test("borra las cookies de sesión y vuelve al inicio", () => {
    const r = salir(new Request("http://localhost/salir"))
    expect(r.status).toBe(307)
    expect(new URL(r.headers.get("location")!).pathname).toBe("/")
    const cookies = r.headers.getSetCookie().join(" | ")
    expect(cookies).toMatch(/wallet_token=;/)
    expect(cookies).toMatch(/wallet_user_email=;/)
  })
})
