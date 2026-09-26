import { CreditCard, LayoutGrid, TrendingUp, User } from "lucide-react"
import Link from "next/link"

export type PestanaActiva = "inicio" | "inversiones"

const ITEMS = [
  { id: "inicio", icon: LayoutGrid, label: "Inicio", href: "/home" },
  { id: "inversiones", icon: TrendingUp, label: "Inversiones", href: "/inversiones" },
  { id: "tarjetas", icon: CreditCard, label: "Tarjetas", href: "/home" },
  { id: "perfil", icon: User, label: "Perfil", href: "/home" },
] as const

/** Barra inferior de la app. «Tarjetas» y «Perfil» todavía no tienen pantalla propia y llevan al inicio. */
export function BottomNav({ activa }: { activa: PestanaActiva }) {
  return (
    <nav aria-label="Navegación principal" className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 px-4 pb-6 pt-3 flex items-center justify-around">
      {ITEMS.map((item) => {
        const seleccionada = item.id === activa
        return (
          <Link href={item.href} key={item.id} aria-current={seleccionada ? "page" : undefined} className="flex flex-col items-center gap-1.5 group">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${seleccionada ? "bg-[#681984]" : "group-hover:bg-gray-50"}`}>
              <item.icon size={19} className={seleccionada ? "text-white" : "text-gray-400 group-hover:text-[#681984]"} />
            </div>
            <span className={`text-[10px] font-semibold ${seleccionada ? "text-[#681984]" : "text-gray-400"}`}>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
