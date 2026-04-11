"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useData, ChecklistTemplate } from "@/contexts/DataContext";
import { FiPlus, FiList, FiTrash2, FiEdit2, FiSearch, FiChevronRight } from "react-icons/fi";
import ViewToggle, { ViewMode } from "@/components/ViewToggle";

export default function ChecklistTemplatesPage() {
  const router = useRouter();
  const { templates, blocks, addTemplate, deleteTemplate } = useData();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await addTemplate({ name, blockIds: [] });
    setName("");
    setShowModal(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setName("");
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Tem certeza que deseja excluir este checklist?")) {
      await deleteTemplate(id);
    }
  };

  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Checklists</h1>
          <p className="text-slate-500 text-sm mt-1">
            {templates.length} {templates.length === 1 ? "checklist cadastrado" : "checklists cadastrados"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle mode={viewMode} onChange={setViewMode} />
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
          >
            <FiPlus size={18} />
            Novo Checklist
          </button>
        </div>
      </div>

      {templates.length > 0 && (
        <div className="relative mb-6">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar checklist pelo nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
          />
        </div>
      )}

      {templates.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <FiList size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">Nenhum checklist criado ainda.</p>
          <p className="text-sm mt-1">Clique em &quot;Novo Checklist&quot; para começar.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FiSearch size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhum checklist encontrado para &ldquo;{search}&rdquo;.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((template) => {
            const blockCount = template.blockIds.length;
            const totalQ = template.blockIds
              .map((bid) => blocks.find((b) => b.id === bid))
              .reduce((sum, b) => sum + (b?.questions.length ?? 0), 0);
            return (
              <div
                key={template.id}
                onClick={() => router.push(`/checklist-templates/${template.id}`)}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md hover:border-emerald-300 cursor-pointer transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center transition-colors shrink-0">
                    <FiList size={18} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/checklist-templates/${template.id}`); }}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <FiEdit2 size={15} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, template.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <FiTrash2 size={15} />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors mt-3 leading-tight">
                  {template.name}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {blockCount} {blockCount === 1 ? "bloco" : "blocos"} · {totalQ} perguntas
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-4 py-3 font-medium text-slate-600">Checklist</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">Blocos</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Perguntas</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((template) => {
                const blockCount = template.blockIds.length;
                const totalQ = template.blockIds
                  .map((bid) => blocks.find((b) => b.id === bid))
                  .reduce((sum, b) => sum + (b?.questions.length ?? 0), 0);
                return (
                  <tr
                    key={template.id}
                    onClick={() => router.push(`/checklist-templates/${template.id}`)}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800 group-hover:text-emerald-700 transition-colors">
                      {template.name}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{blockCount}</td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{totalQ}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/checklist-templates/${template.id}`); }}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Editar"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, template.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Excluir"
                        >
                          <FiTrash2 size={14} />
                        </button>
                        <FiChevronRight size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form
            onSubmit={handleCreate}
            className="bg-white rounded-2xl p-8 w-full max-w-md mx-4 space-y-4"
          >
            <h2 className="text-lg font-semibold text-slate-800">Novo Checklist</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome do checklist</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Checklist NR-17, Ergonomia Escritório..."
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={closeModal}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button type="submit"
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium">
                Criar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
