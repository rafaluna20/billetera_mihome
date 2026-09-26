import { ExternalLink, Droplets, TrendingUp, UserCheck } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

import { MarcoApp } from "@/components/MarcoApp"
import { RecibosPorPagar } from "@/components/servicios/RecibosPorPagar"
import { obtenerRecibos } from "@/lib/actions/servicios"
import type { PlataformaCobros } from "@/lib/servicios"

export const metadata = { title: "Servicios · MiHome Wallet" }

/** Fecha de hoy en Lima (YYYY-MM-DD): el vencimiento de un recibo es un día, no un instante en UTC. */
function hoyEnLima(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" })
}

function Tarjeta({ titulo, detalle, insignia, children, href, externo }: {
  titulo: string; detalle: string; insignia?: number; children: React.ReactNode; href: string; externo?: boolean
}) {
  const clase = "relative flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-center active:scale-[0.98] transition-transform"
  const contenido = (
    <>
      {insignia ? <span className="absolute right-3 top-3 min-w-[20px] rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white" aria-label={`${insignia} pendientes`}>{insignia}</span> : null}
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#681984]/10 text-[#681984]">{children}</div>
      <p className="text-[13px] font-bold text-gray-900">{titulo}</p>
      <p className="text-[11px] text-gray-400">{detalle}</p>
    </>
  )
  return externo ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={clase}>{contenido}</a>
  ) : (
    <Link href={href} className={clase}>{contenido}</Link>
  )
}

export default async function ServiciosPage() {
  const r = await obtenerRecibos()
  if (r.estado === "sesion") redirect("/salir")

  const plataformas: PlataformaCobros[] = r.estado === "ok" ? r.plataformas : []
  const pendientes = plataformas.reduce((n, p) => n + (p.estado === "ok" ? p.charges.length : 0), 0)
  // Enlace a la app de asistencia: configurable por el servidor (si no está definido, la tarjeta no se muestra).
  const asistenciaUrl = process.env.ASISTENCIA_URL?.trim()

  return (
    <MarcoApp titulo="Servicios" activa="servicios">
      <div className="relative z-20 mt-4 flex-1 overflow-y-auto rounded-t-[2rem] bg-white px-5 pb-32 pt-4 shadow-[0_-12px_40px_rgba(0,0,0,0.15)]">
        <div className="mb-4 flex justify-center"><div className="h-1 w-10 rounded-full bg-gray-200" /></div>

        <section aria-label="Mis servicios" className="mb-6 grid grid-cols-2 gap-3">
          <Tarjeta titulo="Luz y agua" detalle={pendientes ? `${pendientes} por pagar` : "Tus recibos"} insignia={pendientes} href="#recibos">
            <Droplets size={22} aria-hidden />
          </Tarjeta>
          <Tarjeta titulo="Inversiones" detalle="Tu patrimonio" href="/inversiones">
            <TrendingUp size={22} aria-hidden />
          </Tarjeta>
          {asistenciaUrl && (
            <Tarjeta titulo="Asistencia" detalle="Marcar con QR" href={asistenciaUrl} externo>
              <UserCheck size={22} aria-hidden />
            </Tarjeta>
          )}
        </section>

        {r.estado === "conexion" ? (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-center text-[13px] text-amber-700">
            No pudimos cargar tus recibos. Revisa tu conexión e inténtalo de nuevo.
          </p>
        ) : (
          <RecibosPorPagar plataformas={plataformas} hoy={hoyEnLima()} />
        )}

        {plataformas.some((p) => p.app_url) && (
          <p className="mt-6 text-[11px] text-gray-400">
            <ExternalLink size={11} className="mr-1 inline" aria-hidden />
            Los recibos los emite cada servicio; aquí solo los pagas.
          </p>
        )}
      </div>
    </MarcoApp>
  )
}
