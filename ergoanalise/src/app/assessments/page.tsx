"use client";
import { useState } from "react";
import { useData } from "@/contexts/DataContext";
import { useRouter } from "next/navigation";
import { FiClipboard, FiPlus, FiEye, FiTrash2, FiSearch } from "react-icons/fi";

export default function AssessmentsPage() {
  const { templates, assessments, companies, sectors, positions, blocks, deleteAssessment } = useData();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Modal state
  const [selTemplate, setSelTemplate] = useState("");
  const [selCompany, setSelCompany] = useState("");
  const [selSector, setSelSector] = useState("");
  const [selPositions, setSelPositions] = useState<string[]>([]);

  const modalSectors = sectors.filter((s) => s.companyId === selCompany);
  const modalPositions = positions.filter((p) => p.sectorId === selSector);

  const togglePosition = (id: string) => {
    setSelPositions((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);
  };

  const openModal = () => {
    setSelTemplate("");
    setSelCompany("");
    setSelSector("");
    setSelPositions([]);
    setShowModal(true);
  };

  const startAssessment = () => {
    if (!selTemplate || !selCompany || !selSector || selPositions.length === 0) return;
    const params = new URLSearchParams({
      company: selCompany,
      sector: selSector,
      positions: selPositions.join(","),
    });
    router.push(`/assessments/fill/${selTemplate}?${params.toString()}`);
  };

  const getCompanyName = (id: string) => companies.find((c) => c.id === id)?.name ?? "—";
  const getSectorName = (id: string) => sectors.find((s) => s.id === id)?.name ?? "—";
  const getPositionName = (id: string) => positions.find((p) => p.id === id)?.name ?? "—";

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Excluir a avaliação "${name}"? Esta ação não pode ser desfeita.`)) {
      await deleteAssessment(id);
    }
  };

  const filteredAssessments = assessments.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      getCompanyName(a.companyId).toLowerCase().includes(q) ||
      a.templateName.toLowerCase().includes(q) ||
      getSectorName(a.sectorId).toLowerCase().includes(q) ||
      getPositionName(a.positionId).toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Avaliações Técnicas</h1>
          <p className="text-slate-500 text-sm mt-1">{assessments.length} avaliação(ões) realizada(s)</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
        >
          <FiPlus size={18} />
          Nova Avaliação
        </button>
      </div>

      {/* Busca */}
      {assessments.length > 0 && (
        <div className="relative mb-6">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por empresa, checklist, setor ou cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
          />
        </div>
      )}

      {/* Histórico */}
      {assessments.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center text-slate-400">
          <FiClipboard size={40} className="mx-auto mb-3 opacity-50" />
          <p>Nenhuma avaliação realizada ainda.</p>
          <p className="text-sm mt-1">Clique em &quot;Nova Avaliação&quot; para começar.</p>
        </div>
      ) : filteredAssessments.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FiSearch size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhuma avaliação encontrada para &ldquo;{search}&rdquo;.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-4 py-3 font-medium text-slate-600">Empresa</th>
                <th className="px-4 py-3 font-medium text-slate-600">Checklist</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Setor / Cargo</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">Posto</th>
                <th className="px-4 py-3 font-medium text-slate-600">Data</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssessments.map((a) => {
                const ncCount = (a.filledBlocks || []).reduce((sum, fb) =>
                  sum + (fb.answers || []).filter(
                    (ans) => ans.type === "marcacao" && ans.value.toLowerCase().includes("não") && !ans.value.toLowerCase().includes("não se aplica")
                  ).length, 0
                );
                return (
                  <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-800 font-medium">{getCompanyName(a.companyId)}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {a.templateName}
                      {ncCount > 0 && (
                        <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
                          {ncCount} NC
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                      {getSectorName(a.sectorId)} / {getPositionName(a.positionId)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">{a.workstation || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(a.createdAt).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => router.push(`/assessments/${a.id}`)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Ver detalhes">
                          <FiEye size={15} />
                        </button>
                        <button onClick={() => handleDelete(a.id, a.templateName)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir">
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Nova Avaliação */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg mx-4 space-y-5">
            <h2 className="text-lg font-semibold text-slate-800">Nova Avaliação</h2>

            {/* Checklist */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Checklist *</label>
              <select value={selTemplate} onChange={(e) => setSelTemplate(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="">Selecione o checklist</option>
                {templates.map((t) => {
                  const tplBlocks = t.blockIds.map((bid) => blocks.find((b) => b.id === bid)).filter(Boolean);
                  const totalQ = tplBlocks.reduce((sum, b) => sum + (b?.questions.length ?? 0), 0);
                  return (
                    <option key={t.id} value={t.id}>
                      {t.name} ({tplBlocks.length} blocos, {totalQ} perguntas)
                    </option>
                  );
                })}
              </select>
              {templates.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">Nenhum checklist cadastrado. Crie um em Checklists primeiro.</p>
              )}
            </div>

            {/* Empresa */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Empresa *</label>
              <select value={selCompany} onChange={(e) => { setSelCompany(e.target.value); setSelSector(""); setSelPositions([]); }}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="">Selecione a empresa</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Setor */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Setor *</label>
              <select value={selSector} onChange={(e) => { setSelSector(e.target.value); setSelPositions([]); }}
                disabled={!selCompany}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50">
                <option value="">Selecione o setor</option>
                {modalSectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Cargos (multi-select) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cargo(s) * <span className="text-slate-400 font-normal">(selecione um ou mais)</span>
              </label>
              {!selSector ? (
                <p className="text-sm text-slate-400 py-2">Selecione um setor primeiro</p>
              ) : modalPositions.length === 0 ? (
                <p className="text-sm text-slate-400 py-2">Nenhum cargo cadastrado neste setor</p>
              ) : (
                <div className="border border-slate-300 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1.5">
                  {modalPositions.map((p) => {
                    const checked = selPositions.includes(p.id);
                    return (
                      <label key={p.id} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${checked ? "bg-emerald-50" : "hover:bg-slate-50"}`}>
                        <input type="checkbox" checked={checked} onChange={() => togglePosition(p.id)}
                          className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500" />
                        <span className="text-sm text-slate-700">{p.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={startAssessment}
                disabled={!selTemplate || !selCompany || !selSector || selPositions.length === 0}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                Iniciar Avaliação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
