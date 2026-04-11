"use client";
import { useState } from "react";
import { useData, Avaliador } from "@/contexts/DataContext";
import { FiPlus, FiEdit2, FiTrash2, FiUser, FiChevronRight } from "react-icons/fi";
import { useToast } from "@/components/Toast";
import ViewToggle, { ViewMode } from "@/components/ViewToggle";

const emptyForm = (): Omit<Avaliador, "id"> => ({
  nome: "", cpf: "", formacao: "", registroProfissional: "",
});

function formatCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

export default function AvaliAdoresPage() {
  const { avaliadores, addAvaliador, updateAvaliador, deleteAvaliador } = useData();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Avaliador | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const openNew = () => { setEditing(null); setForm(emptyForm()); setShowModal(true); };
  const openEdit = (a: Avaliador) => {
    setEditing(a);
    setForm({ nome: a.nome, cpf: a.cpf || "", formacao: a.formacao || "", registroProfissional: a.registroProfissional || "" });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setSubmitting(true);
    try {
      if (editing) {
        await updateAvaliador(editing.id, form);
        toast("Avaliador atualizado!");
      } else {
        await addAvaliador(form);
        toast("Avaliador cadastrado!");
      }
      setShowModal(false);
    } catch (err: any) {
      toast(err?.message || "Erro ao salvar.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Avaliadores</h1>
          <p className="text-slate-500 text-sm mt-1">{avaliadores.length} avaliador(es) cadastrado(s)</p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle mode={viewMode} onChange={setViewMode} />
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
          >
            <FiPlus size={18} /> Novo Avaliador
          </button>
        </div>
      </div>

      {avaliadores.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FiUser size={40} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Nenhum avaliador cadastrado.</p>
          <p className="text-slate-400 text-sm mt-1">Cadastre os profissionais que assinam os laudos da AET.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {avaliadores.map((a) => (
            <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <FiUser size={18} className="text-emerald-700" />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(a)}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <FiEdit2 size={15} />
                  </button>
                  <button
                    onClick={() => { if (confirm(`Excluir "${a.nome}"?`)) deleteAvaliador(a.id); }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <FiTrash2 size={15} />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-slate-800">{a.nome}</h3>
              {a.formacao && <p className="text-sm text-slate-600 mt-1">{a.formacao}</p>}
              {a.registroProfissional && <p className="text-xs text-slate-500 mt-1">Registro: {a.registroProfissional}</p>}
              {a.cpf && <p className="text-xs text-slate-400 mt-1">CPF: {a.cpf}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-4 py-3 font-medium text-slate-600">Nome</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Formação</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">Registro</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">CPF</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {avaliadores.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <FiUser size={14} className="text-emerald-700" />
                      </div>
                      <span className="font-medium text-slate-800">{a.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{a.formacao || "—"}</td>
                  <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{a.registroProfissional || "—"}</td>
                  <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{a.cpf || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(a)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Editar"
                      >
                        <FiEdit2 size={14} />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Excluir "${a.nome}"?`)) deleteAvaliador(a.id); }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Excluir"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 w-full max-w-md mx-auto space-y-4">
            <h2 className="text-lg font-semibold text-slate-800">{editing ? "Editar Avaliador" : "Novo Avaliador"}</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo <span className="text-red-500">*</span></label>
              <input required value={form.nome} onChange={set("nome")}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
              <input value={form.cpf} onChange={(e) => setForm((f) => ({ ...f, cpf: formatCpf(e.target.value) }))}
                placeholder="000.000.000-00" maxLength={14}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Formação</label>
              <input value={form.formacao} onChange={set("formacao")} placeholder="Ex: Fisioterapeuta, Ergonomista..."
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Registro Profissional</label>
              <input value={form.registroProfissional} onChange={set("registroProfissional")} placeholder="Ex: CREFITO 123456-F"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50">
                {submitting ? "Salvando..." : editing ? "Salvar" : "Cadastrar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
