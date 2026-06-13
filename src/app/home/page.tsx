import { 
  Menu, 
  Headset, 
  Bell, 
  Smartphone, 
  FileText, 
  Wallet, 
  ShieldCheck, 
  Percent, 
  Store, 
  Flame, 
  Plus, 
  Eye, 
  RefreshCcw,
  QrCode,
  Send,
  LogOut
} from "lucide-react"
import { getWalletAccount, getWalletTransactions } from "@/lib/actions/wallet"
import { logout } from "@/lib/actions/auth"
import { redirect } from "next/navigation"

export default async function HomeScreen() {
  const account = await getWalletAccount()
  
  if (!account) {
    // Si no hay cuenta, o el token expira, enviamos al login
    redirect("/")
  }

  const transactions = await getWalletTransactions(5, 0)

  // Función auxiliar para formatear montos a Soles
  const formatSoles = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 sm:p-4">
      {/* Mobile Frame Container */}
      <div className="w-full h-[100dvh] sm:h-[844px] max-w-[390px] bg-[#681984] sm:rounded-[3rem] overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col font-sans border-4 border-slate-800 sm:border-[#333]">
        
        {/* Status Bar (Simulated) */}
        <div className="flex justify-between items-center px-6 pt-3 text-white text-sm font-semibold relative z-20">
          <span>8:01</span>
          <div className="flex gap-1.5 items-center">
            {/* signal bars */}
            <div className="flex gap-0.5 items-end h-3">
              <div className="w-1 bg-white h-1.5 rounded-sm"></div>
              <div className="w-1 bg-white h-2 rounded-sm"></div>
              <div className="w-1 bg-white h-2.5 rounded-sm"></div>
              <div className="w-1 bg-white h-3 rounded-sm"></div>
            </div>
            {/* wifi */}
            <div className="ml-1 w-4 h-3 bg-white mask-wifi" style={{clipPath: "polygon(0 100%, 50% 0, 100% 100%)"}}></div>
            {/* battery */}
            <div className="ml-1 w-6 h-3 border border-white/50 rounded-[3px] relative flex items-center p-[1px]">
              <div className="bg-white w-full h-full rounded-[1px] flex items-center justify-center text-[8px] font-bold text-black">41</div>
              <div className="absolute -right-[3px] bg-white/50 w-[2px] h-1.5 rounded-r-sm"></div>
            </div>
          </div>
        </div>

        {/* Top Header Section */}
        <div className="flex-none px-6 pt-6 pb-4 relative z-10 flex flex-col">
          {/* Nav */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Menu className="text-white h-6 w-6 cursor-pointer" />
              <div className="flex items-center gap-3">
                <span className="text-white text-xl font-medium tracking-wide">Hola,</span>
                <span className="bg-[#ffc600] text-[#4a1862] text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Gratis</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-white">
              <Headset className="h-6 w-6 cursor-pointer" />
              <div className="relative">
                <Bell className="h-6 w-6 cursor-pointer" />
                <div className="absolute top-0 right-0 h-2.5 w-2.5 bg-[#00b5ad] rounded-full border-2 border-[#681984]"></div>
              </div>
              <form action={logout}>
                <button type="submit" className="text-white hover:text-gray-300 ml-2" title="Cerrar sesión">
                  <LogOut className="h-5 w-5" />
                </button>
              </form>
            </div>
          </div>

          {/* Banner Promo */}
          <div className="w-full bg-white rounded-2xl p-2.5 flex items-center gap-3 shadow-lg relative overflow-hidden mb-2 cursor-pointer">
             <div className="w-14 h-14 bg-[#f0f0f0] rounded-xl flex-shrink-0 overflow-hidden relative">
               <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=200&auto=format&fit=crop')] bg-cover bg-center"></div>
             </div>
             <div className="flex-1">
               <h3 className="text-[#333] font-bold text-sm leading-tight">Cheese + papas a S/6.90</h3>
               <p className="text-[#666] text-xs mt-0.5">¡Solo por hoy!</p>
             </div>
          </div>
          {/* Banner Dots */}
          <div className="flex justify-center gap-1.5 mt-2 mb-6">
             <div className="w-5 h-1.5 bg-white/90 rounded-full"></div>
             <div className="w-1.5 h-1.5 bg-white/30 rounded-full"></div>
             <div className="w-1.5 h-1.5 bg-white/30 rounded-full"></div>
             <div className="w-1.5 h-1.5 bg-white/30 rounded-full"></div>
             <div className="w-1.5 h-1.5 bg-white/30 rounded-full"></div>
          </div>

          {/* Icon Grid */}
          <div className="grid grid-cols-4 gap-y-5 gap-x-2 px-1">
            <div className="flex flex-col items-center gap-1.5 cursor-pointer">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center relative shadow-md">
                <Smartphone className="text-[#681984] h-7 w-7" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#00b5ad] rounded-full border-2 border-white"></div>
              </div>
              <span className="text-white text-[10px] text-center leading-tight">Recargar<br/>celular</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 cursor-pointer">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md">
                <FileText className="text-[#681984] h-7 w-7" />
              </div>
              <span className="text-white text-[10px] text-center leading-tight">Yapear<br/>servicios</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 cursor-pointer">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md">
                <Wallet className="text-[#681984] h-7 w-7" />
                <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold opacity-0">S/</div>
              </div>
              <span className="text-white text-[10px] text-center leading-tight">Créditos</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 cursor-pointer">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md">
                <ShieldCheck className="text-[#681984] h-7 w-7" />
              </div>
              <span className="text-white text-[10px] text-center leading-tight">Código de<br/>aprobación</span>
            </div>

            <div className="flex flex-col items-center gap-1.5 cursor-pointer relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#ffc600] text-[#4a1862] text-[10px] font-bold px-1.5 py-0.5 rounded-sm z-10 shadow-sm">Locura!</div>
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md">
                <Percent className="text-[#681984] h-7 w-7" />
              </div>
              <span className="text-white text-[10px] text-center leading-tight">Promos</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 cursor-pointer">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md">
                <Store className="text-[#681984] h-7 w-7" />
              </div>
              <span className="text-white text-[10px] text-center leading-tight">Tienda</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 cursor-pointer">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md">
                <Flame className="text-[#681984] h-7 w-7" />
              </div>
              <span className="text-white text-[10px] text-center leading-tight">Pedir Gas</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 cursor-pointer">
              <div className="w-14 h-14 bg-[#813a96] border border-[#9b51b0] rounded-2xl flex items-center justify-center shadow-md">
                <Plus className="text-white h-7 w-7" />
              </div>
              <span className="text-white text-[10px] text-center leading-tight">Ver más</span>
            </div>
          </div>
        </div>

        {/* Bottom Sheet - Transactions */}
        <div className="flex-1 bg-white rounded-t-[1.5rem] flex flex-col relative z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] mt-2">
          
          {/* Scrollable Area */}
          <div className="flex-1 overflow-y-auto pb-24 px-6 pt-6">
            {/* Mostrar Saldo Button */}
            <div className="w-full bg-white border border-[#eaeaea] rounded-xl py-3.5 px-4 mb-6 shadow-sm flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-3">
                <Eye className="text-[#681984] h-5 w-5" />
                <span className="text-[#681984] font-medium text-[15px] group-hover:hidden">Mostrar saldo</span>
                <span className="text-[#681984] font-bold text-[18px] hidden group-hover:block">{formatSoles(account.balance)}</span>
              </div>
              <span className="text-xs text-gray-400 group-hover:hidden">N° {account.number}</span>
            </div>

            {/* Movimientos Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#4a1862] text-lg font-bold">Movimientos</h3>
              <div className="flex items-center gap-3">
                <RefreshCcw className="text-[#00b5ad] h-5 w-5 cursor-pointer" />
                <span className="text-[#00b5ad] text-[15px] font-medium cursor-pointer">Ver todos</span>
              </div>
            </div>
            
            <div className="h-[1px] w-full bg-[#f0f0f0] mb-4"></div>

            {/* Transaction List */}
            <div className="space-y-0">
              {transactions && transactions.length > 0 ? (
                transactions.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between py-4 border-b border-[#f0f0f0]">
                    <div className="flex flex-col">
                      <span className="text-[#666] text-sm font-medium">
                        {tx.description || tx.transaction_type_label || 'Transacción'}
                      </span>
                      <span className="text-[#999] text-xs mt-0.5">
                        {tx.date ? new Date(tx.date).toLocaleDateString('es-PE', { 
                          day: 'numeric', month: 'short', year: 'numeric', 
                          hour: '2-digit', minute: '2-digit' 
                        }) : 'Fecha desconocida'}
                      </span>
                    </div>
                    <span className={`font-medium ${tx.amount >= 0 ? 'text-[#00b5ad]' : 'text-[#d83f58]'}`}>
                      {tx.amount > 0 ? '+ ' : '- '}{formatSoles(Math.abs(tx.amount))}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-gray-500 text-sm">
                  No tienes movimientos recientes
                </div>
              )}
            </div>
          </div>

          {/* Fixed Bottom Action Buttons */}
          <div className="absolute bottom-0 left-0 w-full bg-white/90 backdrop-blur-md px-4 py-4 pb-8 flex items-center gap-3 border-t border-[#f0f0f0]">
            <button className="flex-1 bg-white border-2 border-[#00b5ad] text-[#00b5ad] h-12 rounded-xl font-medium text-[15px] flex items-center justify-center gap-2 hover:bg-[#f0fbfb] transition-colors">
              <QrCode className="h-5 w-5" />
              Escanear QR
            </button>
            <button className="flex-1 bg-[#00b5ad] text-white h-12 rounded-xl font-medium text-[15px] flex items-center justify-center gap-2 hover:bg-[#009c95] transition-colors shadow-md shadow-[#00b5ad]/20">
              <Send className="h-5 w-5 -rotate-45 mb-1" />
              Yapear
            </button>
          </div>
          
          {/* iOS Bottom indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-black rounded-full"></div>
        </div>
      </div>
    </div>
  )
}
