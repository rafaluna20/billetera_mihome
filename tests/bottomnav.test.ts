import { readFileSync } from "node:fs"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { BottomNav } from "@/components/BottomNav"

const leer = (ruta: string) => readFileSync(new URL(`../src/${ruta}`, import.meta.url), "utf8")

describe("barra inferior", () => {
  test("queda por encima de las hojas de contenido (z-20) en todas las pantallas que la usan", () => {
    const html = renderToStaticMarkup(createElement(BottomNav, { activa: "servicios" }))
    const zNav = Number(/\bz-(\d+)\b/.exec(html)?.[1])
    expect(zNav).toBeGreaterThan(20)     // antes no tenía z-index y las hojas la tapaban: solo se veía en Inicio
    expect(zNav).toBeLessThan(50)        // las ventanas de confirmación de pago (z-50) sí deben cubrirla
  })

  test("lleva a las cuatro secciones y marca la actual", () => {
    const html = renderToStaticMarkup(createElement(BottomNav, { activa: "inversiones" }))
    for (const destino of ["/home", "/servicios", "/inversiones", "/perfil"]) expect(html).toContain(`href="${destino}"`)
    expect(html.match(/aria-current="page"/g)).toHaveLength(1)
    expect(html).toMatch(/Inversiones/)
  })

  test("las pantallas principales usan el marco con la barra; los flujos de dinero no", () => {
    for (const pantalla of ["app/servicios/page.tsx", "app/inversiones/page.tsx", "app/beneficios/page.tsx", "app/comercio/page.tsx", "app/recibir/page.tsx", "app/pagar/page.tsx", "app/perfil/page.tsx"]) {
      expect(leer(pantalla), pantalla).toContain("MarcoApp")
    }
    expect(leer("app/home/page.tsx")).toContain("BottomNav")
    // Yapear y Depositar son flujos de dinero con teclado propio: no llevan la barra (evita abandonar un pago a medias).
    for (const flujo of ["app/yapear/page.tsx", "app/depositar/page.tsx"]) expect(leer(flujo), flujo).not.toContain("BottomNav")
  })
})
