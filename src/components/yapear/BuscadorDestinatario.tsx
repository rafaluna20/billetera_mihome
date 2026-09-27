"use client"

import { Loader2, QrCode, Search, User, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import { buscarDestinatarios, type WalletContact } from "@/lib/actions/transfer"

const COLORES = ["bg-purple-600", "bg-indigo-600", "bg-pink-600", "bg-orange-500", "bg-teal-600", "bg-blue-600"]
const colorDe = (nombre: string) => COLORES[(nombre.charCodeAt(0) || 0) % COLORES.length]
const iniciales = (nombre: string) => nombre.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()

function Fila({ contacto, onElegir }: { contacto: WalletContact; onElegir: (c: WalletContact) => void }) {
  return (
    <button type="button" onClick={() => onElegir(contacto)} className="flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-gray-50">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${colorDe(contacto.name)}`}>
        <span className="text-[13px] font-bold text-white">{contacto.initials || iniciales(contacto.name)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold leading-tight text-gray-900">{contacto.name}</p>
        {/* Los últimos 3 dígitos del celular sirven para distinguir a dos personas con el mismo nombre. */}
        <p className="mt-0.5 truncate text-[13px] text-gray-400">{contacto.phone || "Billetera MiHome"}</p>
      </div>
    </button>
  )
}

/**
 * Un solo cuadro «Nombre o celular» (el banco decide qué es), las personas a quienes ya les enviaste dinero arriba,
 * y el atajo al QR. Lo que se ve de cada persona viene enmascarado del banco.
 */
export function BuscadorDestinatario({ recientes, onElegir, onEscanear }: {
  recientes: WalletContact[]
  onElegir: (c: WalletContact) => void
  onEscanear: () => void
}) {
  const [texto, setTexto] = useState("")
  const [resultados, setResultados] = useState<WalletContact[]>([])
  const [aviso, setAviso] = useState("")
  const [buscando, setBuscando] = useState(false)
  const consulta = texto.trim()
  const buscable = consulta.length >= 3

  useEffect(() => {
    if (!buscable) return
    let vigente = true
    const temporizador = setTimeout(async () => {
      setBuscando(true)
      const r = await buscarDestinatarios(consulta)
      if (!vigente) return // llegó tarde: ya se escribió otra cosa
      setResultados(r.contactos)
      setAviso(r.aviso ?? "")
      setBuscando(false)
    }, 350)
    return () => {
      vigente = false
      clearTimeout(temporizador)
    }
  }, [consulta, buscable])

  const lista = buscable ? resultados : []

  return (
    <>
      <div className="flex-shrink-0 px-5 pb-3 pt-2">
        <div className="flex items-center gap-3 rounded-2xl border-2 border-[#681984] bg-[#faf8fc] px-4 py-3.5">
          <Search size={20} className="text-[#681984]" aria-hidden />
          <input
            autoFocus
            type="text"
            inputMode="search"
            autoComplete="off"
            value={texto}
            onChange={(e) => { setTexto(e.target.value); setAviso("") }}
            placeholder="Nombre o celular"
            aria-label="Buscar a quién enviarle dinero"
            className="flex-1 bg-transparent text-[15px] text-gray-800 placeholder-gray-300 focus:outline-none"
          />
          {texto && (
            <button type="button" onClick={() => { setTexto(""); setResultados([]); setAviso("") }} aria-label="Borrar">
              <X size={15} className="text-gray-400" />
            </button>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button type="button" onClick={onEscanear} className="flex items-center justify-center gap-2 rounded-2xl bg-[#e8eeff] py-3 text-[13px] font-bold text-[#4f6ef7] active:scale-[0.98]">
            <QrCode size={17} aria-hidden /> Escanear QR
          </button>
          <Link href="/recibir" className="flex items-center justify-center gap-2 rounded-2xl bg-[#f3e8ff] py-3 text-[13px] font-bold text-[#681984] active:scale-[0.98]">
            <QrCode size={17} aria-hidden /> Mi QR
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-8">
        {buscable ? (
          <>
            <p className="px-3 pb-1 pt-2 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Resultados</p>
            {buscando ? (
              <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin text-[#681984]" aria-label="Buscando" /></div>
            ) : lista.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <User size={38} className="mb-3 text-gray-200" aria-hidden />
                <p role="status" className="text-[14px] text-gray-400">{aviso || "No encontramos a nadie. Prueba con el nombre o el celular completo (9 dígitos)."}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">{lista.map((c) => <Fila key={c.account_number} contacto={c} onElegir={onElegir} />)}</div>
            )}
          </>
        ) : (
          <>
            {recientes.length > 0 && (
              <>
                <p className="px-3 pb-1 pt-2 text-[12px] font-semibold uppercase tracking-wider text-gray-500">Recientes</p>
                <div className="divide-y divide-gray-50">{recientes.map((c) => <Fila key={c.account_number} contacto={c} onElegir={onElegir} />)}</div>
              </>
            )}
            <div className="mx-2 mt-4 rounded-2xl border border-[#f0eaf6] bg-[#faf8fc] p-4">
              <p className="mb-1 text-[13px] font-semibold text-[#681984]">💡 Sin comisión</p>
              <p className="text-[12px] text-gray-400">Todos los yapeos dentro de MiHome son gratuitos e instantáneos. Busca por nombre o por el celular completo.</p>
            </div>
          </>
        )}
      </div>
    </>
  )
}
