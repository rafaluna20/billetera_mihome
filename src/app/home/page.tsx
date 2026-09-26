import {
  Bell,
  ChevronRight,
  Headset,
  Plus,
  QrCode,
  RefreshCcw,
  Send,
  ShoppingBag,
  Smartphone,
  LayoutList,
  Wallet,
  Zap,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react"
import Link from "next/link"
import BalanceCard from "@/components/BalanceCard"
import { BottomNav } from "@/components/BottomNav"
import { LogoutButton } from "@/components/LogoutButton"

import { getWalletTransactions, obtenerCuenta, type Movimiento } from "@/lib/actions/wallet"
import { redirect } from "next/navigation"

function getTransactionIcon(tx: Movimiento) {
  const desc = (tx.description || tx.transaction_type_label || "").toLowerCase()
  if (desc.includes("recarga") || desc.includes("recibid")) return ArrowDownLeft
  if (desc.includes("transfer") || desc.includes("envio") || desc.includes("envío")) return ArrowUpRight
  if (desc.includes("celular") || desc.includes("movistar") || desc.includes("claro")) return Smartphone // Kept for transaction icon classification
  if (desc.includes("compra") || desc.includes("pago") || desc.includes("tienda")) return ShoppingBag
  return Zap
}

export default async function HomeScreen() {
  const resultado = await obtenerCuenta()
  // Sesión vencida: /salir borra las cookies y vuelve al inicio (aquí, al dibujar la página, no se pueden borrar).
  if (resultado.estado === "sesion") redirect("/salir")
  if (resultado.estado === "conexion") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-6 text-center">
        <div className="max-w-xs text-slate-200">
          <p className="mb-2 text-lg font-bold">No pudimos cargar tu billetera</p>
          <p className="mb-5 text-sm text-slate-400">Revisa tu conexión e inténtalo de nuevo. Tu sesión sigue abierta.</p>
          <Link href="/home" className="inline-block rounded-2xl bg-[#00b5ad] px-6 py-3 font-bold text-white">Reintentar</Link>
        </div>
      </div>
    )
  }
  const account = resultado.cuenta

  const transactions = await getWalletTransactions(8, 0)

  const formatSoles = (amount: number) =>
    new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 2,
    }).format(amount)

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ""
    return new Date(dateStr).toLocaleDateString("es-PE", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const firstName = (account.name || "Bienvenido").split(" ")[0]

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 sm:p-4">
      {/* Mobile Frame */}
      <div className="w-full h-[100dvh] sm:h-[844px] max-w-[390px] bg-[#681984] sm:rounded-[3rem] overflow-hidden relative shadow-[0_0_60px_rgba(104,25,132,0.5)] flex flex-col font-sans border-4 border-slate-800 sm:border-[#333]">

        {/* Decorative blobs */}
        <div className="absolute top-[-60px] right-[-60px] w-64 h-64 bg-[#9b2dba]/25 rounded-full blur-3xl z-0" />
        <div className="absolute top-[120px] left-[-50px] w-48 h-48 bg-[#00b5ad]/15 rounded-full blur-3xl z-0" />

        {/* Header Nav */}
        <div className="relative z-10 flex items-center justify-between px-6 pt-8 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-2xl border border-white/20 flex items-center justify-center">
              <span className="text-white font-black text-[10px] leading-none text-center">Mi<br/>H</span>
            </div>
            <div>
              <p className="text-white/60 text-[11px]">Billetera Digital</p>
              <p className="text-white font-bold text-[15px] leading-tight">Hola, {firstName} 👋</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-medium px-3 py-2 rounded-full transition-colors">
              <Headset size={13} />
              Ayuda
            </button>
            <button className="relative w-9 h-9 bg-white/10 border border-white/15 rounded-xl flex items-center justify-center">
              <Bell size={16} className="text-white" />
              <div className="absolute top-1 right-1 w-2 h-2 bg-[#ffc600] rounded-full border border-[#681984]" />
            </button>
            <LogoutButton />
          </div>
        </div>

        {/* Balance Card */}
        <BalanceCard
          balance={account.balance ?? 0}
          accountNumber={account.number || ""}
        />

        {/* Quick Actions — single row: Yapear, QR, Tienda, Más */}
        <div className="relative z-10 px-5 mt-4">
          <div className="grid grid-cols-4 gap-3">
            {/* Yapear */}
            <div className="flex flex-col items-center gap-1.5">
              <Link href="/yapear" className="w-full aspect-square rounded-2xl bg-[#00b5ad] shadow-[0_4px_16px_rgba(0,181,173,0.4)] flex items-center justify-center active:scale-95 transition-transform">
                <Send size={21} className="text-white" />
              </Link>
              <span className="text-white/70 text-[11px] font-medium">Yapear</span>
            </div>

            {/* QR */}
            <div className="flex flex-col items-center gap-1.5">
              <button className="w-full aspect-square rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center active:scale-95 transition-transform">
                <QrCode size={21} className="text-white" />
              </button>
              <span className="text-white/70 text-[11px] font-medium">QR</span>
            </div>

            {/* Servicios: luz y agua, inversiones y demás servicios conectados */}
            <div className="flex flex-col items-center gap-1.5">
              <Link href="/servicios" className="w-full aspect-square rounded-2xl bg-white/90 flex items-center justify-center active:scale-95 transition-transform">
                <LayoutList size={21} className="text-[#681984]" />
              </Link>
              <span className="text-white/70 text-[11px] font-medium">Servicios</span>
            </div>

            {/* Depositar en una plataforma */}
            <div className="flex flex-col items-center gap-1.5">
              <Link href="/depositar" className="w-full aspect-square rounded-2xl bg-[#813a96] border border-[#9b51b0] flex items-center justify-center active:scale-95 transition-transform">
                <Plus size={21} className="text-white" />
              </Link>
              <span className="text-white/70 text-[11px] font-medium">Depositar</span>
            </div>
          </div>
        </div>

        {/* Transactions Sheet */}
        <div className="relative z-20 flex-1 bg-white rounded-t-[2rem] mt-4 flex flex-col overflow-hidden shadow-[0_-12px_40px_rgba(0,0,0,0.15)]">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>

          <div className="flex items-center justify-between px-6 pt-2 pb-2">
            <h3 className="text-[#4a1862] text-[16px] font-bold">Movimientos</h3>
            <button className="flex items-center gap-1 text-[#00b5ad] text-[12px] font-medium hover:text-[#009c95] transition-colors">
              <RefreshCcw size={11} />
              Ver todos
              <ChevronRight size={13} />
            </button>
          </div>

          {/* Transactions List */}
          <div className="flex-1 overflow-y-auto px-6 pb-20 divide-y divide-gray-50">
            {transactions && transactions.length > 0 ? (
              transactions.map((tx) => {
                const Icon = getTransactionIcon(tx)
                const isPositive = tx.amount >= 0
                return (
                  <div key={tx.id} className="flex items-center gap-3.5 py-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${isPositive ? "bg-[#e6faf9] border border-[#00b5ad]/20" : "bg-red-50 border border-red-200"}`}>
                      <Icon size={17} className={isPositive ? "text-[#00b5ad]" : "text-red-400"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700 text-[13px] font-semibold truncate">
                        {tx.partner_name || tx.recipient_name || tx.description || tx.transaction_type_label || "Transacción"}
                      </p>
                      <p className="text-gray-400 text-[11px] mt-0.5">{formatDate(tx.date)}</p>
                    </div>
                    <span className={`font-bold text-[13px] flex-shrink-0 ${isPositive ? "text-[#00b5ad]" : "text-red-400"}`}>
                      {isPositive ? "+" : ""}{formatSoles(tx.amount)}
                    </span>
                  </div>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-10">
                <Wallet size={36} className="text-gray-200 mb-3" />
                <p className="text-gray-400 text-[13px]">Sin movimientos recientes</p>
              </div>
            )}
          </div>

          <BottomNav activa="inicio" />
        </div>

      </div>
    </div>
  )
}
