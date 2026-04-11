"use client";
import { useState } from "react";
import { useData } from "@/contexts/DataContext";
import { useRouter } from "next/navigation";
import {
  FiClipboard, FiPlus, FiEye, FiTrash2, FiSearch,
  FiArrowLeft, FiChevronRight, FiFilter
} from "react-icons/fi";
import ViewToggle, { ViewMode } from "@/components/ViewToggle";

export default function AssessmentsPage() {
  const { templates, assessments, companies, sectors, positions, blocks, deleteAssessment } = useData();
  const router = useRouter();

  // Empresa selecionada para visualização
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [companyViewMode, setCompanyViewMode] = useState<ViewMode>("grid");

  // Filtros dentro da empresa
  const [filterTemplate, setFilterTemplate] = useState("");
  const [filterSector, setFilterSector] = useState("");
  const [filterPosition, setFilterPosition] = useState("");
  const [search, setSearch] = useState("");

  // Modal nova avaliação
  const [showModal, setShowModal] = useState(false);
  const [selTemplate, setSelTemplate] = useState("");
  const [selCompany, setSelCompany] = useState("");
  const [selSectors, setSelSectors] = useState<string[]>([]);
  const [selPositions, setSelPositions] = useState<string[]>([]);

  const modalSectors = sectors.filter((s) => s.companyId === selCompany);
  const modalPositions = positions.filter((p) => selSectors.includes(p.sectorId));

  const toggleSector = (id: string) => {
    setSelSectors((prev) => {
      const next = prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id];
      setSelPositions((prevPos) =>
        prevPos.filter((pid) => {
          const pos = positions.find((p) => p.id === pid);
          return pos && next.includes(pos.sectorId);
        })
      );
      return next;
    });
  };

  const togglePosition = (id: string) => {
    setSelPositions((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const openModal = () => {
    setSelTemplate("");
    setSelCompany(selectedCompanyId ?? "");
    setSelSectors([]);
    setSelPositions([]);
    setShowModal(true);
  };

  const startAssessment = () => {
    if (!selTemplate || !selCompany || selPositions.length === 0) return;
    const params = new URLSearchParams({
      company: selCompany,
      positions: selPositions.join(","),
    });
    router.push(`/assessments/fill/${selTemplate}?${params.toString()}`);
  };

  const getCompanyName = (id: string) => companies.find((c) => c.id === id)?.name ?? "—";
  const getSectorName = (id: string) => sectors.find((s) => s.id === id)?.name ?? "—";
  const getPositionName = (id: string) => positions.find((p) => p.id === id)?.name ?? "—";

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Excluir a avaliação "${name}"? Esta ação não pode ser desfeita.`)) {
      await deleteAssessment(id);
    }
  };

  const selectCompany = (id: string) => {
    setSelectedCompanyId(id);
    setFilterTemplate("");
    setFilterSector("");
    setFilterPosition("");
    setSearch("");
  };

  const backToCompanies = () => {
    setSelectedCompanyId(null);
    setFilterTemplate("");
    setFilterSector("");
    setFilterPosition("");
    setSearch("");
  };

  // ── Vista: seleção de empresa ──────────────────────────────────────────────
  if (!selectedCompanyId) {
    const companiesWithAssessments = companies.map((c) => ({
      ...c,
      count: assessments.filter((a) => a.companyId === c.id).length,
    }));

    return (
      <div className="p-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <FiClipboard size={18} className="text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">Avaliações Técnicas</h1>
            </div>
            <p className="text-slate-500 text-sm mt-1">
              {assessments.length} avaliação(ões) realizada(s) · selecione uma empresa para visualizar
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ViewToggle mode={companyViewMode} onChange={setCompanyViewMode} />
            <button
              onClick={openModal}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors font-medium text-sm"
            >
              <FiPlus size={16} />
              Nova Avaliação
            </button>
          </div>
        </div>

        {companies.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center text-slate-400">
            <FiClipboard size={40} className="mx-auto mb-3 opacity-50" />
            <p>Nenhuma empresa cadastrada.</p>
          </div>
        ) : companyViewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {companiesWithAssessments.map((c) => (
              <button
                key={c.id}
                onClick={() => selectCompany(c.id)}
                className="bg-white border border-slate-200 rounded-xl p-5 text-left hover:border-emerald-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center transition-colors shrink-0">
                    <FiClipboard size={18} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
                  </div>
                  <FiChevronRight size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors mt-1" />
                </div>
                <p className="font-semibold text-slate-800 mt-3 leading-tight">{c.name}</p>
                <p className="text-sm text-slate-400 mt-1">
                  {c.count === 0 ? "Sem avaliações" : `${c.count} avaliação(ões)`}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-4 py-3 font-medium text-slate-600">Empresa</th>
                  <th className="px-4 py-3 font-medium text-slate-600 text-right">Avaliações</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {companiesWithAssessments.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => selectCompany(c.id)}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800 group-hover:text-emerald-700 transition-colors">
                      {c.name}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-right">
                      {c.count === 0 ? "—" : c.count}
                    </td>
                    <td className="px-4 py-3 text-right w-8">
                      <FiChevronRight size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal Nova Avaliação */}
        {showModal && (
          <ModalNovaAvaliacao
            templates={templates}
            companies={companies}
            blocks={blocks}
            modalSectors={modalSectors}
            modalPositions={modalPositions}
            selTemplate={selTemplate}
            selCompany={selCompany}
            selSectors={selSectors}
            selPositions={selPositions}
            setSelTemplate={setSelTemplate}
            setSelCompany={(v) => { setSelCompany(v); setSelSectors([]); setSelPositions([]); }}
            toggleSector={toggleSector}
            togglePosition={togglePosition}
            onCancel={() => setShowModal(false)}
            onStart={startAssessment}
          />
        )}
      </div>
    );
  }

  // ── Vista: avaliações da empresa selecionada ───────────────────────────────
  const company = companies.find((c) => c.id === selectedCompanyId)!;
  const companyAssessments = assessments.filter((a) => a.companyId === selectedCompanyId);

  // Opções de filtro baseadas nas avaliações desta empresa
  const templateOptions = Array.from(
    new Map(companyAssessments.map((a) => [a.templateId, a.templateName])).entries()
  );
  const sectorOptions = Array.from(
    new Set(companyAssessments.map((a) => a.sectorId))
  ).map((id) => ({ id, name: getSectorName(id) }));
  const positionOptions = Array.from(
    new Set(
      companyAssessments
        .filter((a) => !filterSector || a.sectorId === filterSector)
        .map((a) => a.positionId)
    )
  ).map((id) => ({ id, name: getPositionName(id) }));

  const filtered = companyAssessments.filter((a) => {
    if (filterTemplate && a.templateId !== filterTemplate) return false;
    if (filterSector && a.sectorId !== filterSector) return false;
    if (filterPosition && a.positionId !== filterPosition) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.templateName.toLowerCase().includes(q) ||
        getSectorName(a.sectorId).toLowerCase().includes(q) ||
        getPositionName(a.positionId).toLowerCase().includes(q)
      );
    }
    return true;
  });

  const hasFilters = !!(filterTemplate || filterSector || filterPosition || search);

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={backToCompanies}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-600 transition-colors mb-3"
        >
          <FiArrowLeft size={14} /> Todas as empresas
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{company.name}</h1>
            <p className="text-slate-500 text-sm mt-1">
              {companyAssessments.length} avaliação(ões) realizada(s)
            </p>
          </div>
          <button
            onClick={openModal}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors font-medium text-sm"
          >
            <FiPlus size={16} />
            Nova Avaliação
          </button>
        </div>
      </div>

      {/* Filtros */}
      {companyAssessments.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <FiFilter size={14} />
            Filtros
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={filterTemplate}
              onChange={(e) => setFilterTemplate(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="">Todos os checklists</option>
              {templateOptions.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
            <select
              value={filterSector}
              onChange={(e) => { setFilterSector(e.target.value); setFilterPosition(""); }}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="">Todos os setores</option>
              {sectorOptions.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select
              value={filterPosition}
              onChange={(e) => setFilterPosition(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="">Todos os cargos</option>
              {positionOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Buscar por checklist, setor ou cargo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            />
          </div>
          {hasFilters && (
            <button
              onClick={() => { setFilterTemplate(""); setFilterSector(""); setFilterPosition(""); setSearch(""); }}
              className="text-xs text-slate-400 hover:text-emerald-600 transition-colors"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Lista */}
      {companyAssessments.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center text-slate-400">
          <FiClipboard size={40} className="mx-auto mb-3 opacity-50" />
          <p>Nenhuma avaliação realizada para esta empresa.</p>
          <p className="text-sm mt-1">Clique em &quot;Nova Avaliação&quot; para começar.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FiSearch size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhuma avaliação encontrada com os filtros aplicados.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-4 py-3 font-medium text-slate-600">Checklist</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Setor / Cargo</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">Posto</th>
                <th className="px-4 py-3 font-medium text-slate-600">Data</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const ncCount = (a.filledBlocks || []).reduce(
                  (sum, fb) =>
                    sum +
                    (fb.answers || []).filter(
                      (ans) =>
                        ans.type === "marcacao" &&
                        ans.value.toLowerCase().includes("não") &&
                        !ans.value.toLowerCase().includes("não se aplica")
                    ).length,
                  0
                );
                return (
                  <tr
                    key={a.id}
                    onClick={() => router.push(`/assessments/${a.id}`)}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
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
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(a.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/assessments/${a.id}`); }}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                          title="Ver detalhes"
                        >
                          <FiEye size={15} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(a.id, a.templateName, e)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                          title="Excluir"
                        >
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
        <ModalNovaAvaliacao
          templates={templates}
          companies={companies}
          blocks={blocks}
          modalSectors={modalSectors}
          modalPositions={modalPositions}
          selTemplate={selTemplate}
          selCompany={selCompany}
          selSectors={selSectors}
          selPositions={selPositions}
          setSelTemplate={setSelTemplate}
          setSelCompany={(v) => { setSelCompany(v); setSelSectors([]); setSelPositions([]); }}
          toggleSector={toggleSector}
          togglePosition={togglePosition}
          onCancel={() => setShowModal(false)}
          onStart={startAssessment}
        />
      )}
    </div>
  );
}

// ── Modal extraído para reuso ──────────────────────────────────────────────
function ModalNovaAvaliacao({
  templates, companies, blocks, modalSectors, modalPositions,
  selTemplate, selCompany, selSectors, selPositions,
  setSelTemplate, setSelCompany, toggleSector, togglePosition,
  onCancel, onStart,
}: {
  templates: any[]; companies: any[]; blocks: any[];
  modalSectors: any[]; modalPositions: any[];
  selTemplate: string; selCompany: string;
  selSectors: string[]; selPositions: string[];
  setSelTemplate: (v: string) => void;
  setSelCompany: (v: string) => void;
  toggleSector: (id: string) => void;
  togglePosition: (id: string) => void;
  onCancel: () => void;
  onStart: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-lg mx-4 space-y-5 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-slate-800">Nova Avaliação</h2>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Checklist *</label>
          <select
            value={selTemplate}
            onChange={(e) => setSelTemplate(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="">Selecione o checklist</option>
            {templates.map((t) => {
              const tplBlocks = t.blockIds.map((bid: string) => blocks.find((b) => b.id === bid)).filter(Boolean);
              const totalQ = tplBlocks.reduce((sum: number, b: any) => sum + (b?.questions.length ?? 0), 0);
              return (
                <option key={t.id} value={t.id}>
                  {t.name} ({tplBlocks.length} blocos, {totalQ} perguntas)
                </option>
              );
            })}
          </select>
          {templates.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">Nenhum checklist cadastrado.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Empresa *</label>
          <select
            value={selCompany}
            onChange={(e) => setSelCompany(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="">Selecione a empresa</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Setor(es) * <span className="text-slate-400 font-normal">(selecione um ou mais)</span>
          </label>
          {!selCompany ? (
            <p className="text-sm text-slate-400 py-2">Selecione uma empresa primeiro</p>
          ) : modalSectors.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">Nenhum setor cadastrado nesta empresa</p>
          ) : (
            <div className="border border-slate-300 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1.5">
              {modalSectors.map((s) => {
                const checked = selSectors.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${checked ? "bg-emerald-50" : "hover:bg-slate-50"}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSector(s.id)}
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-700">{s.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Cargo(s) * <span className="text-slate-400 font-normal">(selecione um ou mais)</span>
          </label>
          {selSectors.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">Selecione ao menos um setor primeiro</p>
          ) : modalPositions.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">Nenhum cargo cadastrado nos setores selecionados</p>
          ) : (
            <div className="border border-slate-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1.5">
              {selSectors.map((sid) => {
                const sectorObj = modalSectors.find((s) => s.id === sid);
                const sectorPositions = modalPositions.filter((p) => p.sectorId === sid);
                if (sectorPositions.length === 0) return null;
                return (
                  <div key={sid}>
                    {selSectors.length > 1 && (
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-2 pt-1 pb-0.5">
                        {sectorObj?.name}
                      </p>
                    )}
                    {sectorPositions.map((p) => {
                      const checked = selPositions.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${checked ? "bg-emerald-50" : "hover:bg-slate-50"}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePosition(p.id)}
                            className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                          />
                          <span className="text-sm text-slate-700">{p.name}</span>
                        </label>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onStart}
            disabled={!selTemplate || !selCompany || selPositions.length === 0}
            className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Iniciar Avaliação
          </button>
        </div>
      </div>
    </div>
  );
}
