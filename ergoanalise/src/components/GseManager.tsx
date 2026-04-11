"use client";
import { useState, useMemo } from "react";
import { useData, GSE_RISKS, Gse } from "@/contexts/DataContext";
import { useToast } from "@/components/Toast";
import {
  FiPlus, FiTrash2, FiChevronDown, FiChevronRight,
  FiCheck, FiClipboard, FiUsers, FiAlertTriangle,
} from "react-icons/fi";

interface GseManagerProps {
  companyId: string;
}

export default function GseManager({ companyId }: GseManagerProps) {
  const { toast } = useToast();
  const {
    sectors, positions, assessments,
    gses, addGse, updateGse, deleteGse,
    addGsePosition, removeGsePosition,
    addGseRisk, removeGseRisk,
    addGseAssessment, removeGseAssessment,
  } = useData();

  const companyGses = useMemo(() => gses.filter((g) => g.companyId === companyId).sort((a, b) => a.numero - b.numero), [gses, companyId]);
  const companySectors = useMemo(() => sectors.filter((s) => s.companyId === companyId), [sectors, companyId]);

  const [expandedGse, setExpandedGse] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, "cargos" | "riscos" | "avaliacoes" | "conclusao">>({});
  const [conclusaoEdit, setConclusaoEdit] = useState<Record<string, string>>({});
  const [savingConclusao, setSavingConclusao] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const usedPositionIds = useMemo(() => {
    const used = new Set<string>();
    companyGses.forEach((g) => g.positionIds.forEach((p) => used.add(p)));
    return used;
  }, [companyGses]);

  const handleCreateGse = async () => {
    setCreating(true);
    try {
      const gse = await addGse(companyId);
      setExpandedGse(gse.id);
      setActiveTab((prev) => ({ ...prev, [gse.id]: "cargos" }));
      setConclusaoEdit((prev) => ({ ...prev, [gse.id]: "" }));
      toast(`GSE ${String(gse.numero).padStart(2, "0")} criado!`);
    } catch (err: any) {
      toast(err?.message || "Erro ao criar GSE.", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGse = async (gse: Gse) => {
    if (!confirm(`Excluir GSE ${String(gse.numero).padStart(2, "0")}? Esta ação é irreversível.`)) return;
    await deleteGse(gse.id);
    if (expandedGse === gse.id) setExpandedGse(null);
    toast("GSE excluído.");
  };

  const toggleGse = (gseId: string) => {
    setExpandedGse((prev) => (prev === gseId ? null : gseId));
    if (!activeTab[gseId]) setActiveTab((prev) => ({ ...prev, [gseId]: "cargos" }));
    if (conclusaoEdit[gseId] === undefined) {
      const gse = gses.find((g) => g.id === gseId);
      setConclusaoEdit((prev) => ({ ...prev, [gseId]: gse?.conclusao || "" }));
    }
  };

  const saveConclusao = async (gseId: string) => {
    setSavingConclusao(gseId);
    await updateGse(gseId, { conclusao: conclusaoEdit[gseId] || "" });
    setSavingConclusao(null);
    toast("Conclusão salva!");
  };

  const togglePosition = async (gseId: string, positionId: string, isLinked: boolean) => {
    try {
      if (isLinked) { await removeGsePosition(gseId, positionId); }
      else { await addGsePosition(gseId, positionId); }
    } catch (err: any) {
      toast(err?.message || "Erro ao vincular cargo.", "error");
    }
  };

  const toggleRisk = async (gseId: string, risco: string, isLinked: boolean) => {
    try {
      if (isLinked) { await removeGseRisk(gseId, risco); }
      else { await addGseRisk(gseId, risco); }
    } catch (err: any) {
      toast(err?.message || "Erro.", "error");
    }
  };

  const toggleAssessment = async (gseId: string, assessmentId: string, isLinked: boolean) => {
    try {
      if (isLinked) { await removeGseAssessment(gseId, assessmentId); }
      else { await addGseAssessment(gseId, assessmentId); }
    } catch (err: any) {
      toast(err?.message || "Erro.", "error");
    }
  };

  const tabCls = (gseId: string, tab: string) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
      activeTab[gseId] === tab
        ? "bg-white text-emerald-700 border-t border-l border-r border-slate-200"
        : "text-slate-500 hover:text-slate-700"
    }`;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-slate-500">
          {companyGses.length === 0
            ? "Nenhum GSE criado. Adicione o primeiro grupo."
            : `${companyGses.length} GSE(s) definido(s)`}
        </p>
        <button
          onClick={handleCreateGse}
          disabled={creating}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm disabled:opacity-50"
        >
          <FiPlus size={16} />
          {creating ? "Criando..." : "Adicionar GSE"}
        </button>
      </div>

      {companyGses.length === 0 && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-10 text-center">
          <FiUsers size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Clique em "Adicionar GSE" para criar o primeiro grupo.</p>
        </div>
      )}

      <div className="space-y-3">
        {companyGses.map((gse) => {
          const isExpanded = expandedGse === gse.id;
          const tab = activeTab[gse.id] || "cargos";
          const label = `GSE ${String(gse.numero).padStart(2, "0")}`;
          const availableAssessments = assessments.filter((a) => gse.positionIds.includes(a.positionId));

          return (
            <div key={gse.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggleGse(gse.id)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
              >
                <span className="w-16 text-sm font-bold text-emerald-700 shrink-0">{label}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{gse.positionIds.length} cargo(s)</span>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{gse.risks.length} risco(s)</span>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{gse.assessmentIds.length} avaliação(ões)</span>
                    {gse.conclusao && <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Conclusão preenchida</span>}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteGse(gse); }}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                >
                  <FiTrash2 size={14} />
                </button>
                {isExpanded ? <FiChevronDown size={17} className="text-slate-400 shrink-0" /> : <FiChevronRight size={17} className="text-slate-400 shrink-0" />}
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100">
                  <div className="flex gap-1 px-4 pt-3 bg-slate-50 border-b border-slate-200">
                    {(["cargos", "riscos", "avaliacoes", "conclusao"] as const).map((t) => (
                      <button key={t} onClick={() => setActiveTab((p) => ({ ...p, [gse.id]: t }))} className={tabCls(gse.id, t)}>
                        {t === "cargos" ? "Cargos" : t === "riscos" ? "Riscos Ergonômicos" : t === "avaliacoes" ? "Avaliações" : "Conclusão"}
                      </button>
                    ))}
                  </div>

                  <div className="p-5">
                    {tab === "cargos" && (
                      <div>
                        <p className="text-sm text-slate-500 mb-4">Selecione os cargos. Um cargo só pode pertencer a um GSE por vez.</p>
                        {companySectors.length === 0 ? (
                          <p className="text-slate-400 text-sm">Nenhum setor cadastrado.</p>
                        ) : (
                          <div className="space-y-4">
                            {companySectors.map((sector) => {
                              const sectorPos = positions.filter((p) => p.sectorId === sector.id);
                              if (sectorPos.length === 0) return null;
                              return (
                                <div key={sector.id}>
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{sector.name}</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {sectorPos.map((pos) => {
                                      const isLinked = gse.positionIds.includes(pos.id);
                                      const isUsedElsewhere = !isLinked && usedPositionIds.has(pos.id);
                                      return (
                                        <button
                                          key={pos.id}
                                          onClick={() => !isUsedElsewhere && togglePosition(gse.id, pos.id, isLinked)}
                                          disabled={isUsedElsewhere}
                                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left text-sm transition-colors ${
                                            isLinked ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                              : isUsedElsewhere ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                                              : "bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                                          }`}
                                        >
                                          <span className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${isLinked ? "bg-emerald-600 border-emerald-600" : "border-slate-300"}`}>
                                            {isLinked && <FiCheck size={11} className="text-white" />}
                                          </span>
                                          <div className="min-w-0">
                                            <p className="font-medium truncate">{pos.name}</p>
                                            {isUsedElsewhere && <p className="text-xs text-slate-400">Em outro GSE</p>}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {tab === "riscos" && (
                      <div>
                        <p className="text-sm text-slate-500 mb-4">Selecione os riscos ergonômicos evidenciados ({gse.risks.length} selecionado(s)).</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {GSE_RISKS.map((risco) => {
                            const isLinked = gse.risks.includes(risco);
                            return (
                              <button
                                key={risco}
                                onClick={() => toggleRisk(gse.id, risco, isLinked)}
                                className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border text-left text-sm transition-colors ${
                                  isLinked ? "bg-amber-50 border-amber-300 text-amber-800" : "bg-white border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50"
                                }`}
                              >
                                <span className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 ${isLinked ? "bg-amber-500 border-amber-500" : "border-slate-300"}`}>
                                  {isLinked && <FiCheck size={11} className="text-white" />}
                                </span>
                                <span>{risco}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {tab === "avaliacoes" && (
                      <div>
                        <p className="text-sm text-slate-500 mb-4">
                          Vincule avaliações realizadas em cargos deste GSE.
                          {gse.positionIds.length === 0 && <span className="text-amber-600"> Adicione cargos primeiro.</span>}
                        </p>
                        {availableAssessments.length === 0 ? (
                          <div className="text-center py-6 text-slate-400">
                            <FiClipboard size={28} className="mx-auto mb-2 text-slate-300" />
                            <p className="text-sm">Nenhuma avaliação para os cargos deste GSE.</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {availableAssessments.map((assessment) => {
                              const isLinked = gse.assessmentIds.includes(assessment.id);
                              const pos = positions.find((p) => p.id === assessment.positionId);
                              const sec = sectors.find((s) => s.id === assessment.sectorId);
                              const ncCount = (assessment.filledBlocks || []).reduce((sum, fb) =>
                                sum + (fb.answers || []).filter((ans) =>
                                  ans.value?.toLowerCase().includes("não") && !ans.value?.toLowerCase().includes("não se aplica")
                                ).length, 0);
                              return (
                                <button
                                  key={assessment.id}
                                  onClick={() => toggleAssessment(gse.id, assessment.id, isLinked)}
                                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg border text-left text-sm transition-colors ${
                                    isLinked ? "bg-blue-50 border-blue-300" : "bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                                  }`}
                                >
                                  <span className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 ${isLinked ? "bg-blue-600 border-blue-600" : "border-slate-300"}`}>
                                    {isLinked && <FiCheck size={11} className="text-white" />}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-800">{assessment.templateName}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{pos?.name} · {sec?.name} · {assessment.workstation}</p>
                                    <p className="text-xs text-slate-400">Observado: {assessment.observedWorker} · {new Date(assessment.createdAt).toLocaleDateString("pt-BR")}</p>
                                  </div>
                                  {ncCount > 0 && (
                                    <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded shrink-0">
                                      <FiAlertTriangle size={10} /> {ncCount} NC
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {tab === "conclusao" && (
                      <div>
                        <p className="text-sm text-slate-500 mb-3">Registre a análise e conclusão do avaliador para este grupo.</p>
                        <textarea
                          value={conclusaoEdit[gse.id] ?? gse.conclusao}
                          onChange={(e) => setConclusaoEdit((prev) => ({ ...prev, [gse.id]: e.target.value }))}
                          placeholder="Descreva a conclusão do avaliador para este GSE..."
                          rows={7}
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-sm text-slate-700"
                        />
                        <div className="flex justify-end mt-3">
                          <button
                            onClick={() => saveConclusao(gse.id)}
                            disabled={savingConclusao === gse.id}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50"
                          >
                            {savingConclusao === gse.id ? "Salvando..." : "Salvar Conclusão"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
