"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useData } from "@/contexts/DataContext";
import { FiPlus, FiTrash2 } from "react-icons/fi";

const priorityColors = {
  alta: "bg-red-100 text-red-700",
  media: "bg-amber-100 text-amber-700",
  baixa: "bg-blue-100 text-blue-700",
};

const statusColors = {
  pendente: "bg-slate-100 text-slate-600",
  em_andamento: "bg-amber-100 text-amber-700",
  concluido: "bg-emerald-100 text-emerald-700",
};

const statusLabels = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

export default function ActionPlanPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const { companies, actions, addAction, updateAction, deleteAction } = useData();
  const company = companies.find((c) => c.id === companyId);

  const [showForm, setShowForm] = useState(false);
  const [recommendation, setRecommendation] = useState("");
  const [priority, setPriority] = useState<"alta" | "media" | "baixa">("media");
  const [responsible, setResponsible] = useState("");
  const [deadline, setDeadline] = useState("");

  const companyActions = actions.filter((a) => a.companyId === companyId);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addAction({
      companyId,
      recommendation,
      priority,
      responsible,
      status: "pendente",
      deadline,
    });
    setRecommendation(""); setResponsible(""); setDeadline("");
    setShowForm(false);
  };

  if (!company) return <div className="p-8 text-slate-500">Empresa não encontrada.</div>;

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Plano de Ação Ergonômico</h1>
          <p className="text-slate-500 text-sm mt-1">{company.name}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
        >
          <FiPlus size={18} />
          Adicionar Recomendação
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl border border-slate-200 p-6 mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Recomendação</label>
            <textarea required value={recommendation} onChange={(e) => setRecommendation(e.target.value)} rows={3}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
              placeholder="Descreva a ação ergonômica recomendada..." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prioridade</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Responsável</label>
              <input required value={responsible} onChange={(e) => setResponsible(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Nome do responsável" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prazo</label>
              <input type="date" required value={deadline} onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button type="submit"
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors">
              Salvar
            </button>
          </div>
        </form>
      )}

      {companyActions.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p>Nenhuma ação cadastrada ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {companyActions.map((action) => (
            <div key={action.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-slate-800 font-medium mb-2">{action.recommendation}</p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${priorityColors[action.priority]}`}>
                      {action.priority.charAt(0).toUpperCase() + action.priority.slice(1)}
                    </span>
                    <select
                      value={action.status}
                      onChange={async (e) => await updateAction(action.id, { status: e.target.value as typeof action.status })}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer ${statusColors[action.status]}`}
                    >
                      <option value="pendente">Pendente</option>
                      <option value="em_andamento">Em andamento</option>
                      <option value="concluido">Concluído</option>
                    </select>
                    <span className="text-xs text-slate-400">|</span>
                    <span className="text-xs text-slate-500">Resp: {action.responsible}</span>
                    <span className="text-xs text-slate-400">|</span>
                    <span className="text-xs text-slate-500">Prazo: {new Date(action.deadline).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
                <button
                  onClick={async () => await deleteAction(action.id)}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
