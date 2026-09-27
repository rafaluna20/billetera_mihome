import { MarcoApp } from "@/components/MarcoApp"
import { EscanearComercio } from "@/components/comercios/EscanearComercio"
import { PagarComercio } from "@/components/comercios/PagarComercio"

export const metadata = { title: "Pagar · MiHome Wallet" }

/** Sin QR: abre la cámara. Con un QR de comercio (?qr=...): pantalla de pago. */
export default async function PagarPage({ searchParams }: { searchParams: Promise<{ qr?: string | string[] }> }) {
  const { qr } = await searchParams
  const texto = typeof qr === "string" ? qr : ""
  return (
    <MarcoApp titulo="Pagar" activa="servicios">
      {texto ? <PagarComercio qr={texto} /> : <EscanearComercio />}
    </MarcoApp>
  )
}
