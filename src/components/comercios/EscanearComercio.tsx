"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import QRScanner from "@/components/QRScanner"
import { esQrComercio } from "@/lib/comercios"

/** Cámara para escanear el QR de un comercio; al leerlo, sigue a la pantalla de pago. */
export function EscanearComercio() {
  const router = useRouter()
  const [aviso, setAviso] = useState("")

  return (
    <div className="flex-1 overflow-y-auto rounded-t-[2rem] bg-white px-6 pb-28 pt-8">
      <p className="mb-4 text-center text-[14px] text-gray-500">Apunta la cámara al QR del comercio.</p>
      <QRScanner
        onScan={(texto) => {
          if (esQrComercio(texto)) router.push(`/pagar?qr=${encodeURIComponent(texto)}`)
          else setAviso("Ese QR no es de un comercio de la billetera.")
        }}
      />
      {aviso && <p role="alert" className="mt-4 text-center text-[13px] text-red-500">{aviso}</p>}
    </div>
  )
}
