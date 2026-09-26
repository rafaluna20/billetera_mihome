import { BottomNav, type PestanaActiva } from "@/components/BottomNav"
import { LogoutButton } from "@/components/LogoutButton"

/** Marco de teléfono de las pantallas internas: encabezado con título, contenido y barra inferior. */
export function MarcoApp({ titulo, activa, children }: { titulo: string; activa: PestanaActiva; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 sm:p-4">
      <div className="relative flex h-[100dvh] w-full max-w-[390px] flex-col overflow-hidden border-4 border-slate-800 bg-[#681984] font-sans shadow-[0_0_60px_rgba(104,25,132,0.5)] sm:h-[844px] sm:rounded-[3rem] sm:border-[#333]">
        <div className="absolute right-[-60px] top-[-60px] z-0 h-64 w-64 rounded-full bg-[#9b2dba]/25 blur-3xl" />
        <div className="relative z-10 flex items-center justify-between px-6 pb-2 pt-8">
          <h1 className="text-[22px] font-bold text-white">{titulo}</h1>
          <LogoutButton />
        </div>
        {children}
        <BottomNav activa={activa} />
      </div>
    </div>
  )
}
