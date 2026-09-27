"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"

/** Copia el número de cuenta (para dárselo a quien te va a enviar dinero). */
export function CopiarCuenta({ cuenta }: { cuenta: string }) {
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(cuenta)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      /* sin permiso del portapapeles: el número igual se ve en pantalla */
    }
  }

  return (
    <button type="button" onClick={copiar} aria-label="Copiar número de cuenta" className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold text-white active:scale-95">
      {copiado ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
      {copiado ? "Copiado" : cuenta}
    </button>
  )
}
