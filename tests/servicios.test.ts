import { beforeEach, describe, expect, test, vi } from "vitest"

const cookiesSimuladas = new Map<string, string>()
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (n: string) => (cookiesSimuladas.has(n) ? { value: cookiesSimuladas.get(n) } : undefined),
    set: (n: string, v: string) => void cookiesSimuladas.set(n, v),
    delete: (n: string) => void cookiesSimuladas.delete(n),
  }),
}))
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }))
vi.mock("next/navigation", () => ({ redirect: () => undefined }))

import { abrirAplicacion, obtenerRecibos, pagarRecibo } from "@/lib/actions/servicios"
import { estadoVencimiento, fechaCorta, totalPendiente, validarPago, type Recibo } from "@/lib/servicios"
import { proxy } from "@/proxy"
import { NextRequest } from "next/server"

const respuestaOdoo = (result: Record<string, unknown>) =>
  new Response(JSON.stringify({ jsonrpc: "2.0", result }), { status: 200, headers: { "Content-Type": "application/json" } })
const fetchSimulado = vi.fn()
const cuerpoEnviado = () => JSON.parse(fetchSimulado.mock.calls[0][1].body as string).params

beforeEach(() => {
  cookiesSimuladas.clear()
  cookiesSimuladas.set("wallet_token", "token-de-prueba")
  fetchSimulado.mockReset()
  vi.stubGlobal("fetch", fetchSimulado)
  vi.stubEnv("NEXT_PUBLIC_ODOO_URL", "http://banco.test")
})

describe("obtenerRecibos", () => {
  test("le pregunta al banco SIN mandar ningún número de cuenta", async () => {
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: true, platforms: [{ code: "servicios", name: "Luz y agua", estado: "ok", charges: [], app_url: null, currency: "PEN" }] }))
    const r = await obtenerRecibos()
    expect(r.estado).toBe("ok")
    expect(fetchSimulado.mock.calls[0][0]).toBe("http://banco.test/api/wallet/platform/charges")
    expect(cuerpoEnviado()).toEqual({})
    expect(fetchSimulado.mock.calls[0][1].headers.Authorization).toBe("Bearer token-de-prueba")
  })

  test("sin sesión no consulta; token vencido = sesión; falla de red = conexión (no cierra la sesión)", async () => {
    cookiesSimuladas.clear()
    expect(await obtenerRecibos()).toEqual({ estado: "sesion" })
    expect(fetchSimulado).not.toHaveBeenCalled()
    cookiesSimuladas.set("wallet_token", "t")
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: false, code: "no_autorizado" }))
    expect(await obtenerRecibos()).toEqual({ estado: "sesion" })
    fetchSimulado.mockRejectedValue(new Error("red caída"))
    expect(await obtenerRecibos()).toEqual({ estado: "conexion" })
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: false, code: "interno" }))
    expect(await obtenerRecibos()).toEqual({ estado: "conexion" })
  })
})

describe("pagarRecibo", () => {
  const pago = { plataforma: "servicios", recibo: "101", pin: "4826" }

  test("envía SOLO qué recibo y el PIN: nunca el monto ni la cuenta", async () => {
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: true, transaction_id: "WTX-1", amount: 250, balance: 750, notified: true }))
    const r = await pagarRecibo(pago)
    expect(r).toEqual({ success: true, operacion: "WTX-1", monto: 250, saldo: 750, pendienteDeRegistro: false, repetido: false })
    expect(cuerpoEnviado()).toEqual({ platform: "servicios", charge_id: "101", pin: "4826" })
  })

  test("si el aviso a la plataforma aún no llegó, lo indica para que la pantalla no asuste", async () => {
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: true, transaction_id: "WTX-1", amount: 250, balance: 750, notified: false, idempotent: true }))
    expect(await pagarRecibo(pago)).toMatchObject({ success: true, pendienteDeRegistro: true, repetido: true })
  })

  test("valida antes de llamar al banco", async () => {
    for (const mal of [{ ...pago, pin: "12" }, { ...pago, pin: "12a4" }, { ...pago, recibo: "" }, { ...pago, recibo: "1; drop" }, { ...pago, plataforma: "X!" }]) {
      const r = await pagarRecibo(mal)
      expect(r).toMatchObject({ success: false, code: "validacion" })
    }
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  test("sin sesión no paga", async () => {
    cookiesSimuladas.clear()
    expect(await pagarRecibo(pago)).toMatchObject({ success: false, code: "no_autorizado" })
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  test("errores del banco llegan con su código y los intentos de clave", async () => {
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: false, code: "pin_invalido", error: "PIN incorrecto.", intentos_restantes: 2 }))
    expect(await pagarRecibo(pago)).toMatchObject({ success: false, code: "pin_invalido", intentosRestantes: 2 })
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: false, code: "saldo_insuficiente", error: "Saldo insuficiente" }))
    expect(await pagarRecibo(pago)).toMatchObject({ success: false, code: "saldo_insuficiente" })
  })

  test("si se corta la conexión avisa que reintentar es seguro", async () => {
    fetchSimulado.mockRejectedValue(new Error("red caída"))
    const r = await pagarRecibo(pago)
    expect(r).toMatchObject({ success: false, code: "conexion" })
    expect(r.error).toMatch(/no se cobrará dos veces/i)
  })
})

describe("lógica de presentación", () => {
  test("validarPago", () => {
    expect(validarPago({ plataforma: "servicios", recibo: "5", pin: "123456" })).toBeNull()
    expect(validarPago({ plataforma: "", recibo: "5", pin: "1234" })).toMatch(/servicio/i)
    expect(validarPago({ plataforma: "servicios", recibo: "abc", pin: "1234" })).toMatch(/recibo/i)
    expect(validarPago({ plataforma: "servicios", recibo: "5", pin: "1234567" })).toMatch(/clave/i)
  })

  test("fechas sin corrimiento de zona horaria", () => {
    expect(fechaCorta("2026-09-20")).toBe("20 sep 2026")
    expect(fechaCorta("2026-01-05T00:00:00")).toBe("5 ene 2026")
    expect(fechaCorta(null)).toBe("—")
    expect(fechaCorta("basura")).toBe("—")
  })

  test("vencimiento según el día de hoy", () => {
    expect(estadoVencimiento("2026-09-19", "2026-09-20")).toBe("vencido")
    expect(estadoVencimiento("2026-09-20", "2026-09-20")).toBe("por_vencer")
    expect(estadoVencimiento("2026-09-23", "2026-09-20")).toBe("por_vencer")
    expect(estadoVencimiento("2026-09-24", "2026-09-20")).toBe("al_dia")
    expect(estadoVencimiento(null, "2026-09-20")).toBe("sin_fecha")
    expect(estadoVencimiento("no-fecha", "2026-09-20")).toBe("sin_fecha")
  })

  test("el total no arrastra errores de coma flotante", () => {
    const r = (amount: number) => ({ amount }) as Recibo
    expect(totalPendiente([r(0.1), r(0.2)])).toBe(0.3)
    expect(totalPendiente([])).toBe(0)
  })
})

test("/servicios exige sesión", () => {
  expect(proxy(new NextRequest("http://localhost/servicios")).status).toBe(307)
  expect(proxy(new NextRequest("http://localhost/servicios", { headers: { cookie: "wallet_token=abc" } })).headers.get("location")).toBeNull()
})

describe("entrada sin contraseña a otra app (SSO)", () => {
  test("pide el código al banco con el token de la sesión y solo manda el nombre de la app", async () => {
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: true, url: "https://asistencia.example.com/api/auth/sso?code=abc" }))
    const r = await abrirAplicacion("asistencia")
    expect(r).toEqual({ estado: "ok", url: "https://asistencia.example.com/api/auth/sso?code=abc" })
    expect(fetchSimulado.mock.calls[0][0]).toContain("/api/wallet/sso/issue")
    expect(cuerpoEnviado()).toEqual({ platform: "asistencia" })
    expect(fetchSimulado.mock.calls[0][1].headers.Authorization).toBe("Bearer token-de-prueba")
  })

  test("sin sesión no llama al banco", async () => {
    cookiesSimuladas.clear()
    expect(await abrirAplicacion("asistencia")).toEqual({ estado: "sesion" })
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  test("nombres raros no llegan al banco", async () => {
    for (const malo of ["", "A", "../x", "asistencia; drop", "x".repeat(60), 5 as unknown as string]) {
      expect(await abrirAplicacion(malo)).toEqual({ estado: "no_disponible" })
    }
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  test("rechaza direcciones que no son http(s) aunque vengan del banco", async () => {
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: true, url: "javascript:alert(1)" }))
    expect((await abrirAplicacion("asistencia")).estado).toBe("conexion")
  })

  test("distingue sesión vencida, app no disponible y falla de red", async () => {
    fetchSimulado.mockResolvedValueOnce(respuestaOdoo({ success: false, code: "no_autorizado" }))
    expect(await abrirAplicacion("asistencia")).toEqual({ estado: "sesion" })
    fetchSimulado.mockResolvedValueOnce(respuestaOdoo({ success: false, code: "plataforma_no_disponible" }))
    expect(await abrirAplicacion("asistencia")).toEqual({ estado: "no_disponible" })
    fetchSimulado.mockRejectedValueOnce(new Error("caída"))
    expect(await abrirAplicacion("asistencia")).toEqual({ estado: "conexion" })
  })
})
