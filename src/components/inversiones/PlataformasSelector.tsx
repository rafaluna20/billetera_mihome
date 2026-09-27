"use client"

import { useState } from "react"

/**
 * Elige qué plataforma se ve en detalle. Los paneles (uno por plataforma, en el MISMO orden) ya vienen renderizados
 * desde el servidor — este componente solo decide cuál mostrar, sin volver a pedir datos.
 * Con una sola plataforma no hay nada que elegir: no se muestra la barra de pestañas.
 */
export function PlataformasSelector({
  opciones,
  paneles,
  inicial = 0,
}: {
  opciones: { code: string; name: string; disponible: boolean }[]
  paneles: React.ReactNode[]
  inicial?: number
}) {
  const [indice, setIndice] = useState(Math.min(Math.max(inicial, 0), opciones.length - 1))

  return (
    <>
      {opciones.length > 1 && (
        <div className="relative z-10 mt-3 flex justify-center gap-2 px-4">
          <div className="flex max-w-full gap-2 overflow-x-auto px-1">
            {opciones.map((o, i) => (
              <button
                key={o.code}
                type="button"
                onClick={() => setIndice(i)}
                aria-pressed={i === indice}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-[12px] font-semibold transition-colors ${
                  i === indice
                    ? "border-white/30 bg-white/15 text-white"
                    : `border-white/10 text-white/50 ${o.disponible ? "" : "opacity-60"}`
                }`}
              >
                {o.name}
                {!o.disponible && " ·"}
              </button>
            ))}
          </div>
        </div>
      )}
      {paneles[indice]}
    </>
  )
}
