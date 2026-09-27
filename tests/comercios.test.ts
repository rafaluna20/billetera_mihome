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

import { leerQrComercio, misComercios, pagarComercio, pagosRecibidos, reclamarPago, resumenBeneficios } from "@/lib/actions/comercios"
import { esQrComercio, horaLima, mensajeDeError, montoDeTexto, nuevaLlave, repartoPrevisto } from "@/lib/comercios"

const QR = "MIHOME1|CM7F3A9C21||abcdef0123456789abcdef01"
const QR_FIJO = "MIHOME1|CM7F3A9C21|12.00|abcdef0123456789abcdef01"

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

describe("lógica pura", () => {
  test("reconoce la forma de un QR de comercio (la autenticidad la decide el banco)", () => {
    expect(esQrComercio(QR)).toBe(true)
    expect(esQrComercio(QR_FIJO)).toBe(true)
    for (const malo of ["", "MIHOME1|solo|tres", "MIHOME2|a|b|c", "hola", JSON.stringify({ type: "MHOME_PAY", account: "WAL1" }), "MIHOME1|" + "x".repeat(200) + "|a|b"]) {
      expect(esQrComercio(malo)).toBe(false)
    }
  })

  test("monto escrito por el cliente", () => {
    expect(montoDeTexto("12")).toBe(12)
    expect(montoDeTexto("12.5")).toBe(12.5)
    expect(montoDeTexto("12,50")).toBe(12.5)
    expect(montoDeTexto(" 7.05 ")).toBe(7.05)
    for (const malo of ["", "0", "0.00", "-5", "1.005", "abc", "1e3", "12..5", "1234567", "1 2"]) expect(montoDeTexto(malo)).toBeNull()
  })

  test("reparto previsto: el bono primero, el resto del saldo, sin errores de coma flotante", () => {
    expect(repartoPrevisto(50, 30, true)).toEqual({ beneficio: 30, personal: 20 })
    expect(repartoPrevisto(20, 30, true)).toEqual({ beneficio: 20, personal: 0 })
    expect(repartoPrevisto(50, 30, false)).toEqual({ beneficio: 0, personal: 50 })
    expect(repartoPrevisto(0.3, 0.1, true)).toEqual({ beneficio: 0.1, personal: 0.2 })
    expect(repartoPrevisto(10, -5, true)).toEqual({ beneficio: 0, personal: 10 })
  })

  test("cada llave de intento es distinta y válida para el banco", () => {
    const a = nuevaLlave()
    expect(a).not.toBe(nuevaLlave())
    expect(a).toMatch(/^[A-Za-z0-9_.:-]{8,100}$/)
  })

  test("mensajes en lenguaje de persona, sin detalles internos", () => {
    expect(mensajeDeError("saldo_insuficiente")).toMatch(/saldo/i)
    expect(mensajeDeError("codigo_raro", "Algo pasó")).toBe("Algo pasó")
    expect(mensajeDeError(undefined, undefined)).toBeTruthy()
  })

  test("hora de Lima (no la del servidor)", () => {
    expect(horaLima("2026-09-27T20:32:00Z")).toMatch(/3:32|03:32/)
    expect(horaLima(null)).toBe("")
    expect(horaLima("basura")).toBe("")
  })
})

describe("leer el QR", () => {
  test("pregunta al banco con el token de la sesión y devuelve quién cobra y los saldos", async () => {
    fetchSimulado.mockResolvedValue(respuestaOdoo({
      success: true, merchant: { code: "CM7F3A9C21", name: "Bodega Don Juan", category: "bodega", max_payment: 200 },
      amount: 12, balance: 80, benefit_balance: 30,
    }))
    const r = await leerQrComercio(QR_FIJO)
    expect(r).toEqual({ estado: "ok", comercio: { code: "CM7F3A9C21", name: "Bodega Don Juan", category: "bodega", maxPago: 200, montoFijo: 12, saldo: 80, beneficio: 30 } })
    expect(fetchSimulado.mock.calls[0][0]).toContain("/api/wallet/merchant/lookup")
    expect(fetchSimulado.mock.calls[0][1].headers.Authorization).toBe("Bearer token-de-prueba")
  })

  test("un texto que no es QR de comercio ni llega al banco", async () => {
    const r = await leerQrComercio("hola")
    expect(r).toMatchObject({ estado: "error", code: "qr_invalido" })
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  test("sesión vencida, QR rechazado por el banco y falla de red se distinguen", async () => {
    cookiesSimuladas.clear()
    expect(await leerQrComercio(QR)).toEqual({ estado: "sesion" })
    cookiesSimuladas.set("wallet_token", "t")
    fetchSimulado.mockResolvedValueOnce(respuestaOdoo({ success: false, code: "no_autorizado" }))
    expect(await leerQrComercio(QR)).toEqual({ estado: "sesion" })
    fetchSimulado.mockResolvedValueOnce(respuestaOdoo({ success: false, code: "qr_invalido", error: "Este QR no es válido" }))
    expect(await leerQrComercio(QR)).toMatchObject({ estado: "error", code: "qr_invalido" })
    fetchSimulado.mockRejectedValueOnce(new Error("caída"))
    expect(await leerQrComercio(QR)).toMatchObject({ estado: "error", code: "conexion" })
  })
})

describe("pagar en un comercio", () => {
  const datos = { qr: QR, monto: 20, pin: "4826", llave: "pago-abc12345", usarBeneficio: true }

  test("manda el QR, el monto, la clave y la llave; NUNCA una cuenta (sale del token)", async () => {
    fetchSimulado.mockResolvedValue(respuestaOdoo({
      success: true, payment: "PAG-000001", merchant: "Bodega Don Juan", amount: 20, benefit_amount: 15, personal_amount: 5,
      balance: 75, benefit_balance: 0, idempotent: false,
    }))
    const r = await pagarComercio(datos)
    expect(r).toMatchObject({ success: true, numero: "PAG-000001", monto: 20, deBeneficio: 15, dePersonal: 5, saldo: 75, beneficio: 0, repetido: false })
    expect(cuerpoEnviado()).toEqual({ qr: QR, amount: 20, pin: "4826", idempotency_key: "pago-abc12345", use_benefit: true })
    expect(JSON.stringify(cuerpoEnviado())).not.toMatch(/account|WAL/i)
  })

  test("con un QR de monto fijo no se manda monto", async () => {
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: true, payment: "P", merchant: "B", amount: 12, benefit_amount: 0, personal_amount: 12, balance: 1, benefit_balance: 0 }))
    await pagarComercio({ ...datos, qr: QR_FIJO, monto: null })
    expect(cuerpoEnviado().amount).toBeNull()
  })

  test("datos mal formados no llegan al banco", async () => {
    for (const malo of [{ ...datos, qr: "hola" }, { ...datos, pin: "12" }, { ...datos, pin: "abcd" }, { ...datos, pin: "1234567" }]) {
      expect(await pagarComercio(malo)).toMatchObject({ success: false, code: "validacion" })
    }
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  test("clave incorrecta trae los intentos que quedan; el saldo insuficiente se conserva como código", async () => {
    fetchSimulado.mockResolvedValueOnce(respuestaOdoo({ success: false, code: "pin_invalido", error: "PIN incorrecto.", intentos_restantes: 2 }))
    expect(await pagarComercio(datos)).toMatchObject({ success: false, code: "pin_invalido", intentosRestantes: 2 })
    fetchSimulado.mockResolvedValueOnce(respuestaOdoo({ success: false, code: "saldo_insuficiente", error: "Saldo insuficiente" }))
    expect(await pagarComercio(datos)).toMatchObject({ success: false, code: "saldo_insuficiente" })
  })

  test("si la red falla el resultado es INCIERTO y se avisa que reintentar no cobra dos veces", async () => {
    fetchSimulado.mockRejectedValue(new Error("timeout"))
    const r = await pagarComercio(datos)
    expect(r).toMatchObject({ success: false, code: "conexion" })
    expect(r.error).toMatch(/no se cobrará dos veces/i)
  })

  test("sin sesión no llama al banco", async () => {
    cookiesSimuladas.clear()
    expect(await pagarComercio(datos)).toMatchObject({ success: false, code: "no_autorizado" })
    expect(fetchSimulado).not.toHaveBeenCalled()
  })
})

describe("beneficios y pantalla del comercio", () => {
  test("resumen de beneficios", async () => {
    fetchSimulado.mockResolvedValue(respuestaOdoo({
      success: true, balance: 40, by_issuer: [{ issuer: "Akallpa", amount: 20 }], grants: [{ id: 1, issuer: "Akallpa", amount: 30, remaining: 20, reason: "Meta", at: null, state: "active" }], spent: [],
    }))
    const r = await resumenBeneficios()
    expect(r).toMatchObject({ estado: "ok", resumen: { saldo: 40, porEmisor: [{ issuer: "Akallpa", amount: 20 }] } })
    fetchSimulado.mockRejectedValue(new Error("x"))
    expect(await resumenBeneficios()).toEqual({ estado: "conexion" })
  })

  test("mis comercios: vacío si falla o no es personal", async () => {
    fetchSimulado.mockResolvedValueOnce(respuestaOdoo({ success: true, merchants: [{ code: "CM1", name: "Bodega", category: "bodega", role: "cashier", qr: "MIHOME1|CM1||x", presets: [] }] }))
    expect(await misComercios()).toHaveLength(1)
    fetchSimulado.mockRejectedValueOnce(new Error("x"))
    expect(await misComercios()).toEqual([])
  })

  test("pagos recibidos pide solo lo suyo y traduce la respuesta", async () => {
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: true, merchant: "Bodega", today: { count: 1, total: 10 }, last_id: 5, payments: [{ id: 5, number: "P", at: null, amount: 10, personal: 10, benefit: 0, state: "done", payer: "Ana C.", concept: "" }] }))
    const r = await pagosRecibidos("CM1", 3)
    expect(r).toMatchObject({ estado: "ok", datos: { comercio: "Bodega", ultimoId: 5, hoy: { count: 1, total: 10 } } })
    expect(cuerpoEnviado()).toEqual({ code: "CM1", since_id: 3 })
    fetchSimulado.mockResolvedValueOnce(respuestaOdoo({ success: false, code: "sin_permiso", error: "No eres personal de este comercio" }))
    expect(await pagosRecibidos("CM1")).toEqual({ estado: "error", error: "No eres personal de este comercio" })
  })

  test("reclamar un pago", async () => {
    fetchSimulado.mockResolvedValueOnce(respuestaOdoo({ success: true, state: "disputed" }))
    expect(await reclamarPago("CM1", 7, "No corresponde")).toEqual({ ok: true })
    expect(cuerpoEnviado()).toEqual({ code: "CM1", payment_id: 7, reason: "No corresponde" })
    fetchSimulado.mockResolvedValueOnce(respuestaOdoo({ success: false, error: "Solo un pago vigente puede reclamarse" }))
    expect(await reclamarPago("CM1", 7, "otra vez")).toEqual({ ok: false, error: "Solo un pago vigente puede reclamarse" })
  })
})

describe("configuración de las pantallas nuevas", () => {
  test("pagar, comercio y beneficios exigen sesión y no se guardan en caché", async () => {
    const { config } = await import("@/proxy")
    for (const ruta of ["/pagar", "/comercio", "/beneficios"]) {
      expect(config.matcher).toContain(`${ruta}/:path*`)
    }
    const nextConfig = (await import("../next.config")).default
    const cabeceras = await nextConfig.headers?.()
    const sinCache = cabeceras?.find((c) => c.headers.some((h) => h.key === "Cache-Control" && h.value === "no-store"))
    for (const ruta of ["pagar", "comercio", "beneficios"]) expect(sinCache?.source).toContain(ruta)
  })
})

describe("estado de cuenta mensual", () => {
  test("meses: validación y desplazamiento de calendario", async () => {
    const { esMes, mesDesplazado, nombreDeMes, mesActualLima } = await import("@/lib/comercios")
    for (const ok of ["2026-09", "2026-01", "2026-12"]) expect(esMes(ok)).toBe(true)
    for (const malo of ["2026-13", "2026-00", "26-09", "2026-9", "", null, 5, "2026-09-01", "2026-09'; drop"]) expect(esMes(malo)).toBe(false)
    expect(mesDesplazado("2026-01", -1)).toBe("2025-12")
    expect(mesDesplazado("2026-12", 1)).toBe("2027-01")
    expect(mesDesplazado("2026-09", 0)).toBe("2026-09")
    expect(mesDesplazado("2026-03", -14)).toBe("2025-01")
    expect(nombreDeMes("2026-09")).toBe("septiembre 2026")
    expect(mesActualLima(new Date("2026-10-01T03:00:00Z"))).toBe("2026-09")   // en Lima aún es 30 de septiembre
  })

  test("pide el mes al banco con el token y traduce la respuesta", async () => {
    const { estadoMensual } = await import("@/lib/actions/comercios")
    fetchSimulado.mockResolvedValueOnce(respuestaOdoo({
      success: true, month: "2026-09", granted_total: 50, spent_total: 10, refunded_total: 5, grants: [], spent: [],
    }))
    const r = await estadoMensual("2026-09")
    expect(r).toMatchObject({ estado: "ok", datos: { mes: "2026-09", otorgado: 50, gastado: 10, devuelto: 5 } })
    expect(cuerpoEnviado()).toEqual({ month: "2026-09" })
  })

  test("un mes inválido no llega al banco; sin sesión o sin red se distingue", async () => {
    const { estadoMensual } = await import("@/lib/actions/comercios")
    expect(await estadoMensual("2026-13")).toEqual({ estado: "conexion" })
    expect(fetchSimulado).not.toHaveBeenCalled()
    fetchSimulado.mockRejectedValueOnce(new Error("x"))
    expect(await estadoMensual("2026-09")).toEqual({ estado: "conexion" })
    cookiesSimuladas.clear()
    expect(await estadoMensual("2026-09")).toEqual({ estado: "sesion" })
  })
})
