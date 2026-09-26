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

import { obtenerInversiones } from "@/lib/actions/inversiones"
import {
  acotar, conSigno, filtrarContratos, formatearDinero, geometriaGrafico, tonoDe,
  type PuntoEvolucion, type ResumenContrato,
} from "@/lib/inversiones"
import { proxy } from "@/proxy"
import { NextRequest } from "next/server"

const respuestaOdoo = (result: Record<string, unknown>) =>
  new Response(JSON.stringify({ jsonrpc: "2.0", result }), { status: 200, headers: { "Content-Type": "application/json" } })
const fetchSimulado = vi.fn()

beforeEach(() => {
  cookiesSimuladas.clear()
  cookiesSimuladas.set("wallet_token", "token-de-prueba")
  fetchSimulado.mockReset()
  vi.stubGlobal("fetch", fetchSimulado)
  vi.stubEnv("NEXT_PUBLIC_ODOO_URL", "http://banco.test")
})

describe("obtenerInversiones", () => {
  test("le pregunta al banco SIN mandar ningún número de cuenta", async () => {
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: true, platforms: [{ code: "inversiones", name: "Akallpa", app_url: null, estado: "no_vinculado" }] }))
    const r = await obtenerInversiones()
    expect(r).toEqual({ estado: "ok", plataformas: [{ code: "inversiones", name: "Akallpa", app_url: null, estado: "no_vinculado" }] })
    const [url, opciones] = fetchSimulado.mock.calls[0]
    expect(url).toBe("http://banco.test/api/wallet/platform/positions")
    expect(JSON.parse(opciones.body).params).toEqual({})
    expect(opciones.headers.Authorization).toBe("Bearer token-de-prueba")
  })

  test("sin sesión no consulta nada", async () => {
    cookiesSimuladas.clear()
    expect(await obtenerInversiones()).toEqual({ estado: "sesion" })
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  test("token vencido = sesión (hay que volver a entrar)", async () => {
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: false, code: "no_autorizado", error: "No autorizado" }))
    expect(await obtenerInversiones()).toEqual({ estado: "sesion" })
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: false, error: "Unauthorized" }))
    expect(await obtenerInversiones()).toEqual({ estado: "sesion" })
  })

  test("una falla de red o del banco NO cierra la sesión: es conexión", async () => {
    fetchSimulado.mockRejectedValue(new Error("red caída"))
    expect(await obtenerInversiones()).toEqual({ estado: "conexion" })
    fetchSimulado.mockResolvedValue(respuestaOdoo({ success: false, code: "interno", error: "x" }))
    expect(await obtenerInversiones()).toEqual({ estado: "conexion" })
  })
})

describe("presentación", () => {
  test("formato de dinero por moneda", () => {
    expect(formatearDinero(1234.5, "PEN")).toMatch(/^S\/ 1[\s.,]?234[.,]50$/)
    expect(formatearDinero(10, "USD")).toMatch(/^US\$ 10[.,]00$/)
    expect(formatearDinero(10, "EUR")).toMatch(/^EUR 10[.,]00$/)
    expect(formatearDinero(Number.NaN, "PEN")).toMatch(/0[.,]00$/)
  })

  test("el signo se ve siempre: una pérdida nunca se confunde con una ganancia", () => {
    expect(conSigno(45, "PEN")).toMatch(/^\+S\/ 45/)
    expect(conSigno(-5, "PEN")).toMatch(/^−S\/ 5/)
    expect(conSigno(0, "PEN")).toMatch(/^S\/ 0/)
    expect(conSigno(0.001, "PEN")).toMatch(/^S\/ 0/)
  })

  test("tono según el signo, con tolerancia de centavos", () => {
    expect([tonoDe(10), tonoDe(-10), tonoDe(0), tonoDe(0.004)]).toEqual(["positivo", "negativo", "neutro", "neutro"])
  })

  test("acotar deja el porcentaje entre 0 y 100", () => {
    expect([acotar(-5), acotar(50), acotar(180), acotar(Number.NaN)]).toEqual([0, 50, 100, 0])
  })

  test("filtra los contratos por pestaña", () => {
    const c = (id: number, en_curso: boolean) => ({ proyecto_id: id, en_curso }) as ResumenContrato
    const todos = [c(1, true), c(2, false), c(3, true)]
    expect(filtrarContratos(todos, "en_curso").map((x) => x.proyecto_id)).toEqual([1, 3])
    expect(filtrarContratos(todos, "finalizados").map((x) => x.proyecto_id)).toEqual([2])
    expect(filtrarContratos(todos, "todos")).toHaveLength(3)
  })
})

describe("gráfico de evolución", () => {
  const punto = (fecha: string, patrimonio: number, puesto: number): PuntoEvolucion => ({ fecha, patrimonio, puesto })

  test("con menos de dos meses no hay evolución", () => {
    expect(geometriaGrafico([])).toBeNull()
    expect(geometriaGrafico([punto("2026-09-26", 100, 100)])).toBeNull()
  })

  test("un valor más alto se dibuja más arriba y todo queda dentro del área", () => {
    const g = geometriaGrafico([punto("2026-08-31", 1000, 1000), punto("2026-09-26", 2000, 1000)])!
    const ys = g.patrimonio.split(" ").map((p) => Number(p.split(",")[1]))
    expect(ys[1]).toBeLessThan(ys[0])
    for (const y of ys) {
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(g.alto)
    }
  })

  test("todo igual no divide entre cero", () => {
    const g = geometriaGrafico([punto("2026-08-31", 500, 500), punto("2026-09-26", 500, 500)])!
    expect(g.patrimonio).not.toMatch(/NaN|Infinity/)
    expect(g.ultimo.y).toBe(g.alto / 2)
  })
})

describe("proxy", () => {
  test("/inversiones exige sesión", () => {
    const sin = proxy(new NextRequest("http://localhost/inversiones"))
    expect(sin.status).toBe(307)
    const con = proxy(new NextRequest("http://localhost/inversiones", { headers: { cookie: "wallet_token=abc" } }))
    expect(con.headers.get("location")).toBeNull()
  })
})
