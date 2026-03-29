"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useData } from "@/contexts/DataContext";
import { FiArrowLeft, FiEdit2, FiTrash2, FiSearch, FiUser, FiX, FiCheck } from "react-icons/fi";

export default function WorkersPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { companies, surveys, updateSurvey, deleteSurvey } = useData();
  const company = companies.find((c) => c.id === id);

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSector, setEditSector] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editHeight, setEditHeight] = useState("");

  const companySurveys = surveys
    .filter((s) => s.companyId === id)
    .filter((s) =>
      s.workerName?.toLowerCase().includes(search.toLowerCase()) ||
      s.sector?.toLowerCase().includes(search.toLowerCase()) ||
      s.position?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.workerName?.localeCompare(b.workerName || "") || 0);

  const startEdit = (s: typeof companySurveys[0]) => {
    setEditingId(s.id);
    setEditName(s.workerName || "");
    setEditSector(s.sector || "");
    setEditPosition(s.position || "");
    setEditHeight(String(s.height || ""));
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    await updateSurvey(editingId, {
      workerName: editName.trim(),
      sector: editSector.trim(),
      position: editPosition.trim(),
      height: Number(editHeight) || 0,
    });
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const handleDelete = async (surveyId: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir o registro de "${name}"? Esta ação não pode ser desfeita.`)) {
      await deleteSurvey(surveyId);
    }
  };

  if (!company) return <div className="p-8 text-slate-500">Empresa não encontrada.</div>;

  return (
    <div className="p-8 max-w-6xl">
      <button onClick={() => router.push(`/companies/${id}/structure`)}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6">
        <FiArrowLeft size={18} /> Voltar para estrutura
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Funcionários</h1>
          <p className="text-slate-500 text-sm mt-1">{company.name} — {companySurveys.length} registro(s)</p>
        </div>
      </div>

      {/* Busca */}
      <div className="relative mb-6">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Buscar por nome, setor ou cargo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
        />
      </div>

      {companySurveys.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FiUser size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-400">Nenhum funcionário respondeu o questionário ainda.</p>
          <p className="text-slate-400 text-sm mt-1">Os registros aparecerão aqui quando os trabalhadores responderem pelo link do questionário.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Setor</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cargo</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Altura</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {companySurveys.map((s) => {
                const isEditing = editingId === s.id;

                return (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    {isEditing ? (
                      <>
                        <td className="px-5 py-3">
                          <input value={editName} onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-2 py-1.5 border border-emerald-300 rounded text-sm focus:ring-1 focus:ring-emerald-500 outline-none" />
                        </td>
                        <td className="px-5 py-3">
                          <input value={editSector} onChange={(e) => setEditSector(e.target.value)}
                            className="w-full px-2 py-1.5 border border-emerald-300 rounded text-sm focus:ring-1 focus:ring-emerald-500 outline-none" />
                        </td>
                        <td className="px-5 py-3">
                          <input value={editPosition} onChange={(e) => setEditPosition(e.target.value)}
                            className="w-full px-2 py-1.5 border border-emerald-300 rounded text-sm focus:ring-1 focus:ring-emerald-500 outline-none" />
                        </td>
                        <td className="px-5 py-3">
                          <input type="number" value={editHeight} onChange={(e) => setEditHeight(e.target.value)}
                            className="w-20 px-2 py-1.5 border border-emerald-300 rounded text-sm focus:ring-1 focus:ring-emerald-500 outline-none" />
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-500">
                          {new Date(s.createdAt).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={saveEdit}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Salvar">
                              <FiCheck size={16} />
                            </button>
                            <button onClick={cancelEdit}
                              className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition-colors" title="Cancelar">
                              <FiX size={16} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                              <FiUser size={12} className="text-emerald-600" />
                            </div>
                            <span className="font-medium text-slate-800 text-sm">{s.workerName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-600">{s.sector || "-"}</td>
                        <td className="px-5 py-3 text-sm text-slate-600">{s.position || "-"}</td>
                        <td className="px-5 py-3 text-sm text-slate-600">{s.height ? `${s.height} cm` : "-"}</td>
                        <td className="px-5 py-3 text-sm text-slate-500">
                          {new Date(s.createdAt).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => startEdit(s)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Editar">
                              <FiEdit2 size={15} />
                            </button>
                            <button onClick={() => handleDelete(s.id, s.workerName)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir">
                              <FiTrash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
