"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useData, ChecklistTemplate, ChecklistBlock } from "@/contexts/DataContext";
import { FiPlus, FiList, FiTrash2, FiEdit2 } from "react-icons/fi";

export default function ChecklistTemplatesPage() {
  const router = useRouter();
  const { templates, blocks, addTemplate, deleteTemplate } = useData();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await addTemplate({ name, blockIds: [] });
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

  const getBlockCount = (template: ChecklistTemplate) => {
    return template.blockIds.length;
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Checklists</h1>
          <p className="text-slate-500 text-sm mt-1">
            {templates.length}{" "}
            {templates.length === 1 ? "checklist cadastrado" : "checklists cadastrados"}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
        >
          <FiPlus size={18} />
          Novo Checklist
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <FiList size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">Nenhum checklist criado ainda.</p>
          <p className="text-sm mt-1">
            Clique em &quot;Novo Checklist&quot; para começar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {templates.map((template) => {
            const blockCount = getBlockCount(template);
            return (
              <div
                key={template.id}
                onClick={() => router.push(`/checklist-templates/${template.id}`)}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md hover:border-emerald-300 cursor-pointer transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors truncate">
                      {template.name}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {blockCount} {blockCount === 1 ? "bloco" : "blocos"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/checklist-templates/${template.id}`);
                      }}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Editar checklist"
                    >
                      <FiEdit2 size={16} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, template.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir checklist"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form
            onSubmit={handleCreate}
            className="bg-white rounded-2xl p-8 w-full max-w-md mx-4 space-y-4"
          >
            <h2 className="text-lg font-semibold text-slate-800">
              Novo Checklist
            </h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nome do checklist
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Checklist NR-17, Ergonomia Escritório..."
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
              >
                Criar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
