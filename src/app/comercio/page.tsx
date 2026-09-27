import { redirect } from "next/navigation"

import { MarcoApp } from "@/components/MarcoApp"
import { PanelComercio } from "@/components/comercios/PanelComercio"
import { misComercios } from "@/lib/actions/comercios"
import { getAuthToken } from "@/lib/actions/auth"

export const metadata = { title: "Mi comercio · MiHome Wallet" }

/** Solo para el personal de un comercio (cajero o encargado): cobros recibidos y QR para mostrar. */
export default async function ComercioPage() {
  if (!(await getAuthToken())) redirect("/salir")
  const comercios = await misComercios()
  return (
    <MarcoApp titulo="Mi comercio" activa="servicios">
      {comercios.length === 0 ? (
        <div className="flex-1 rounded-t-[2rem] bg-white px-6 pt-10 text-center text-[14px] text-gray-500">
          Tu cuenta no está asignada a ningún comercio. Pídele a un administrador que te agregue como personal.
        </div>
      ) : (
        <PanelComercio comercios={comercios} />
      )}
    </MarcoApp>
  )
}
