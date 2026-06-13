import { Bell, ChevronRight, LayoutGrid, TrendingUp, CreditCard, User, ArrowUpRight, ArrowDownLeft, CalendarClock, Briefcase, Plus, AlertCircle } from "lucide-react"
import Link from "next/link"
import { getInvestmentSummary } from "@/lib/actions/investments"
import { ContractsList } from "@/components/investments/ContractsList"

export default async function InvestmentsScreen() {
  const summary = await getInvestmentSummary()
  
  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2 }).format(amount)

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 sm:p-4">
      {/* Mobile Frame */}
      <div className="w-full h-[100dvh] sm:h-[844px] max-w-[390px] bg-[#681984] sm:rounded-[3rem] overflow-hidden relative shadow-[0_0_60px_rgba(104,25,132,0.5)] flex flex-col font-sans border-4 border-slate-800 sm:border-[#333]">
        
        {/* Decorative background */}
        <div className="absolute top-0 left-0 right-0 h-[350px] bg-gradient-to-b from-[#813a96] to-[#681984] z-0" />
        <div className="absolute top-[-50px] left-[-50px] w-64 h-64 bg-[#00b5ad]/20 rounded-full blur-3xl z-0 pointer-events-none" />

        {/* Status Bar */}
        <div className="relative z-20 flex justify-between items-center px-6 pt-3 text-white text-sm font-semibold">
          <span>8:01</span>
          <div className="flex gap-1.5 items-center">
            <div className="flex gap-0.5 items-end h-3">
              {[6, 8, 10, 12].map((h, i) => (
                <div key={i} className="w-1 bg-white rounded-sm" style={{ height: `${h}px` }} />
              ))}
            </div>
            <div className="ml-1 w-6 h-3 border border-white/50 rounded-[3px] relative flex items-center p-[1px]">
              <div className="bg-white w-full h-full rounded-[1px]" />
              <div className="absolute -right-[3px] bg-white/50 w-[2px] h-1.5 rounded-r-sm" />
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-6 pt-4 pb-2">
          <h1 className="text-white font-bold text-[22px]">Patrimonio</h1>
          <button className="w-9 h-9 bg-white/10 border border-white/15 rounded-xl flex items-center justify-center relative">
            <Bell size={16} className="text-white" />
            <div className="absolute top-1 right-1 w-2 h-2 bg-[#ffc600] rounded-full" />
          </button>
        </div>

        {/* Main Balance Display */}
        <div className="relative z-10 px-6 pt-4 pb-4 flex flex-col items-center">
          <p className="text-white/70 text-[13px] font-medium mb-1">Total activo + Saldo libre</p>
          <div className="flex items-baseline gap-1">
            <span className="text-white/70 text-2xl font-medium">S/</span>
            <span className="text-white text-[44px] font-black tracking-tight leading-none">
              {(summary.active_capital + summary.platform_balance).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-3 bg-[#00b5ad]/20 border border-[#00b5ad]/30 px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <TrendingUp size={14} className="text-[#00e8df]" />
            <span className="text-[#00e8df] text-[12px] font-semibold">
              + {formatMoney(summary.monthly_gains)} este mes
            </span>
          </div>
        </div>

        {/* Premium Graph Area (SVG Mock) */}
        <div className="relative z-10 h-[100px] w-full mt-2">
          <svg viewBox="0 0 400 100" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00b5ad" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#00b5ad" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M0,100 L0,70 C50,60 100,80 150,50 C200,20 250,40 300,30 C350,20 380,10 400,5 L400,100 Z"
              fill="url(#chartGradient)"
            />
            <path
              d="M0,70 C50,60 100,80 150,50 C200,20 250,40 300,30 C350,20 380,10 400,5"
              fill="none"
              stroke="#00e8df"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Current point */}
            <circle cx="395" cy="7" r="4" fill="white" stroke="#00e8df" strokeWidth="2" />
          </svg>
        </div>

        {/* Bottom Sheet */}
        <div className="relative z-20 flex-1 bg-white rounded-t-[2rem] flex flex-col overflow-hidden shadow-[0_-12px_40px_rgba(0,0,0,0.15)]">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-24">
            
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3 mt-4 mb-6">
              <button className="h-[54px] bg-[#f0f9f8] border border-[#d1f0ef] rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform">
                <ArrowDownLeft size={18} className="text-[#00b5ad]" />
                <span className="text-[#00b5ad] font-bold text-[14px]">Retirar a Billetera</span>
              </button>
              <Link href="/investments/recharge" className="h-[54px] bg-[#681984] hover:bg-[#5a1570] shadow-md rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform">
                <Plus size={18} className="text-white" />
                <span className="text-white font-bold text-[14px]">Nueva Inversión</span>
              </Link>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                <Briefcase size={16} className="text-gray-400 mb-2" />
                <p className="text-gray-500 text-[11px] font-semibold mb-0.5">CAPITAL EN CURSO</p>
                <p className="text-[#4a1862] text-[16px] font-bold leading-tight">{formatMoney(summary.active_capital)}</p>
                <p className="text-gray-400 text-[9px] mt-0.5 font-medium">Histórico: {formatMoney(summary.total_capital)}</p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                <LayoutGrid size={16} className="text-[#00b5ad] mb-2" />
                <p className="text-gray-500 text-[11px] font-semibold mb-0.5">SALDO PLATAFORMA</p>
                <p className="text-[#00b5ad] text-[16px] font-bold leading-tight">{formatMoney(summary.platform_balance)}</p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                <ArrowUpRight size={16} className="text-green-500 mb-2" />
                <p className="text-gray-500 text-[11px] font-semibold mb-0.5">GANANCIA TOTAL</p>
                <p className="text-green-600 text-[16px] font-bold leading-tight">{formatMoney(summary.total_gains)}</p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                <Briefcase size={16} className="text-[#681984] mb-2" />
                <p className="text-gray-500 text-[11px] font-semibold mb-0.5">PROYECTOS ACTIVOS</p>
                <p className="text-[#681984] text-[16px] font-bold leading-tight">{summary.active_projects}</p>
                <p className="text-gray-400 text-[9px] mt-0.5 font-medium">Histórico: {summary.contracts.length}</p>
              </div>
            </div>

            {/* Next Payment Alert */}
            <div className="bg-gradient-to-r from-[#faf8fc] to-white border border-[#f0eaf6] rounded-2xl p-4 flex items-center gap-3 mb-6 shadow-sm">
              <div className="w-10 h-10 bg-[#f5f0fa] rounded-xl flex items-center justify-center flex-shrink-0">
                <CalendarClock size={18} className="text-[#681984]" />
              </div>
              <div className="flex-1">
                <p className="text-gray-900 font-bold text-[14px]">Notificación</p>
                <p className="text-gray-500 text-[12px]">{summary.next_payment_date.includes("Sin") || summary.next_payment_date.includes("Email") || summary.next_payment_date.includes("Desconectado") ? summary.next_payment_date : `${formatMoney(summary.next_payment_amount)} el ${summary.next_payment_date}`}</p>
              </div>
            </div>

            {/* Contracts List Component */}
            <ContractsList contracts={summary.contracts} />

          </div>

          {/* Bottom Navigation Bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 px-4 pb-6 pt-3 flex items-center justify-around">
            {[
              { icon: LayoutGrid, label: "Inicio", active: false, href: "/home" },
              { icon: TrendingUp, label: "Inversiones", active: true, href: "/investments" },
              { icon: CreditCard, label: "Tarjetas", active: false, href: "/home" },
              { icon: User, label: "Perfil", active: false, href: "/home" },
            ].map((item) => (
              <Link href={item.href} key={item.label} className="flex flex-col items-center gap-1.5 group">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${item.active ? "bg-[#681984]" : "group-hover:bg-gray-50"}`}>
                  <item.icon size={19} className={item.active ? "text-white" : "text-gray-400 group-hover:text-[#681984]"} />
                </div>
                <span className={`text-[10px] font-semibold ${item.active ? "text-[#681984]" : "text-gray-400"}`}>
                  {item.label}
                </span>
              </Link>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
