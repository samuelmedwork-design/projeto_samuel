"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/components/Toast";
import { FiPlus, FiFileText, FiTrash2, FiChevronRight, FiCheckCircle, FiClock } from "react-icons/fi";

const STEP_LABELS = ["Definição dos GSEs", "Conclusão Geral", "Plano de Ação"];

export default function AetListPage() {
  const router = useRouter();
  const { companies, aets, addAet, deleteAet } = useData();
  const { toast } = useToast();

  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!selectedCompany) return;
    setCreating(true);
    try {
      const aet = await addAet(selectedCompany);
      router.push(`/aet/${aet.id}`);
    } catch (err: any) {
      toast(err?.message || "Erro ao criar AET.", "error");
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Excluir esta AET? Esta ação não pode ser desfeita.")) return;
    await deleteAet(id);
    toast("AET excluída.");
  };

  const getCompanyName = (companyId: string) => companies.find((c) => c.id === companyId)?.name || "Empresa não encontrada";

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return iso;
    }
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <FiFileText size={18} className="text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Análises Ergonômicas do Trabalho</h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">{aets.length} AET(s) gerada(s)</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium text-sm"
        >
          <FiPlus size={16} />
          Gerar Nova AET
        </button>
      </div>

      {aets.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400">
          <FiFileText size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-base font-medium text-slate-500">Nenhuma AET gerada ainda</p>
          <p className="text-sm mt-1">Clique em "Gerar Nova AET" para começar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {aets.map((aet) => {
            const isCompleted = !!aet.completedAt;
            const stepLabel = isCompleted ? "Concluída" : STEP_LABELS[aet.currentStep - 1] || "Em andamento";
            return (
              <div
                key={aet.id}
                onClick={() => router.push(`/aet/${aet.id}`)}
                className="bg-white border border-slate-200 rounded-xl p-5 cursor-pointer hover:border-emerald-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isCompleted ? "bg-emerald-100" : "bg-amber-100"}`}>
                    {isCompleted
                      ? <FiCheckCircle size={20} className="text-emerald-600" />
                      : <FiClock size={20} className="text-amber-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{getCompanyName(aet.companyId)}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isCompleted ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {stepLabel}
                      </span>
                      {!isCompleted && (
                        <span className="text-xs text-slate-400">Etapa {aet.currentStep} de 3</span>
                      )}
                      <span className="text-xs text-slate-400">{formatDate(aet.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => handleDelete(aet.id, e)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <FiTrash2 size={15} />
                    </button>
                    <FiChevronRight size={18} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                  </div>
                </div>

                {/* Progress bar */}
                {!isCompleted && (
                  <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${((aet.currentStep - 1) / 3) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nova AET */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md mx-4 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Gerar Nova AET</h2>
              <p className="text-sm text-slate-500 mt-1">Selecione a empresa para iniciar a análise.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Empresa</label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              >
                <option value="">Selecione a empresa...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setShowNewModal(false); setSelectedCompany(""); }}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={!selectedCompany || creating}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {creating ? "Criando..." : "Iniciar AET"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
