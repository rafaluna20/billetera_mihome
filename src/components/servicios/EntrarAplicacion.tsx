"use client"

import { useState, useTransition } from "react"

import { abrirAplicacion } from "@/lib/actions/servicios"

/** Tarjeta que abre otra app propia con la sesión de la billetera (sin volver a escribir contraseña). */
export function EntrarAplicacion({ aplicacion, titulo, detalle, children }: {
  aplicacion: string; titulo: string; detalle: string; children: React.ReactNode
}) {
  const [pendiente, iniciar] = useTransition()
  const [aviso, setAviso] = useState<string | null>(null)

  function abrir() {
    setAviso(null)
    iniciar(async () => {
      const r = await abrirAplicacion(aplicacion)
      if (r.estado === "ok") window.location.assign(r.url)
      else if (r.estado === "sesion") window.location.assign("/salir")
      else setAviso(r.estado === "no_disponible" ? "Esta aplicación aún no está disponible." : "No pudimos abrirla. Inténtalo de nuevo.")
    })
  }

  return (
    <button
      type="button"
      onClick={abrir}
      disabled={pendiente}
      className="relative flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-center transition-transform active:scale-[0.98] disabled:opacity-60"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#681984]/10 text-[#681984]">{children}</div>
      <p className="text-[13px] font-bold text-gray-900">{titulo}</p>
      <p className="text-[11px] text-gray-400">{pendiente ? "Abriendo…" : detalle}</p>
      {aviso && <p role="alert" className="text-[11px] text-red-600">{aviso}</p>}
    </button>
  )
}
