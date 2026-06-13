"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

interface BalanceCardProps {
  balance: number
  accountNumber: string
}

export default function BalanceCard({ balance, accountNumber }: BalanceCardProps) {
  const [hidden, setHidden] = useState(false)

  const formattedBalance = balance?.toLocaleString("es-PE", { minimumFractionDigits: 2 }) || "0.00"

  return (
    <div className="relative z-10 mx-5 mt-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
      {/* Top row */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-white/60 text-[11px] uppercase tracking-widest font-medium">Saldo disponible</p>
        <div className="flex items-center gap-2">
          {/* Hide/Show toggle */}
          <button
            onClick={() => setHidden(!hidden)}
            className="flex items-center gap-1 text-white/60 hover:text-white transition-colors"
            aria-label={hidden ? "Mostrar saldo" : "Ocultar saldo"}
          >
            {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          {/* Active badge */}
          <div className="flex items-center gap-1.5 bg-[#00b5ad]/20 border border-[#00b5ad]/30 px-2.5 py-1 rounded-full">
            <div className="w-1.5 h-1.5 bg-[#00b5ad] rounded-full animate-pulse" />
            <span className="text-[#00e8df] text-[10px] font-semibold">Activa</span>
          </div>
        </div>
      </div>

      {/* Balance amount */}
      <div className="flex items-baseline gap-1.5 mt-1 min-h-[44px]">
        {hidden ? (
          <div className="flex items-center gap-1.5">
            <span className="text-white/70 text-lg font-semibold">S/</span>
            <span className="text-white text-[36px] font-bold tracking-tight leading-none select-none">
              •••••
            </span>
          </div>
        ) : (
          <>
            <span className="text-white/70 text-lg font-semibold">S/</span>
            <span className="text-white text-[36px] font-bold tracking-tight leading-none">
              {formattedBalance}
            </span>
          </>
        )}
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between mt-3">
        <p className="text-white/50 text-[11px]">N° {accountNumber || "WAL-XXXX"}</p>
        <button className="flex items-center gap-1 text-[#00e8df] text-[12px] font-medium">
          Ver detalle
        </button>
      </div>
    </div>
  )
}
