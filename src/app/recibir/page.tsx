import Link from "next/link"
import { redirect } from "next/navigation"

import { MarcoApp } from "@/components/MarcoApp"
import UserQR from "@/components/UserQR"
import { obtenerCuenta } from "@/lib/actions/wallet"

export const metadata = { title: "Mi QR · MiHome Wallet" }

/** El QR personal: quien lo escanea desde «Yapear» te puede enviar dinero. Solo lleva tu número de cuenta y tu nombre. */
export default async function RecibirPage() {
  const r = await obtenerCuenta()
  if (r.estado === "sesion") redirect("/salir")

  return (
    <MarcoApp titulo="Mi QR" activa="inicio">
      <div className="flex-1 overflow-y-auto rounded-t-[2rem] bg-white px-6 pb-28 pt-8 text-center">
        {r.estado === "conexion" || !r.cuenta.number ? (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-[13px] text-amber-700">No pudimos cargar tu cuenta. Inténtalo de nuevo.</p>
        ) : (
          <>
            <p className="text-[14px] text-gray-500">Muestra este código para que te envíen dinero.</p>
            <div className="mt-5 flex justify-center">
              <UserQR accountNumber={r.cuenta.number} userName={r.cuenta.name || ""} />
            </div>
            <p className="mt-5 text-[18px] font-bold text-[#4a1862]">{r.cuenta.name}</p>
            <p className="mt-1 text-[13px] text-gray-500">Cuenta {r.cuenta.number}</p>
            <p className="mx-auto mt-4 max-w-[280px] text-[12px] text-gray-400">
              La otra persona lo escanea en <b>Yapear</b>, escribe el monto y confirma con su clave.
            </p>
            <Link href="/yapear" className="mt-6 inline-block rounded-2xl bg-[#681984] px-6 py-3 text-[14px] font-bold text-white">Ir a Yapear</Link>
          </>
        )}
      </div>
    </MarcoApp>
  )
}
