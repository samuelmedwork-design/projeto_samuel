"use client";
import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useData, Gse } from "@/contexts/DataContext";
import { useToast } from "@/components/Toast";
import {
  FiArrowLeft, FiPlus, FiTrash2, FiAlertTriangle, FiCheckCircle,
  FiEdit2, FiCheck, FiX,
} from "react-icons/fi";

/* ─── Plano Específico por GSE ───────────────────────────────────────── */
function PlanoEspecifico({ gse, gseLabel }: { gse: Gse; gseLabel: string }) {
  const { assessments, positions, sectors, updateGse } = useData();

  // Coleta todas as NCs com recomendação das avaliações vinculadas ao GSE
  const allItems = useMemo(() => {
    const items: { id: string; questionText: string; recommendation: string; blockName: string; positionName: string; templateName: string }[] = [];
    gse.assessmentIds.forEach((assessmentId) => {
      const assessment = assessments.find((a) => a.id === assessmentId);
      if (!assessment) return;
      const pos = positions.find((p) => p.id === assessment.positionId);
      (assessment.filledBlocks || []).forEach((fb) => {
        (fb.answers || []).forEach((ans) => {
          const isNC = ans.value?.toLowerCase().includes("não") && !ans.value?.toLowerCase().includes("não se aplica");
          if (isNC && ans.recommendation?.trim()) {
            items.push({
              id: `${assessmentId}::${ans.questionId}`,
              questionText: ans.questionText,
              recommendation: ans.recommendation,
              blockName: fb.blockName,
              positionName: pos?.name || "Cargo não encontrado",
              templateName: assessment.templateName,
            });
          }
        });
      });
    });
    return items;
  }, [gse.assessmentIds, gse.positionIds, assessments, positions]);

  const visibleItems = allItems.filter((item) => !gse.excludedActionIds.includes(item.id));
  const removedCount = allItems.length - visibleItems.length;

  const removeItem = async (itemId: string) => {
    const updated = [...gse.excludedActionIds, itemId];
    await updateGse(gse.id, { excludedActionIds: updated });
  };

  if (allItems.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <FiCheckCircle size={32} className="mx-auto mb-3 text-slate-300" />
        <p className="text-sm">Nenhuma não conformidade com recomendação encontrada nas avaliações deste GSE.</p>
        <p className="text-xs mt-1">Vincule avaliações ao GSE e preencha os campos de recomendação.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-500">
          {visibleItems.length} item(s) no plano
          {removedCount > 0 && <span className="text-slate-400 ml-2">({removedCount} removido(s) manualmente)</span>}
        </p>
      </div>
      <div className="space-y-2">
        {visibleItems.map((item) => (
          <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                <FiAlertTriangle size={11} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 mb-1">
                  {item.templateName} · {item.blockName} · <span className="font-medium text-slate-600">{item.positionName}</span>
                </p>
                <p className="text-sm text-slate-700 mb-1"><span className="font-medium">NC:</span> {item.questionText}</p>
                <p className="text-sm text-emerald-700 bg-emerald-50 rounded px-2 py-1 mt-1">
                  <span className="font-medium">Recomendação:</span> {item.recommendation}
                </p>
              </div>
              <button
                onClick={() => removeItem(item.id)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                title="Remover do plano"
              >
                <FiTrash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Plano Geral da Empresa ─────────────────────────────────────────── */
function PlanoGeral({ companyId }: { companyId: string }) {
  const { actionChecklist, addActionChecklistItem, updateActionChecklistItem, deleteActionChecklistItem } = useData();
  const { toast } = useToast();
  const [newItem, setNewItem] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const companyItems = actionChecklist.filter((a) => a.companyId === companyId).sort((a, b) => a.ordem - b.ordem);

  // Itens com resposta "nao" geram ação automática
  const actionItems = companyItems.filter((a) => a.resposta === "nao");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    setAdding(true);
    try {
      await addActionChecklistItem(companyId, newItem.trim());
      setNewItem("");
    } catch (err: any) {
      toast(err?.message || "Erro.", "error");
    } finally {
      setAdding(false);
    }
  };

  const setResposta = async (id: string, resposta: "sim" | "nao" | "nao_se_aplica") => {
    const item = companyItems.find((a) => a.id === id);
    if (item?.resposta === resposta) {
      await updateActionChecklistItem(id, { resposta: null });
    } else {
      await updateActionChecklistItem(id, { resposta });
    }
  };

  const respostaBtnCls = (current: string | null, val: string) => {
    const active = current === val;
    const colors: Record<string, string> = {
      sim: active ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-300 text-slate-600 hover:border-emerald-400",
      nao: active ? "bg-red-500 text-white border-red-500" : "border-slate-300 text-slate-600 hover:border-red-400",
      nao_se_aplica: active ? "bg-slate-500 text-white border-slate-500" : "border-slate-300 text-slate-600 hover:border-slate-400",
    };
    return `px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${colors[val]}`;
  };

  return (
    <div>
      {/* Adicionar item */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Novo item do checklist geral..."
          className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
        />
        <button type="submit" disabled={adding} className="p-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50">
          <FiPlus size={18} />
        </button>
      </form>

      {companyItems.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <p className="text-sm">Nenhum item no checklist geral.</p>
          <p className="text-xs mt-1">Adicione itens e responda para gerar o plano de ação.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-8">
            {companyItems.map((item) => (
              <div key={item.id} className={`bg-white border rounded-lg p-4 transition-colors ${item.resposta === "nao" ? "border-red-200 bg-red-50" : "border-slate-200"}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {editingId === item.id ? (
                      <div className="flex gap-2">
                        <input
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                          autoFocus
                        />
                        <button onClick={async () => { await updateActionChecklistItem(item.id, { item: editText }); setEditingId(null); }} className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"><FiCheck size={14} /></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600"><FiX size={14} /></button>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-800">{item.item}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => setResposta(item.id, "sim")} className={respostaBtnCls(item.resposta, "sim")}>Sim</button>
                      <button onClick={() => setResposta(item.id, "nao")} className={respostaBtnCls(item.resposta, "nao")}>Não</button>
                      <button onClick={() => setResposta(item.id, "nao_se_aplica")} className={respostaBtnCls(item.resposta, "nao_se_aplica")}>N/A</button>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setEditingId(item.id); setEditText(item.item); }} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><FiEdit2 size={14} /></button>
                    <button onClick={() => deleteActionChecklistItem(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><FiTrash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Plano de ação gerado (itens "Não") */}
          {actionItems.length > 0 && (
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <FiAlertTriangle className="text-red-500" size={16} />
                Plano de Ação Gerado ({actionItems.length} item(s))
              </h3>
              <div className="space-y-2">
                {actionItems.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                    <span className="w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                    <p className="text-sm text-red-800">{item.item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────── */
export default function PlanoAcaoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { companies, gses } = useData();

  const company = companies.find((c) => c.id === id);
  const companyGses = useMemo(() => gses.filter((g) => g.companyId === id).sort((a, b) => a.numero - b.numero), [gses, id]);

  const [activeMain, setActiveMain] = useState<"especifico" | "geral">("especifico");
  const [activeGse, setActiveGse] = useState<string | null>(companyGses[0]?.id || null);

  if (!company) return <div className="p-8 text-slate-500">Empresa não encontrada.</div>;

  const tabCls = (tab: string, current: string) =>
    `px-5 py-2.5 text-sm font-medium rounded-lg transition-colors ${
      current === tab ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <button onClick={() => router.push(`/companies/${id}/structure`)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-600 transition-colors mb-2">
          <FiArrowLeft size={14} /> Voltar à estrutura
        </button>
        <h1 className="text-2xl font-bold text-slate-800">{company.name}</h1>
        <p className="text-slate-500 text-sm mt-1">Plano de Ação</p>
      </div>

      {/* Toggle Específico / Geral */}
      <div className="flex gap-2 mb-8 bg-slate-100 p-1 rounded-xl w-fit">
        <button onClick={() => setActiveMain("especifico")} className={tabCls("especifico", activeMain)}>
          Plano Específico (por GSE)
        </button>
        <button onClick={() => setActiveMain("geral")} className={tabCls("geral", activeMain)}>
          Plano Geral da Empresa
        </button>
      </div>

      {/* Plano Específico */}
      {activeMain === "especifico" && (
        <div>
          {companyGses.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              <p className="text-sm">Nenhum GSE cadastrado para esta empresa.</p>
              <button onClick={() => router.push(`/companies/${id}/gse`)} className="mt-4 text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                Ir para o módulo GSE →
              </button>
            </div>
          ) : (
            <div>
              {/* GSE tabs */}
              <div className="flex gap-2 flex-wrap mb-6">
                {companyGses.map((gse) => (
                  <button
                    key={gse.id}
                    onClick={() => setActiveGse(gse.id)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      activeGse === gse.id
                        ? "bg-amber-50 border-amber-300 text-amber-800"
                        : "bg-white border-slate-200 text-slate-600 hover:border-amber-300"
                    }`}
                  >
                    GSE {String(gse.numero).padStart(2, "0")}
                    {gse.assessmentIds.length > 0 && <span className="ml-1.5 text-xs opacity-60">{gse.assessmentIds.length} aval.</span>}
                  </button>
                ))}
              </div>
              {activeGse && (() => {
                const gse = companyGses.find((g) => g.id === activeGse);
                if (!gse) return null;
                return (
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-base font-semibold text-slate-800 mb-4">
                      GSE {String(gse.numero).padStart(2, "0")} — Não conformidades com recomendação
                    </h2>
                    <PlanoEspecifico gse={gse} gseLabel={`GSE ${String(gse.numero).padStart(2, "0")}`} />
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Plano Geral */}
      {activeMain === "geral" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-800">Checklist Geral da Empresa</h2>
            <p className="text-sm text-slate-500 mt-1">
              Responda cada item com Sim, Não ou N/A. Respostas "Não" geram automaticamente itens no plano de ação.
            </p>
          </div>
          <PlanoGeral companyId={id} />
        </div>
      )}
    </div>
  );
}
