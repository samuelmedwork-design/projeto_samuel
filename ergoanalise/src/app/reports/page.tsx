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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCompanies.map((company) => {
            const companySurveys = surveys.filter((s) => s.companyId === company.id);
            const companyAssessments = assessments.filter((a) => a.companyId === company.id);
            const companyActions = actions.filter((a) => a.companyId === company.id);
            const companySectors = sectors.filter((s) => s.companyId === company.id);
            const totalPains = companySurveys.reduce((acc, s) => acc + (s.painAreas || []).length, 0);
            const pendingActions = companyActions.filter((a) => a.status === "pendente").length;

            return (
              <div key={company.id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-800 text-lg">{company.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{company.cnpj}</p>
                  </div>
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-medium px-2.5 py-1 rounded-full">
                    {company.city}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <FiUsers size={14} />
                      <span className="text-xs">Respostas</span>
                    </div>
                    <p className="text-xl font-bold text-slate-800">{companySurveys.length}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <FiClipboard size={14} />
                      <span className="text-xs">Checklists</span>
                    </div>
                    <p className="text-xl font-bold text-slate-800">{companyAssessments.length}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <FiAlertTriangle size={14} />
                      <span className="text-xs">Queixas</span>
                    </div>
                    <p className="text-xl font-bold text-red-600">{totalPains}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <FiFileText size={14} />
                      <span className="text-xs">Ações Pend.</span>
                    </div>
                    <p className="text-xl font-bold text-amber-600">{pendingActions}</p>
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">
                    {companySectors.length} setores
                  </span>
                  <span className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded">
                    {companyActions.length} ações
                  </span>
                </div>

                {/* Botões de relatório */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => router.push(`/reports/${company.id}`)}
                    className="w-full text-sm bg-blue-50 text-blue-700 border border-blue-200 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors font-medium text-left flex items-center gap-2"
                  >
                    <FiUsers size={14} />
                    Relatório de Queixas de Dores
                  </button>
                  <button
                    onClick={() => router.push(`/reports/checklists/${company.id}`)}
                    className="w-full text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-lg hover:bg-emerald-100 transition-colors font-medium text-left flex items-center gap-2"
                  >
                    <FiClipboard size={14} />
                    Relatório de Checklists Técnicos
                  </button>
                  <button
                    onClick={() => router.push(`/reports/anthropometry/${company.id}`)}
                    className="w-full text-sm bg-purple-50 text-purple-700 border border-purple-200 px-3 py-2 rounded-lg hover:bg-purple-100 transition-colors font-medium text-left flex items-center gap-2"
                  >
                    <FiActivity size={14} />
                    Dados Antropométricos
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
