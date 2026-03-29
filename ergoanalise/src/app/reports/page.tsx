"use client";
import { useState } from "react";
import { useData } from "@/contexts/DataContext";
import { useRouter } from "next/navigation";
import { FiFileText, FiUsers, FiClipboard, FiAlertTriangle, FiActivity, FiSearch } from "react-icons/fi";

export default function ReportsPage() {
  const router = useRouter();
  const { companies, surveys, assessments, actions, sectors } = useData();
  const [search, setSearch] = useState("");

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.cnpj.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Central de Relatórios</h1>
      <p className="text-slate-500 text-sm mb-6">Visualização consolidada e geração de laudos</p>

      {/* Busca por empresa ou CNPJ */}
      {companies.length > 0 && (
        <div className="relative mb-6">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome da empresa ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
          />
        </div>
      )}

      {filteredCompanies.length === 0 && companies.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FiFileText size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhuma empresa cadastrada ainda.</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FiSearch size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhuma empresa encontrada para &ldquo;{search}&rdquo;.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCompanies.map((company) => {
            const companySurveys = surveys.filter((s) => s.companyId === company.id);
            const companyAssessments = assessments.filter((a) => a.companyId === company.id);
            const companyActions = actions.filter((a) => a.companyId === company.id);
            const companySectors = sectors.filter((s) => s.companyId === company.id);
            const totalPains = companySurveys.reduce((acc, s) => acc + (s.painAreas || []).length, 0);
            const pendingActions = companyActions.filter((a) => a.status === "pendente").length;

            return (
              <div key={company.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                <div className="mb-3">
                  <h3 className="font-semibold text-slate-800 text-sm leading-tight">{company.name}</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">{company.cnpj} — {company.city}</p>
                </div>

                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  <div className="bg-slate-50 rounded-md px-2 py-1.5 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Respostas</span>
                    <span className="text-sm font-bold text-slate-800">{companySurveys.length}</span>
                  </div>
                  <div className="bg-slate-50 rounded-md px-2 py-1.5 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Checklists</span>
                    <span className="text-sm font-bold text-slate-800">{companyAssessments.length}</span>
                  </div>
                  <div className="bg-slate-50 rounded-md px-2 py-1.5 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Queixas</span>
                    <span className="text-sm font-bold text-red-600">{totalPains}</span>
                  </div>
                  <div className="bg-slate-50 rounded-md px-2 py-1.5 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Ações Pend.</span>
                    <span className="text-sm font-bold text-amber-600">{pendingActions}</span>
                  </div>
                </div>

                {/* Botões de relatório */}
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => router.push(`/reports/${company.id}`)}
                    className="w-full text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1.5 rounded-lg hover:bg-blue-100 transition-colors font-medium text-left flex items-center gap-1.5"
                  >
                    <FiUsers size={12} />
                    Queixas de Dores
                  </button>
                  <button
                    onClick={() => router.push(`/reports/checklists/${company.id}`)}
                    className="w-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors font-medium text-left flex items-center gap-1.5"
                  >
                    <FiClipboard size={12} />
                    Checklists Técnicos
                  </button>
                  <button
                    onClick={() => router.push(`/reports/anthropometry/${company.id}`)}
                    className="w-full text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1.5 rounded-lg hover:bg-purple-100 transition-colors font-medium text-left flex items-center gap-1.5"
                  >
                    <FiActivity size={12} />
                    Antropométricos
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
