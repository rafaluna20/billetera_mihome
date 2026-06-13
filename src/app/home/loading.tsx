import { Bell, Headset, LogOut } from "lucide-react"

export default function HomeLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 sm:p-4 animate-pulse">
      {/* Mobile Frame */}
      <div className="w-full h-[100dvh] sm:h-[844px] max-w-[390px] bg-[#681984] sm:rounded-[3rem] overflow-hidden relative shadow-[0_0_60px_rgba(104,25,132,0.5)] flex flex-col font-sans border-4 border-slate-800 sm:border-[#333]">

        {/* Decorative blobs */}
        <div className="absolute top-[-60px] right-[-60px] w-64 h-64 bg-[#9b2dba]/25 rounded-full blur-3xl z-0" />
        <div className="absolute top-[120px] left-[-50px] w-48 h-48 bg-[#00b5ad]/15 rounded-full blur-3xl z-0" />

        {/* Header Nav Skeleton */}
        <div className="relative z-10 flex items-center justify-between px-6 pt-8 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-2xl border border-white/20" />
            <div>
              <div className="w-24 h-3 bg-white/20 rounded mb-1" />
              <div className="w-32 h-4 bg-white/30 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20 h-9 bg-white/10 rounded-full" />
            <div className="w-9 h-9 bg-white/10 rounded-xl" />
            <div className="w-9 h-9 bg-white/10 rounded-xl" />
          </div>
        </div>

        <div className="flex-1 flex flex-col relative z-10 mt-2 h-full">
          {/* Main Card Skeleton */}
          <div className="px-6 mb-6">
            <div className="w-full h-44 bg-white/10 rounded-[2rem] border border-white/20 shadow-lg" />
          </div>

          {/* Body Skeleton */}
          <div className="flex-1 bg-[#f8f9fa] rounded-t-[2.5rem] px-6 pt-8 pb-24 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] flex flex-col relative overflow-hidden">
            
            {/* Quick Actions Grid Skeleton */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 bg-gray-200 rounded-[1.2rem]" />
                  <div className="w-12 h-3 bg-gray-200 rounded" />
                </div>
              ))}
            </div>

            {/* Platform Promo Skeleton */}
            <div className="w-full h-20 bg-gray-200 rounded-3xl mb-8" />

            {/* Transactions Header Skeleton */}
            <div className="flex justify-between items-center mb-5">
              <div className="w-32 h-5 bg-gray-200 rounded" />
              <div className="w-16 h-4 bg-gray-200 rounded" />
            </div>

            {/* Transactions List Skeleton */}
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-2xl" />
                    <div>
                      <div className="w-24 h-4 bg-gray-200 rounded mb-2" />
                      <div className="w-16 h-3 bg-gray-200 rounded" />
                    </div>
                  </div>
                  <div className="w-16 h-4 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
