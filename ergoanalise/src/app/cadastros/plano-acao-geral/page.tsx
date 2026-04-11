"use client";
import { useState } from "react";
import { useData, ActionPlanQuestion } from "@/contexts/DataContext";
import { useToast } from "@/components/Toast";
import { FiPlus, FiTrash2, FiEdit2, FiCheck, FiX, FiCheckSquare } from "react-icons/fi";

const PRIORITIES: { value: ActionPlanQuestion["priority"]; label: string; color: string }[] = [
  { value: "baixa", label: "Baixa", color: "bg-slate-100 text-slate-600 border-slate-300" },
  { value: "media", label: "Média", color: "bg-amber-50 text-amber-700 border-amber-300" },
  { value: "alta", label: "Alta", color: "bg-orange-50 text-orange-700 border-orange-300" },
  { value: "urgente", label: "Urgente", color: "bg-red-50 text-red-700 border-red-300" },
];

export default function PlanoAcaoGeralPage() {
  const { actionPlanQuestions, addActionPlanQuestion, updateActionPlanQuestion, deleteActionPlanQuestion } = useData();
  const { toast } = useToast();

  const [newQuestion, setNewQuestion] = useState("");
  const [newPriority, setNewPriority] = useState<ActionPlanQuestion["priority"]>("media");
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editPriority, setEditPriority] = useState<ActionPlanQuestion["priority"]>("media");

  const sorted = [...actionPlanQuestions].sort((a, b) => a.ordem - b.ordem);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    setAdding(true);
    try {
      await addActionPlanQuestion({ question: newQuestion.trim(), priority: newPriority, ordem: 0 });
      setNewQuestion("");
      toast("Pergunta adicionada!");
    } catch (err: any) {
      toast(err?.message || "Erro ao adicionar.", "error");
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (q: ActionPlanQuestion) => {
    setEditingId(q.id);
    setEditQuestion(q.question);
    setEditPriority(q.priority);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateActionPlanQuestion(editingId, { question: editQuestion.trim(), priority: editPriority });
    setEditingId(null);
    toast("Pergunta atualizada!");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta pergunta do plano de ação?")) return;
    await deleteActionPlanQuestion(id);
    toast("Pergunta removida.");
  };

  const priorityInfo = (p: ActionPlanQuestion["priority"]) => PRIORITIES.find((x) => x.value === p)!;

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
            <FiCheckSquare size={18} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Plano de Ação Geral</h1>
        </div>
        <p className="text-slate-500 text-sm mt-1">
          Cadastre as perguntas padrão para o checklist de plano de ação geral das AETs. Cada pergunta terá resposta Sim / Não / N.A.
        </p>
      </div>

      {/* Formulário de adição */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Nova Pergunta</h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Descreva a ação ou verificação a ser feita..."
            rows={2}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-sm"
          />
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Prioridade</label>
              <div className="flex gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setNewPriority(p.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      newPriority === p.value ? p.color + " ring-2 ring-offset-1 ring-emerald-400" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 flex justify-end">
              <button
                type="submit"
                disabled={adding || !newQuestion.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <FiPlus size={16} />
                Adicionar
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {sorted.length === 0 ? (
          <div className="text-center py-12 text-slate-400 bg-white border border-slate-200 rounded-xl">
            <FiCheckSquare size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma pergunta cadastrada.</p>
            <p className="text-xs mt-1">Adicione perguntas acima para compor o plano de ação geral.</p>
          </div>
        ) : (
          sorted.map((q, idx) => {
            const pri = priorityInfo(q.priority);
            return (
              <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    {editingId === q.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editQuestion}
                          onChange={(e) => setEditQuestion(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                          autoFocus
                        />
                        <div className="flex items-center gap-2">
                          {PRIORITIES.map((p) => (
                            <button
                              key={p.value}
                              type="button"
                              onClick={() => setEditPriority(p.value)}
                              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                                editPriority === p.value ? p.color + " ring-1 ring-emerald-400" : "bg-white border-slate-200 text-slate-500"
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                          <div className="flex-1" />
                          <button onClick={saveEdit} className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                            <FiCheck size={14} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">
                            <FiX size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-slate-800">{q.question}</p>
                        <span className={`inline-block mt-1.5 px-2 py-0.5 text-xs font-medium rounded-full border ${pri.color}`}>
                          {pri.label}
                        </span>
                      </>
                    )}
                  </div>
                  {editingId !== q.id && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => startEdit(q)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                        <FiEdit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(q.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {sorted.length > 0 && (
        <p className="text-xs text-slate-400 mt-4 text-center">{sorted.length} pergunta(s) cadastrada(s)</p>
      )}
    </div>
  );
}
