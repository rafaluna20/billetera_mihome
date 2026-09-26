"use client"

import { useState } from "react"

import {
  acotar, conSigno, ETIQUETA_ESTADO, filtrarContratos, FILTROS, formatearDinero, tonoDe,
  type FiltroContratos, type ResumenContrato,
} from "@/lib/inversiones"

const COLOR = { positivo: "text-emerald-600", negativo: "text-red-500", neutro: "text-gray-700" } as const

function Dato({ etiqueta, valor, clase }: { etiqueta: string; valor: string; clase?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{etiqueta}</p>
      <p className={`mt-0.5 text-[13px] font-bold ${clase ?? "text-[#4a1862]"}`}>{valor}</p>
    </div>
  )
}

function ContratoCard({ c, moneda }: { c: ResumenContrato; moneda: string }) {
  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-start justify-between gap-2">
        <h4 className="text-[14px] font-bold leading-snug text-gray-900">{c.nombre}</h4>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${c.en_curso ? "bg-[#e6f7f6] text-[#00877f]" : "bg-gray-100 text-gray-500"}`}>
          {ETIQUETA_ESTADO[c.estado] ?? c.estado}
        </span>
      </header>
      <div className="grid grid-cols-3 gap-3">
        {c.en_curso ? <Dato etiqueta="Capital" valor={formatearDinero(c.capital, moneda)} /> : <Dato etiqueta="Aportado" valor={formatearDinero(c.aportado, moneda)} />}
        <Dato etiqueta="Utilidad recibida" valor={conSigno(c.utilidad_recibida, moneda)} clase={COLOR[tonoDe(c.utilidad_recibida)]} />
        {c.en_curso ? (
          <Dato etiqueta="Avance de obra" valor={`${Math.round(acotar(c.avance_pct))}%`} />
        ) : (
          <Dato etiqueta="Resultado" valor={conSigno(c.resultado, moneda)} clase={COLOR[tonoDe(c.resultado)]} />
        )}
      </div>
      {c.en_curso && c.estado !== "captando" && (
        <div role="progressbar" aria-label={`Avance de obra de ${c.nombre}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(acotar(c.avance_pct))} className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-[#681984]" style={{ width: `${acotar(c.avance_pct)}%` }} />
        </div>
      )}
    </article>
  )
}

/** «Mis contratos» con las pestañas En Curso / Finalizados / Todos. */
export function ContratosTabs({ contratos, moneda }: { contratos: ResumenContrato[]; moneda: string }) {
  const [filtro, setFiltro] = useState<FiltroContratos>("en_curso")
  const visibles = filtrarContratos(contratos, filtro)
  return (
    <section aria-labelledby="mis-contratos">
      <h3 id="mis-contratos" className="mb-3 text-[16px] font-bold text-[#4a1862]">Mis Contratos</h3>
      <div role="tablist" aria-label="Filtrar contratos" className="mb-4 flex rounded-2xl bg-gray-100 p-1">
        {FILTROS.map((f) => (
          <button
            key={f.id} role="tab" type="button" aria-selected={filtro === f.id} onClick={() => setFiltro(f.id)}
            className={`flex-1 rounded-xl py-2 text-[12px] font-bold transition ${filtro === f.id ? "bg-white text-[#4a1862] shadow" : "text-gray-400"}`}
          >
            {f.etiqueta}
          </button>
        ))}
      </div>
      {visibles.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 py-8 text-center text-[13px] text-gray-400">
          {filtro === "finalizados" ? "Todavía no tienes contratos finalizados" : filtro === "en_curso" ? "No tienes contratos en curso" : "Todavía no participas en ningún proyecto"}
        </p>
      ) : (
        <div className="space-y-3">{visibles.map((c) => <ContratoCard key={c.proyecto_id} c={c} moneda={moneda} />)}</div>
      )}
    </section>
  )
}
