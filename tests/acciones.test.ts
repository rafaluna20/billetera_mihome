import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

// Cookies simuladas: la sesión de la persona que está usando la app.
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

import { searchWalletUsers, transferFunds } from "@/lib/actions/transfer"
import { obtenerCuenta } from "@/lib/actions/wallet"
import { depositarEnPlataforma } from "@/lib/actions/plataformas"
import { crearPin, verificarPin } from "@/lib/actions/pin"
import { login } from "@/lib/actions/auth"

const LLAVE = "TXN-12345678-abcd"

function respuestaOdoo(result: Record<string, unknown>) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", result }), { status: 200, headers: { "Content-Type": "application/json" } })
}

const fetchSimulado = vi.fn()

beforeEach(() => {
  cookiesSimuladas.clear()
  cookiesSimuladas.set("wallet_token", "token-de-prueba")
  cookiesSimuladas.set("wallet_user_email", "ana@example.com")
  fetchSimulado.mockReset()
  vi.stubGlobal("fetch", fetchSimulado)
  vi.stubEnv("NEXT_PUBLIC_ODOO_URL", "http://banco.test")
  vi.stubEnv("ODOO_DB", "base_de_prueba")
})
afterEach(() => vi.unstubAllEnvs())

const cuerpoEnviado = () => JSON.parse(fetchSimulado.mock.calls[0][1].body as string).params
const cabecerasEnviadas = () => fetchSimulado.mock.calls[0][1].headers as Record<string, string>

describe("búsqueda de contactos", () => {
  test("no le pregunta al banco con menos de 3 caracteres", async () => {
    expect(await searchWalletUsers("")).toEqual([])
    expect(await searchWalletUsers("ab")).toEqual([])
    expect(await searchWalletUsers("  a ")).toEqual([])
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  test("sin sesión no consulta nada", async () => {
    cookiesSimuladas.clear()
    expect(await searchWalletUsers("Beto")).toEqual([])
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  test("recorta el texto, traduce el tipo y agrega las iniciales", async () => {
    fetchSimulado.mockResolvedValue(respuestaOdoo({
      success: true, users: [{ name: "Beto C. R. S.", email: "b***@example.com", phone: "*** *** 456", account_number: "WAL001", masked: true }],
    }))
    const r = await searchWalletUsers("  WAL001 ", "account_number")
    expect(cuerpoEnviado()).toEqual({ query: "WAL001", search_type: "account" })
    expect(cabecerasEnviadas().Authorization).toBe("Bearer token-de-prueba")
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ account_number: "WAL001", initials: "BC" })
  })

  test("un error del banco o de red devuelve lista vacía, no rompe", async () => {
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: false, error: "Error en la búsqueda" }))
    expect(await searchWalletUsers("Beto")).toEqual([])
    fetchSimulado.mockRejectedValue(new Error("red caída"))
    expect(await searchWalletUsers("Beto")).toEqual([])
  })
})

describe("transferencias", () => {
  const base = { amount: 25.5, pin: "4826", llave: LLAVE }

  test("con número de cuenta usa solo ese, aunque haya correo y teléfono", async () => {
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: true, transaction: { reference: "TRX-1" } }))
    const r = await transferFunds({ ...base, destinationAccountNumber: "WAL001", destinationEmail: "b***@x.com", destinationPhone: "*** *** 456" })
    expect(r).toMatchObject({ success: true, transaction: { reference: "TRX-1" } })
    const cuerpo = cuerpoEnviado()
    expect(cuerpo.destination_account_number).toBe("WAL001")
    expect(cuerpo).not.toHaveProperty("destination_email")
    expect(cuerpo).not.toHaveProperty("destination_phone")
    expect(cabecerasEnviadas()["Idempotency-Key"]).toBe(LLAVE)
  })

  test("sin cuenta cae al correo y luego al teléfono", async () => {
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: true, transaction: {} }))
    await transferFunds({ ...base, destinationEmail: "beto@example.com" })
    expect(cuerpoEnviado().destination_email).toBe("beto@example.com")
    fetchSimulado.mockClear()
    await transferFunds({ ...base, destinationPhone: "977123456" })
    expect(cuerpoEnviado().destination_phone).toBe("977123456")
  })

  test("rechaza una llave de idempotencia inválida sin llamar al banco", async () => {
    for (const llave of ["", "corta", "con espacios que no valen", "x".repeat(101)]) {
      const r = await transferFunds({ ...base, llave, destinationAccountNumber: "WAL001" })
      expect(r.success).toBe(false)
    }
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  test("sin sesión no envía", async () => {
    cookiesSimuladas.clear()
    expect((await transferFunds({ ...base, destinationAccountNumber: "WAL001" })).success).toBe(false)
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  test("un error de clave devuelve el código y los intentos restantes", async () => {
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: false, code: "pin_invalido", error: "Clave incorrecta", intentos_restantes: 2 }))
    const r = await transferFunds({ ...base, destinationAccountNumber: "WAL001" })
    expect(r).toMatchObject({ success: false, code: "pin_invalido", intentosRestantes: 2 })
  })

  test("si se corta la conexión avisa que reintentar es seguro", async () => {
    fetchSimulado.mockRejectedValue(new Error("red caída"))
    const r = await transferFunds({ ...base, destinationAccountNumber: "WAL001" })
    expect(r).toMatchObject({ success: false, code: "conexion" })
    expect(r.error).toMatch(/no se enviará dos veces/i)
  })
})

describe("cuenta y sesión", () => {
  test("devuelve la cuenta cuando el banco la entrega", async () => {
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: true, account: { name: "Ana", balance: 120.5, number: "WAL009" } }))
    expect(await obtenerCuenta()).toEqual({ estado: "ok", cuenta: { name: "Ana", balance: 120.5, number: "WAL009" } })
  })

  test("token vencido = sesión (hay que volver a entrar)", async () => {
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: false, error: "Unauthorized" }))
    expect(await obtenerCuenta()).toEqual({ estado: "sesion" })
  })

  test("sin cookie = sesión", async () => {
    cookiesSimuladas.clear()
    expect(await obtenerCuenta()).toEqual({ estado: "sesion" })
  })

  test("una falla de red NO cierra la sesión: es conexión", async () => {
    fetchSimulado.mockRejectedValue(new Error("red caída"))
    expect(await obtenerCuenta()).toEqual({ estado: "conexion" })
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: false, error: "Error interno" }))
    expect(await obtenerCuenta()).toEqual({ estado: "conexion" })
  })

  test("el login guarda las cookies con la duración acordada y la base configurada", async () => {
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: true, token: "jwt-nuevo", wallet: { has_pin: true } }))
    cookiesSimuladas.clear()
    const r = await login("ana@example.com", "clave")
    expect(r).toEqual({ success: true, hasPin: true })
    expect(cuerpoEnviado()).toMatchObject({ username: "ana@example.com", db: "base_de_prueba" })
    expect(cookiesSimuladas.get("wallet_token")).toBe("jwt-nuevo")
  })

  test("un login rechazado no deja cookies", async () => {
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: false, error: "Usuario o contraseña incorrectos." }))
    cookiesSimuladas.clear()
    const r = await login("ana@example.com", "mala")
    expect(r).toMatchObject({ success: false, error: "Usuario o contraseña incorrectos." })
    expect(cookiesSimuladas.size).toBe(0)
  })
})

describe("clave (PIN) y depósito", () => {
  test("el formato del PIN se valida antes de llamar al banco", async () => {
    for (const pin of ["", "123", "1234567", "12a4", "١٢٣٤"]) {
      expect((await verificarPin(pin)).code).toBe("pin_formato")
    }
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  test("crear PIN exige la contraseña y no la envía si falta", async () => {
    expect((await crearPin("", "4826")).success).toBe(false)
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  test("PIN incorrecto informa los intentos restantes", async () => {
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: false, code: "pin_invalido", error: "x", intentos_restantes: 1 }))
    expect(await verificarPin("4826")).toMatchObject({ success: false, code: "pin_invalido", intentosRestantes: 1 })
  })

  test("depósito: valida plataforma, monto (2 decimales), clave y llave antes de llamar", async () => {
    const ok = { platform: "inversiones", amount: 50, pin: "4826", llave: LLAVE }
    for (const mala of [
      { ...ok, platform: "Inversiones!" }, { ...ok, amount: 0 }, { ...ok, amount: -5 }, { ...ok, amount: 10.999 },
      { ...ok, amount: Number.NaN }, { ...ok, pin: "12" }, { ...ok, llave: "corta" },
    ]) {
      expect((await depositarEnPlataforma(mala)).success).toBe(false)
    }
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  test("depósito válido envía el monto en soles exactos y la llave", async () => {
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: true, balance: 950 }))
    const r = await depositarEnPlataforma({ platform: "inversiones", amount: 50.1, pin: "4826", llave: LLAVE })
    expect(r).toEqual({ success: true, saldo: 950, repetido: false })
    expect(cuerpoEnviado()).toMatchObject({ platform: "inversiones", amount: 50.1, idempotency_key: LLAVE })
  })
})

describe("buscar a quién enviar (un solo cuadro) y recientes", () => {
  test("manda siempre «auto»: el banco decide si es celular, nombre o cuenta", async () => {
    const { buscarDestinatarios } = await import("@/lib/actions/transfer")
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: true, users: [{ name: "Beto C. R. S.", phone: "*** *** 333", account_number: "WAL00000002", masked: true }] }))
    const r = await buscarDestinatarios("  941 222 333 ")
    expect(cuerpoEnviado()).toEqual({ query: "941 222 333", search_type: "auto" })
    expect(r.contactos).toHaveLength(1)
    expect(r.contactos[0]).toMatchObject({ name: "Beto C. R. S.", initials: "BC" })
    expect(r.aviso).toBeUndefined()
  })

  test("con menos de 3 caracteres ni se pregunta al banco", async () => {
    const { buscarDestinatarios } = await import("@/lib/actions/transfer")
    expect(await buscarDestinatarios("be")).toEqual({ contactos: [] })
    expect(await buscarDestinatarios("   ")).toEqual({ contactos: [] })
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  test("celular incompleto trae el aviso en palabras de persona; la red caída también avisa", async () => {
    const { buscarDestinatarios } = await import("@/lib/actions/transfer")
    fetchSimulado.mockResolvedValueOnce(respuestaOdoo({ success: false, code: "telefono_incompleto", error: "x" }))
    expect(await buscarDestinatarios("941222")).toEqual({ contactos: [], aviso: "Escribe el número de celular completo (9 dígitos)." })
    fetchSimulado.mockRejectedValueOnce(new Error("caída"))
    expect((await buscarDestinatarios("Beto")).aviso).toMatch(/conexión/i)
  })

  test("sin sesión no se busca", async () => {
    const { buscarDestinatarios, contactosRecientes } = await import("@/lib/actions/transfer")
    cookiesSimuladas.clear()
    expect(await buscarDestinatarios("Beto")).toEqual({ contactos: [] })
    expect(await contactosRecientes()).toEqual([])
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  test("recientes: se piden con el token (la cuenta sale de la sesión) y se vuelven a la lista vacía si falla", async () => {
    const { contactosRecientes } = await import("@/lib/actions/transfer")
    fetchSimulado.mockResolvedValueOnce(respuestaOdoo({ success: true, contacts: [{ name: "Carla M. R.", phone: "*** *** 222", account_number: "WAL00000003", last_at: "2026-09-27T10:00:00Z" }] }))
    const r = await contactosRecientes()
    expect(r[0]).toMatchObject({ account_number: "WAL00000003", initials: "CM" })
    expect(cuerpoEnviado()).toEqual({})
    expect(fetchSimulado.mock.calls[0][1].headers.Authorization).toBe("Bearer token-de-prueba")
    fetchSimulado.mockResolvedValueOnce(respuestaOdoo({ success: false }))
    expect(await contactosRecientes()).toEqual([])
    fetchSimulado.mockRejectedValueOnce(new Error("x"))
    expect(await contactosRecientes()).toEqual([])
  })
})
