import type { ReactNode } from "react"

// Las acciones del servidor de esta pantalla llaman al banco (Odoo): se les da más margen que los 10 s por defecto de Vercel.
export const maxDuration = 30

export default function YapearLayout({ children }: { children: ReactNode }) {
  return children
}
