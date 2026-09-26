import { geometriaGrafico, type PuntoEvolucion } from "@/lib/inversiones"

/** Evolución mensual del patrimonio (línea turquesa) frente a lo que la persona puso de su bolsillo (línea punteada). */
export function GraficoEvolucion({ puntos }: { puntos: PuntoEvolucion[] }) {
  const g = geometriaGrafico(puntos)
  if (!g) return null
  return (
    <figure className="px-2">
      <svg viewBox={`0 0 ${g.ancho} ${g.alto}`} role="img" aria-label="Evolución mensual de tu patrimonio" className="w-full">
        <defs>
          <linearGradient id="relleno-evolucion" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#00e5d8" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#00e5d8" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={g.area} fill="url(#relleno-evolucion)" />
        <polyline fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="4 4" strokeLinejoin="round" points={g.puesto} />
        <polyline fill="none" stroke="#00e5d8" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={g.patrimonio} />
        <circle cx={g.ultimo.x} cy={g.ultimo.y} r="5" fill="#00e5d8" stroke="#fff" strokeWidth="2" />
      </svg>
      <figcaption className="mt-1 flex justify-center gap-4 text-[10px] text-white/70">
        <span className="flex items-center gap-1.5"><span className="h-[3px] w-4 rounded bg-[#00e5d8]" aria-hidden /> Patrimonio</span>
        <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-white/60" aria-hidden /> Lo que pusiste</span>
      </figcaption>
      <table className="sr-only">
        <caption>Evolución mensual</caption>
        <thead><tr><th>Fecha</th><th>Patrimonio</th><th>Lo que pusiste</th></tr></thead>
        <tbody>{puntos.map((p) => <tr key={p.fecha}><td>{p.fecha}</td><td>{p.patrimonio}</td><td>{p.puesto}</td></tr>)}</tbody>
      </table>
    </figure>
  )
}
