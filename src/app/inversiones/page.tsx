import { ArrowDownLeft, ExternalLink, Plus } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

import { ContratosTabs } from "@/components/inversiones/ContratosTabs"
import { GraficoEvolucion } from "@/components/inversiones/GraficoEvolucion"
import { MarcoApp } from "@/components/MarcoApp"
import { obtenerInversiones } from "@/lib/actions/inversiones"
import { conSigno, formatearDinero, tonoDe, type PlataformaInversion, type ResumenInversiones } from "@/lib/inversiones"

export const metadata = { title: "Inversiones · MiHome Wallet" }

function Marco({ children }: { children: React.ReactNode }) {
  return <MarcoApp titulo="Patrimonio" activa="inversiones">{children}</MarcoApp>
}

function Tarjeta({ etiqueta, valor, clase }: { etiqueta: string; valor: string; clase?: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{etiqueta}</p>
      <p className={`mt-1 text-[17px] font-bold ${clase ?? "text-[#4a1862]"}`}>{valor}</p>
    </div>
  )
}

function Resumen({ p, r }: { p: PlataformaInversion; r: ResumenInversiones }) {
  const dinero = (n: number) => formatearDinero(n, r.moneda)
  const tonoMes = tonoDe(r.utilidad_mes)
  return (
    <>
      <div className="relative z-10 px-6 pt-2 text-center">
        <p className="text-[12px] text-white/70">Total activo + saldo libre en {p.name}</p>
        <p className="mt-1 text-[40px] font-bold leading-tight text-white" aria-label={`Patrimonio ${dinero(r.patrimonio)}`}>{dinero(r.patrimonio)}</p>
        <p className={`mx-auto mt-2 inline-block rounded-full border px-4 py-1.5 text-[12px] font-semibold ${tonoMes === "positivo" ? "border-[#00e5d8]/40 bg-[#00e5d8]/10 text-[#00e5d8]" : "border-white/15 bg-white/10 text-white/80"}`}>
          {tonoMes === "positivo" ? `${conSigno(r.utilidad_mes, r.moneda)} de utilidad este mes` : "Sin utilidad recibida este mes"}
        </p>
      </div>
      <div className="relative z-10 mt-2"><GraficoEvolucion puntos={r.evolucion} /></div>

      <div className="relative z-20 mt-2 flex-1 overflow-y-auto rounded-t-[2rem] bg-white px-5 pb-32 pt-4 shadow-[0_-12px_40px_rgba(0,0,0,0.15)]">
        <div className="mb-4 flex justify-center"><div className="h-1 w-10 rounded-full bg-gray-200" /></div>
        <div className="mb-5 grid grid-cols-2 gap-3">
          <Link href="/depositar" className="flex h-[48px] items-center justify-center gap-2 rounded-2xl border border-[#d7f0ee] bg-[#f0fbfa] text-[13px] font-bold text-[#00877f]">
            <ArrowDownLeft size={16} aria-hidden /> Depositar
          </Link>
          {p.app_url ? (
            <a href={p.app_url} target="_blank" rel="noopener noreferrer" className="flex h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#681984] text-[13px] font-bold text-white shadow-lg">
              <Plus size={16} aria-hidden /> Nueva Inversión
            </a>
          ) : <div />}
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <Tarjeta etiqueta="Capital en curso" valor={dinero(r.capital_en_curso)} />
          <Tarjeta etiqueta="Saldo plataforma" valor={dinero(r.saldo_libre)} clase="text-[#00877f]" />
          <Tarjeta etiqueta="Utilidad recibida" valor={conSigno(r.utilidad_recibida, r.moneda)} clase={tonoDe(r.utilidad_recibida) === "negativo" ? "text-red-500" : "text-emerald-600"} />
          <Tarjeta etiqueta="Proyectos activos" valor={`${r.proyectos_activos} · Histórico: ${r.proyectos_historicos}`} />
        </div>

        <ContratosTabs contratos={r.contratos} moneda={r.moneda} />

        <p className="mt-6 text-[10px] leading-relaxed text-gray-400">
          Cifras a costo: el capital invertido vale lo que aportaste. La utilidad cuenta cuando se liquida el proyecto y se te paga; puede ser positiva o negativa.
        </p>
        {p.app_url && (
          <a href={p.app_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-[#681984]">
            Ver detalle en {p.name} <ExternalLink size={12} aria-hidden />
          </a>
        )}
      </div>
    </>
  )
}

function Aviso({ titulo, texto, p }: { titulo: string; texto: string; p?: PlataformaInversion }) {
  return (
    <div className="relative z-20 mt-6 flex-1 rounded-t-[2rem] bg-white px-6 pb-32 pt-10 text-center shadow-[0_-12px_40px_rgba(0,0,0,0.15)]">
      <p className="text-[16px] font-bold text-[#4a1862]">{titulo}</p>
      <p className="mx-auto mt-2 max-w-[260px] text-[13px] text-gray-500">{texto}</p>
      {p?.app_url && (
        <a href={p.app_url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-1 text-[13px] font-semibold text-[#681984]">
          Ir a {p.name} <ExternalLink size={13} aria-hidden />
        </a>
      )}
    </div>
  )
}

export default async function InversionesPage() {
  const r = await obtenerInversiones()
  if (r.estado === "sesion") redirect("/salir")
  if (r.estado === "conexion") {
    return (
      <Marco>
        <Aviso titulo="No pudimos cargar tus inversiones" texto="Revisa tu conexión e inténtalo de nuevo. Tu sesión sigue abierta." />
      </Marco>
    )
  }
  if (r.plataformas.length === 0) {
    return (
      <Marco>
        <Aviso titulo="Aún no tienes inversiones" texto="Cuando participes en un proyecto de una plataforma conectada, lo verás aquí." />
      </Marco>
    )
  }

  // Una plataforma por pantalla (hoy solo hay una): si hubiera varias, se muestra la primera disponible.
  const p = r.plataformas.find((x) => x.estado === "ok") ?? r.plataformas[0]
  return (
    <Marco>
      {p.estado === "ok" ? (
        <Resumen p={p} r={p.resumen} />
      ) : p.estado === "no_vinculado" ? (
        <Aviso titulo={`Vincula tu cuenta con ${p.name}`} texto={`Tu billetera todavía no está vinculada a tu usuario en ${p.name}. Pídele a Akallpa que la vincule para ver tus inversiones aquí.`} p={p} />
      ) : (
        <Aviso titulo={`${p.name} no responde`} texto="No pudimos leer tus inversiones en este momento. Inténtalo de nuevo en unos minutos." p={p} />
      )}
    </Marco>
  )
}
