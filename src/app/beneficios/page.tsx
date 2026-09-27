import { Gift } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

import { MarcoApp } from "@/components/MarcoApp"
import { estadoMensual, resumenBeneficios } from "@/lib/actions/comercios"
import { ETIQUETA_BONO, esMes, fechaHoraLima, mesActualLima, mesDesplazado, nombreDeMes } from "@/lib/comercios"
import { formatearDinero } from "@/lib/inversiones"

export const metadata = { title: "Mis beneficios · MiHome Wallet" }
const soles = (n: number) => formatearDinero(n, "PEN")

/** Bonos que la empresa le dio a la persona: saldo por empresa, cada bono con su motivo y lo que ya gastó. */
export default async function BeneficiosPage({ searchParams }: { searchParams: Promise<{ mes?: string | string[] }> }) {
  const { mes: mesPedido } = await searchParams
  const actual = mesActualLima()
  const mes = esMes(mesPedido) && mesPedido <= actual ? mesPedido : actual
  const [r, estado] = await Promise.all([resumenBeneficios(), estadoMensual(mes)])
  if (r.estado === "sesion") redirect("/salir")

  return (
    <MarcoApp titulo="Mis beneficios" activa="servicios">
      <div className="flex-1 overflow-y-auto rounded-t-[2rem] bg-white px-5 pb-28 pt-6">
        {r.estado === "conexion" ? (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-center text-[13px] text-amber-700">No pudimos cargar tus beneficios. Inténtalo de nuevo.</p>
        ) : (
          <>
            <div className="rounded-3xl bg-gradient-to-br from-[#681984] to-[#9b2dba] p-5 text-white shadow">
              <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide opacity-80"><Gift size={16} aria-hidden /> Beneficio disponible</p>
              <p className="mt-1 text-[34px] font-bold">{soles(r.resumen.saldo)}</p>
              <p className="text-[12px] opacity-80">Se usa solo en bodega y restaurante, y se gasta antes que tu saldo.</p>
              {r.resumen.porEmisor.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-white/20 pt-3 text-[13px]">
                  {r.resumen.porEmisor.map((e) => <li key={e.issuer} className="flex justify-between"><span>{e.issuer}</span><b>{soles(e.amount)}</b></li>)}
                </ul>
              )}
            </div>
            <Link href="/pagar" className="mt-4 block rounded-2xl bg-[#00b5ad] py-3 text-center text-[15px] font-bold text-white">Pagar con QR</Link>

            <h2 className="mb-2 mt-6 text-[15px] font-bold text-[#4a1862]">Bonos recibidos</h2>
            {r.resumen.bonos.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-200 py-5 text-center text-[13px] text-gray-400">Aún no tienes bonos.</p>
            ) : (
              <ul className="space-y-2">
                {r.resumen.bonos.map((b) => (
                  <li key={b.id} className="rounded-2xl border border-gray-100 p-3">
                    <div className="flex justify-between gap-2">
                      <p className="text-[14px] font-bold text-gray-900">{b.reason}</p>
                      <p className="shrink-0 text-[14px] font-bold text-[#4a1862]">{soles(b.amount)}</p>
                    </div>
                    <p className="text-[11px] text-gray-400">{b.issuer} · {fechaHoraLima(b.at)} · {ETIQUETA_BONO[b.state] ?? b.state}{b.state === "active" ? ` · te quedan ${soles(b.remaining)}` : ""}</p>
                  </li>
                ))}
              </ul>
            )}

            <h2 className="mb-2 mt-6 text-[15px] font-bold text-[#4a1862]">Estado de cuenta</h2>
            <div className="mb-2 flex items-center justify-between rounded-2xl bg-gray-50 px-3 py-2 text-[13px] font-bold text-gray-700">
              <Link href={`/beneficios?mes=${mesDesplazado(mes, -1)}`} aria-label="Mes anterior" className="px-2 text-[#681984]">‹</Link>
              <span className="capitalize">{nombreDeMes(mes)}</span>
              {mes < actual ? (
                <Link href={`/beneficios?mes=${mesDesplazado(mes, 1)}`} aria-label="Mes siguiente" className="px-2 text-[#681984]">›</Link>
              ) : (
                <span aria-hidden className="px-2 text-gray-300">›</span>
              )}
            </div>
            {estado.estado === "ok" ? (
              <div className="rounded-2xl border border-gray-100 p-3 text-[13px] text-gray-700">
                <p className="flex justify-between"><span>Recibido</span><b>{soles(estado.datos.otorgado)}</b></p>
                <p className="flex justify-between"><span>Gastado</span><b>{soles(estado.datos.gastado)}</b></p>
                {estado.datos.devuelto > 0 && <p className="flex justify-between text-gray-500"><span>Devuelto</span><span>{soles(estado.datos.devuelto)}</span></p>}
                {estado.datos.gastos.length === 0 && estado.datos.bonos.length === 0 && <p className="pt-1 text-[12px] text-gray-400">Sin movimientos este mes.</p>}
              </div>
            ) : (
              <p className="rounded-2xl bg-amber-50 px-3 py-2 text-[12px] text-amber-700">No pudimos cargar este mes.</p>
            )}

            {r.resumen.gastos.length > 0 && (
              <>
                <h2 className="mb-2 mt-6 text-[15px] font-bold text-[#4a1862]">Lo que has gastado</h2>
                <ul className="space-y-2">
                  {r.resumen.gastos.map((g) => (
                    <li key={g.number} className="flex justify-between rounded-2xl border border-gray-100 p-3 text-[13px]">
                      <span><b className="text-gray-900">{g.merchant}</b><br /><span className="text-[11px] text-gray-400">{fechaHoraLima(g.at)}{g.state === "refunded" ? " · devuelto" : ""}</span></span>
                      <span className="text-right text-gray-700">−{soles(g.benefit)}<br /><span className="text-[11px] text-gray-400">de {soles(g.total)}</span></span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </MarcoApp>
  )
}
