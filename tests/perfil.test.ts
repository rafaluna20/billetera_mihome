import { beforeEach, describe, expect, test, vi } from "vitest"

const cookiesSimuladas = new Map<string, string>()
const opcionesGuardadas = new Map<string, Record<string, unknown>>()
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (n: string) => (cookiesSimuladas.has(n) ? { value: cookiesSimuladas.get(n) } : undefined),
    set: (n: string, v: string, o?: Record<string, unknown>) => { cookiesSimuladas.set(n, v); if (o) opcionesGuardadas.set(n, o) },
    delete: (n: string) => void cookiesSimuladas.delete(n),
  }),
}))
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }))
vi.mock("next/navigation", () => ({ redirect: () => undefined }))

import { actividadDeSeguridad, cambiarContrasena, cerrarSesionEnTodos, obtenerPerfil } from "@/lib/actions/perfil"
import { celularLegible, inicialesDe, miembroDesdeTexto, validarClaveNueva, validarContrasenaNueva } from "@/lib/perfil"

const respuestaOdoo = (result: Record<string, unknown>) =>
  new Response(JSON.stringify({ jsonrpc: "2.0", result }), { status: 200, headers: { "Content-Type": "application/json" } })
const fetchSimulado = vi.fn()
const cuerpoEnviado = () => JSON.parse(fetchSimulado.mock.calls[0][1].body as string).params

beforeEach(() => {
  cookiesSimuladas.clear()
  opcionesGuardadas.clear()
  cookiesSimuladas.set("wallet_token", "token-de-prueba")
  cookiesSimuladas.set("wallet_user_email", "ana@example.com")
  fetchSimulado.mockReset()
  vi.stubGlobal("fetch", fetchSimulado)
  vi.stubEnv("NEXT_PUBLIC_ODOO_URL", "http://banco.test")
})

describe("reglas del perfil (lógica pura)", () => {
  test("contraseña nueva", () => {
    expect(validarContrasenaNueva("", "Nueva-Clave-1", "Nueva-Clave-1")).toMatch(/actual/)
    expect(validarContrasenaNueva("vieja", "corta", "corta")).toMatch(/8 caracteres/)
    expect(validarContrasenaNueva("vieja", "x".repeat(129), "x".repeat(129))).toMatch(/larga/)
    expect(validarContrasenaNueva("igual-12345", "igual-12345", "igual-12345")).toMatch(/distinta/)
    expect(validarContrasenaNueva("vieja", "mi-ana@example.com-1", "mi-ana@example.com-1", "ana@example.com")).toMatch(/correo/)
    expect(validarContrasenaNueva("vieja-12345", "Nueva-Clave-1", "Otra-Clave-2")).toMatch(/no coinciden/)
    expect(validarContrasenaNueva("vieja-12345", "Nueva-Clave-1", "Nueva-Clave-1", "ana@example.com")).toBeNull()
  })

  test("clave de 6 dígitos: las mismas reglas del banco (nada evidente)", () => {
    expect(validarClaveNueva("", "4826", "4826")).toMatch(/actual/)
    expect(validarClaveNueva("4826", "12", "12")).toMatch(/4 a 6/)
    for (const debil of ["1111", "0000", "1234", "123456", "654321", "9876"]) expect(validarClaveNueva("4826", debil, debil), debil).toMatch(/evidente/)
    expect(validarClaveNueva("4826", "4826", "4826")).toMatch(/distinta/)
    expect(validarClaveNueva("4826", "7391", "7392")).toMatch(/no coinciden/)
    expect(validarClaveNueva("4826", "7391", "7391")).toBeNull()
    expect(validarClaveNueva("4826", "159357", "159357")).toBeNull()
  })

  test("presentación", () => {
    expect(celularLegible("+51 977123456")).toBe("+51 977 123 456")
    expect(celularLegible("977-123-456")).toBe("977 123 456")
    expect(celularLegible("12345")).toBe("12345")
    expect(inicialesDe("Ana Torres Ruiz")).toBe("AT")
    expect(inicialesDe("  ")).toBe("")
    expect(miembroDesdeTexto("2026-09-15T12:00:00Z")).toBe("septiembre de 2026")
    expect(miembroDesdeTexto("2026-10-01T03:00:00Z")).toBe("septiembre de 2026")   // en Lima aún es 30 de septiembre
    expect(miembroDesdeTexto(null)).toBe("")
    expect(miembroDesdeTexto("basura")).toBe("")
  })
})

describe("perfil", () => {
  test("pide el perfil con el token de la sesión (sin mandar ninguna cuenta) y lo traduce", async () => {
    fetchSimulado.mockResolvedValue(respuestaOdoo({
      success: true, profile: {
        name: "Ana Torres", email: "ana@example.com", phone: "+51 977123456", account_number: "WAL00000007", state: "active",
        email_verified: true, has_pin: true, member_since: "2026-09-15T12:00:00Z", daily_limit: 5000, transaction_limit: 1000 },
    }))
    const r = await obtenerPerfil()
    expect(r).toMatchObject({ estado: "ok", perfil: { name: "Ana Torres", cuenta: "WAL00000007", correoVerificado: true, tieneClave: true, limitePorOperacion: 1000 } })
    expect(cuerpoEnviado()).toEqual({})
    expect(fetchSimulado.mock.calls[0][1].headers.Authorization).toBe("Bearer token-de-prueba")
  })

  test("sesión vencida, sin token y red caída se distinguen", async () => {
    fetchSimulado.mockResolvedValueOnce(respuestaOdoo({ success: false, code: "no_autorizado" }))
    expect(await obtenerPerfil()).toEqual({ estado: "sesion" })
    fetchSimulado.mockRejectedValueOnce(new Error("caída"))
    expect(await obtenerPerfil()).toEqual({ estado: "conexion" })
    cookiesSimuladas.clear()
    expect(await obtenerPerfil()).toEqual({ estado: "sesion" })
  })

  test("actividad: lista vacía si falla", async () => {
    fetchSimulado.mockResolvedValueOnce(respuestaOdoo({ success: true, events: [{ kind: "login", label: "Inicio de sesión", at: null, device: "Chrome en Windows", ip: "190.12.*.*" }] }))
    expect(await actividadDeSeguridad()).toHaveLength(1)
    fetchSimulado.mockRejectedValueOnce(new Error("x"))
    expect(await actividadDeSeguridad()).toEqual([])
  })
})

describe("cambiar contraseña", () => {
  test("el token nuevo que entrega el banco reemplaza al viejo en la cookie (esta sesión sigue abierta)", async () => {
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: true, token: "token-nuevo" }))
    const r = await cambiarContrasena("Vieja-Clave-1", "Nueva-Clave-9", "Nueva-Clave-9", "ana@example.com")
    expect(r).toEqual({ success: true })
    expect(cuerpoEnviado()).toEqual({ current_password: "Vieja-Clave-1", new_password: "Nueva-Clave-9" })
    expect(cookiesSimuladas.get("wallet_token")).toBe("token-nuevo")
    expect(opcionesGuardadas.get("wallet_token")).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" })
  })

  test("datos inválidos no llegan al banco; contraseña actual incorrecta no toca la cookie", async () => {
    expect(await cambiarContrasena("vieja", "corta", "corta")).toMatchObject({ success: false, code: "validacion" })
    expect(fetchSimulado).not.toHaveBeenCalled()
    fetchSimulado.mockResolvedValueOnce(respuestaOdoo({ success: false, code: "password_actual_incorrecta", error: "Tu contraseña actual no es correcta." }))
    const r = await cambiarContrasena("equivocada", "Nueva-Clave-9", "Nueva-Clave-9")
    expect(r).toMatchObject({ success: false, code: "password_actual_incorrecta" })
    expect(cookiesSimuladas.get("wallet_token")).toBe("token-de-prueba")
  })

  test("si el banco no devuelve token no se dice que salió bien", async () => {
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: true }))
    expect((await cambiarContrasena("Vieja-Clave-1", "Nueva-Clave-9", "Nueva-Clave-9")).success).toBe(false)
  })

  test("sin sesión o sin red", async () => {
    fetchSimulado.mockRejectedValueOnce(new Error("x"))
    expect(await cambiarContrasena("Vieja-Clave-1", "Nueva-Clave-9", "Nueva-Clave-9")).toMatchObject({ success: false, code: "conexion" })
    cookiesSimuladas.clear()
    expect(await cambiarContrasena("Vieja-Clave-1", "Nueva-Clave-9", "Nueva-Clave-9")).toMatchObject({ success: false, code: "no_autorizado" })
  })
})

describe("cerrar sesión en todos los dispositivos", () => {
  test("con la clave correcta borra también las cookies de este dispositivo", async () => {
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: true }))
    expect(await cerrarSesionEnTodos("4826")).toEqual({ success: true })
    expect(cuerpoEnviado()).toEqual({ pin: "4826" })
    expect(cookiesSimuladas.has("wallet_token")).toBe(false)
    expect(cookiesSimuladas.has("wallet_user_email")).toBe(false)
  })

  test("clave mal formada no llega al banco; clave incorrecta trae los intentos y deja la sesión", async () => {
    for (const mala of ["", "12", "abcd", "1234567"]) expect(await cerrarSesionEnTodos(mala)).toMatchObject({ success: false, code: "pin_formato" })
    expect(fetchSimulado).not.toHaveBeenCalled()
    fetchSimulado.mockResolvedValueOnce(respuestaOdoo({ success: false, code: "pin_invalido", error: "PIN incorrecto.", intentos_restantes: 2 }))
    expect(await cerrarSesionEnTodos("0000")).toMatchObject({ success: false, code: "pin_invalido", intentosRestantes: 2 })
    expect(cookiesSimuladas.get("wallet_token")).toBe("token-de-prueba")
  })
})
