"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useData } from "@/contexts/DataContext";
import { FiArrowLeft, FiSearch, FiEye, FiTrash2, FiUser } from "react-icons/fi";

export default function SurveyHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { companies, surveys, deleteSurvey } = useData();
  const company = companies.find((c) => c.id === id);

  const [search, setSearch] = useState("");
  const [statSector, setStatSector] = useState("");

  const allCompanySurveys = surveys.filter((s) => s.companyId === id);

  const companySurveys = allCompanySurveys
    .filter((s) => s.workerName?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // ── Estatísticas ───────────────────────────────────────────────────────────
  const sectorNames = [...new Set(allCompanySurveys.map((s) => s.sector).filter(Boolean))].sort();
  const statsFiltered = statSector
    ? allCompanySurveys.filter((s) => s.sector === statSector)
    : allCompanySurveys;

  // Sexo (não filtrado por setor — reflete toda a empresa)
  const maleCount = allCompanySurveys.filter((s) => s.sex === "Masculino").length;
  const femaleCount = allCompanySurveys.filter((s) => s.sex === "Feminino").length;
  const totalWithSex = maleCount + femaleCount;
  const malePerc = totalWithSex > 0 ? (maleCount / totalWithSex) * 100 : 0;

  // Altura e peso (filtrados por setor)
  const heightSamples = statsFiltered.filter((s) => (s.height ?? 0) > 0);
  const avgHeight =
    heightSamples.length > 0
      ? (heightSamples.reduce((sum, s) => sum + (s.height ?? 0), 0) / heightSamples.length).toFixed(1)
      : null;

  const weightSamples = statsFiltered.filter((s) => (s.weight ?? 0) > 0);
  const avgWeight =
    weightSamples.length > 0
      ? (weightSamples.reduce((sum, s) => sum + (s.weight ?? 0), 0) / weightSamples.length).toFixed(1)
      : null;

  const handleDelete = async (surveyId: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir o questionário de "${name}"? Esta ação não pode ser desfeita.`))
      await deleteSurvey(surveyId);
  };

  if (!company) return <div className="p-8 text-slate-500">Empresa não encontrada.</div>;

  return (
    <div className="p-8 max-w-6xl">
      <button
        onClick={() => router.push(`/companies/${id}/structure`)}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6"
      >
        <FiArrowLeft size={18} /> Voltar para estrutura
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Histórico de Questionários</h1>
          <p className="text-slate-500 text-sm mt-1">
            {company.name} — {allCompanySurveys.length} questionário(s)
          </p>
        </div>
      </div>

      {/* ── Estatísticas ── */}
      {allCompanySurveys.length > 0 && (
        <div className="mb-8">
          {/* Filtro por setor para altura/peso */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-medium text-slate-600">Filtrar altura/peso por setor:</span>
            <select
              value={statSector}
              onChange={(e) => setStatSector(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="">Todos os setores</option>
              {sectorNames.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Gráfico pizza — Sexo */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-slate-600 mb-4">Distribuição por Sexo</p>
              <div className="flex items-center gap-5">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <div
                    className="w-20 h-20 rounded-full"
                    style={{
                      background:
                        totalWithSex === 0
                          ? "#e2e8f0"
                          : `conic-gradient(#3b82f6 ${malePerc * 3.6}deg, #ec4899 ${malePerc * 3.6}deg 360deg)`,
                    }}
                  />
                  {/* Anel interno */}
                  <div className="absolute inset-[18%] bg-white rounded-full" />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
                    <span className="text-slate-600">
                      Masculino: <strong>{maleCount}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-pink-500 flex-shrink-0" />
                    <span className="text-slate-600">
                      Feminino: <strong>{femaleCount}</strong>
                    </span>
                  </div>
                  {totalWithSex < allCompanySurveys.length && (
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-slate-300 flex-shrink-0" />
                      <span className="text-slate-400 text-xs">
                        Não informado: {allCompanySurveys.length - totalWithSex}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Altura média */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-slate-600 mb-1">Altura Média</p>
              {statSector && (
                <p className="text-xs text-slate-400 mb-2">{statSector}</p>
              )}
              <p className="text-3xl font-bold text-emerald-600">
                {avgHeight ? `${avgHeight} cm` : "—"}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {heightSamples.length} registro(s) com altura
              </p>
            </div>

            {/* Peso médio */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-slate-600 mb-1">Peso Médio</p>
              {statSector && (
                <p className="text-xs text-slate-400 mb-2">{statSector}</p>
              )}
              <p className="text-3xl font-bold text-emerald-600">
                {avgWeight ? `${avgWeight} kg` : "—"}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {weightSamples.length} registro(s) com peso
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Busca */}
      <div className="relative mb-6">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Buscar por nome do trabalhador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
        />
      </div>

      {companySurveys.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FiUser size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-400">Nenhum questionário encontrado.</p>
          <p className="text-slate-400 text-sm mt-1">
            Os questionários aparecerão aqui quando os trabalhadores responderem pelo link do questionário.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Setor / Cargo</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Altura</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Queixas de Dor</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {companySurveys.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <FiUser size={12} className="text-emerald-600" />
                      </div>
                      <span className="font-medium text-slate-800 text-sm">{s.workerName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600">
                    {s.sector || "-"} / {s.position || "-"}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600">
                    {s.height ? `${s.height} cm` : "-"}
                  </td>
                  <td className="px-5 py-3 text-sm">
                    {(s.painAreas || []).length > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                        {(s.painAreas || []).length} queixa(s)
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">Nenhuma</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-500">
                    {new Date(s.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => router.push(`/companies/${id}/surveys/${s.id}`)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                        title="Ver detalhes"
                      >
                        <FiEye size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id, s.workerName)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Excluir"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
