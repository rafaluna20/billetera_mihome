"use client"

import { useState } from "react"
import { Briefcase } from "lucide-react"

type InvestmentContract = {
  id: string
  name: string
  status: "active" | "completed" | "pending"
  capital: number
  roi_percentage: number
  start_date: string
  end_date: string
  accrued_gains: number
}

type TabType = "active" | "completed" | "all"

export function ContractsList({ contracts }: { contracts: InvestmentContract[] }) {
  const [activeTab, setActiveTab] = useState<TabType>("active")

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2 }).format(amount)

  const filteredContracts = contracts.filter(c => {
    if (activeTab === "active") return c.status === "active" || c.status === "pending"
    if (activeTab === "completed") return c.status === "completed"
    return true
  })

  return (
    <>
      {/* Header and Tabs */}
      <div className="flex flex-col mb-4">
        <h3 className="text-[#4a1862] text-[16px] font-bold mb-3">Mis Contratos</h3>
        
        <div className="flex bg-gray-100/80 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab("active")}
            className={`flex-1 text-[12px] font-bold py-1.5 rounded-lg transition-colors ${activeTab === 'active' ? 'bg-white text-[#681984] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            En Curso
          </button>
          <button 
            onClick={() => setActiveTab("completed")}
            className={`flex-1 text-[12px] font-bold py-1.5 rounded-lg transition-colors ${activeTab === 'completed' ? 'bg-white text-[#681984] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Finalizados
          </button>
          <button 
            onClick={() => setActiveTab("all")}
            className={`flex-1 text-[12px] font-bold py-1.5 rounded-lg transition-colors ${activeTab === 'all' ? 'bg-white text-[#681984] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Todos
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredContracts.length === 0 ? (
          <div className="text-center py-8">
            <Briefcase size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-[14px] font-medium">No hay contratos aquí</p>
            <p className="text-gray-300 text-[12px] mt-1">
              {activeTab === 'active' ? 'Aún no tienes proyectos en curso' : 'Aún no tienes proyectos finalizados'}
            </p>
          </div>
        ) : (
          filteredContracts.map(contract => (
          <div key={contract.id} className="bg-white border-2 border-gray-50 hover:border-gray-100 rounded-2xl p-4 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-gray-900 font-bold text-[14px] leading-tight">{contract.name}</p>
                <p className="text-gray-400 text-[11px] mt-0.5 font-mono">{contract.id.substring(0, 12)}...</p>
              </div>
              {contract.status === "active" ? (
                <span className="bg-[#e6faf9] text-[#00b5ad] text-[10px] font-bold px-2 py-1 rounded-md">Activo</span>
              ) : contract.status === "pending" ? (
                <span className="bg-amber-50 text-amber-500 text-[10px] font-bold px-2 py-1 rounded-md">Pendiente</span>
              ) : (
                <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-1 rounded-md">Finalizado</span>
              )}
            </div>
            
            <div className="flex justify-between items-end mt-3">
              <div>
                <p className="text-gray-400 text-[11px] mb-0.5">Capital</p>
                <p className="text-gray-800 font-semibold text-[13px]">{formatMoney(contract.capital)}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-[11px] mb-0.5">
                  {contract.status === 'completed' ? 'Ganancia Neta' : 'Ganancia Proy.'}
                </p>
                <p className="text-green-600 font-bold text-[13px]">
                  +{contract.status === 'completed' 
                    ? formatMoney(contract.accrued_gains) 
                    : formatMoney(contract.capital * (contract.roi_percentage / 100))}
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-[11px] mb-0.5">Rendimiento</p>
                <p className="text-[#00b5ad] font-bold text-[13px]">+{contract.roi_percentage}%</p>
              </div>
            </div>
          </div>
          ))
        )}
      </div>
    </>
  )
}
