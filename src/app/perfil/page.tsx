import { BadgeCheck, Gift, LifeBuoy, QrCode, ShieldAlert, Store } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

import { LogoutButton } from "@/components/LogoutButton"
import { MarcoApp } from "@/components/MarcoApp"
import { AjustesSeguridad } from "@/components/perfil/AjustesSeguridad"
import { CopiarCuenta } from "@/components/perfil/CopiarCuenta"
import { misComercios } from "@/lib/actions/comercios"
import { actividadDeSeguridad, obtenerPerfil } from "@/lib/actions/perfil"
import { fechaHoraLima } from "@/lib/comercios"
import { formatearDinero } from "@/lib/inversiones"
import { celularLegible, inicialesDe, miembroDesdeTexto } from "@/lib/perfil"

export const metadata = { title: "Perfil · MiHome Wallet" }
const soles = (n: number) => formatearDinero(n, "PEN")

function Acceso({ href, icono, titulo }: { href: string; icono: React.ReactNode; titulo: string }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-3 text-center active:scale-[0.98]">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#681984]/10 text-[#681984]">{icono}</span>
      <span className="text-[12px] font-bold text-gray-800">{titulo}</span>
    </Link>
  )
}

/** Tu cuenta: datos, límites, accesos rápidos, seguridad (clave, contraseña, sesiones) y actividad reciente. */
export default async function PerfilPage() {
  const [r, eventos, comercios] = await Promise.all([obtenerPerfil(), actividadDeSeguridad(), misComercios()])
  if (r.estado === "sesion") redirect("/salir")

  return (
    <MarcoApp titulo="Perfil" activa="perfil">
      <div className="flex-1 overflow-y-auto rounded-t-[2rem] bg-white px-5 pb-32 pt-6">
        {r.estado === "conexion" ? (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-center text-[13px] text-amber-700">No pudimos cargar tu perfil. Revisa tu conexión e inténtalo de nuevo.</p>
        ) : (
          <>
            <div className="rounded-3xl bg-gradient-to-br from-[#681984] to-[#9b2dba] p-5 text-center text-white shadow">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-[22px] font-bold" aria-hidden>{inicialesDe(r.perfil.name)}</div>
              <p className="mt-2 text-[19px] font-bold leading-tight">{r.perfil.name}</p>
              <p className="mt-1 flex items-center justify-center gap-1 text-[12px] opacity-90">
                {r.perfil.correoVerificado ? <><BadgeCheck size={14} aria-hidden /> Correo verificado</> : <><ShieldAlert size={14} aria-hidden /> Correo sin verificar</>}
              </p>
              <div className="mt-3"><CopiarCuenta cuenta={r.perfil.cuenta} /></div>
              {r.perfil.miembroDesde && <p className="mt-2 text-[11px] opacity-70">Cliente desde {miembroDesdeTexto(r.perfil.miembroDesde)}</p>}
            </div>

            <h2 className="mb-2 mt-6 text-[15px] font-bold text-[#4a1862]">Mis datos</h2>
            <dl className="divide-y divide-gray-100 rounded-2xl border border-gray-100 text-[13px]">
              <div className="flex justify-between gap-3 p-3"><dt className="text-gray-500">Correo</dt><dd className="min-w-0 truncate font-semibold text-gray-900">{r.perfil.email}</dd></div>
              <div className="flex justify-between gap-3 p-3"><dt className="text-gray-500">Celular</dt><dd className="font-semibold text-gray-900">{r.perfil.phone ? celularLegible(r.perfil.phone) : "—"}</dd></div>
              <div className="flex justify-between gap-3 p-3"><dt className="text-gray-500">Por envío</dt><dd className="font-semibold text-gray-900">{soles(r.perfil.limitePorOperacion)}</dd></div>
              <div className="flex justify-between gap-3 p-3"><dt className="text-gray-500">Por día</dt><dd className="font-semibold text-gray-900">{soles(r.perfil.limiteDiario)}</dd></div>
            </dl>
            <p className="mt-1 text-[11px] text-gray-400">Para cambiar tu celular o tu correo, escribe a soporte: son los datos con los que te encuentran.</p>

            <div className={`mt-5 grid gap-3 ${comercios.length > 0 ? "grid-cols-3" : "grid-cols-2"}`}>
              <Acceso href="/recibir" icono={<QrCode size={18} aria-hidden />} titulo="Mi QR" />
              <Acceso href="/beneficios" icono={<Gift size={18} aria-hidden />} titulo="Beneficios" />
              {comercios.length > 0 && <Acceso href="/comercio" icono={<Store size={18} aria-hidden />} titulo="Mi comercio" />}
            </div>

            <AjustesSeguridad correo={r.perfil.email} />

            <h2 className="mb-2 mt-6 text-[15px] font-bold text-[#4a1862]">Actividad reciente</h2>
            {eventos.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-200 py-5 text-center text-[13px] text-gray-400">Aún no hay actividad registrada.</p>
            ) : (
              <ul className="space-y-2">
                {eventos.map((e, i) => (
                  <li key={`${e.at}-${i}`} className="rounded-2xl border border-gray-100 p-3 text-[13px]">
                    <p className="font-bold text-gray-900">{e.label}</p>
                    <p className="text-[11px] text-gray-400">{fechaHoraLima(e.at)} · {e.device}{e.ip ? ` · red ${e.ip}` : ""}</p>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[11px] text-gray-400">¿Algo que no reconoces? Cambia tu contraseña y cierra las sesiones de todos los dispositivos.</p>

            <div className="mt-6 flex items-center justify-between rounded-2xl bg-gray-50 p-3 text-[13px]">
              <span className="flex items-center gap-2 text-gray-600"><LifeBuoy size={16} aria-hidden /> ¿Necesitas ayuda? Escribe a soporte</span>
              <LogoutButton />
            </div>
          </>
        )}
      </div>
    </MarcoApp>
  )
}
