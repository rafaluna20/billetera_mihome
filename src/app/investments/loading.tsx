import { Bell } from "lucide-react"

export default function InvestmentsLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 sm:p-4 animate-pulse">
      {/* Mobile Frame */}
      <div className="w-full h-[100dvh] sm:h-[844px] max-w-[390px] bg-[#681984] sm:rounded-[3rem] overflow-hidden relative shadow-[0_0_60px_rgba(104,25,132,0.5)] flex flex-col font-sans border-4 border-slate-800 sm:border-[#333]">
        
        {/* Decorative background */}
        <div className="absolute top-0 left-0 right-0 h-[350px] bg-gradient-to-b from-[#813a96] to-[#681984] z-0" />
        <div className="absolute top-[-50px] left-[-50px] w-64 h-64 bg-[#00b5ad]/20 rounded-full blur-3xl z-0" />

        {/* Header Skeleton */}
        <div className="relative z-10 flex items-center justify-between px-6 pt-8 pb-2">
          <div className="w-28 h-6 bg-white/20 rounded-md" />
          <div className="w-9 h-9 bg-white/10 rounded-xl" />
        </div>

        {/* Main Balance Display Skeleton */}
        <div className="relative z-10 px-6 pt-4 pb-4 flex flex-col items-center">
          <div className="w-40 h-4 bg-white/20 rounded mb-3" />
          <div className="w-48 h-12 bg-white/30 rounded-lg" />
          <div className="mt-4 w-32 h-6 bg-white/20 rounded-full" />
        </div>

        {/* Graph Area Skeleton */}
        <div className="relative z-10 h-[100px] w-full mt-2" />

        {/* Bottom Body Skeleton */}
        <div className="flex-1 bg-[#f8f9fa] rounded-t-[2.5rem] p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] flex flex-col relative z-10">
          
          {/* Action Buttons Skeleton */}
          <div className="grid grid-cols-2 gap-3 mt-4 mb-6">
            <div className="h-[54px] bg-gray-200 rounded-2xl" />
            <div className="h-[54px] bg-gray-200 rounded-2xl" />
          </div>

          {/* Cards Skeleton */}
          <div className="w-full h-24 bg-gray-200 rounded-[1.5rem] mb-4" />
          <div className="w-full h-32 bg-gray-200 rounded-[1.5rem]" />
        </div>
      </div>
    </div>
  )
}
