"use client";
import { useState } from "react";
import { useData } from "@/contexts/DataContext";
import { AnthroRange } from "@/contexts/DataContext";
import { FiPlus, FiEdit2, FiTrash2, FiX, FiImage, FiZap } from "react-icons/fi";

export default function AnthropometryPage() {
  const { anthroRanges, addAnthroRange, updateAnthroRange, deleteAnthroRange } = useData();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formMin, setFormMin] = useState("");
  const [formMax, setFormMax] = useState("");
  const [formImage, setFormImage] = useState<string | undefined>(undefined);

  const sorted = [...anthroRanges].sort((a, b) => a.minHeight - b.minHeight);

  const openNew = () => {
    setEditingId(null);
    setFormName("");
    setFormMin("");
    setFormMax("");
    setFormImage(undefined);
    setShowModal(true);
  };

  const openEdit = (r: AnthroRange) => {
    setEditingId(r.id);
    setFormName(r.name);
    setFormMin(String(r.minHeight));
    setFormMax(String(r.maxHeight));
    setFormImage(r.image);
    setShowModal(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    const minH = Number(formMin);
    const maxH = Number(formMax);
    if (isNaN(minH) || isNaN(maxH) || minH >= maxH) return;

    if (editingId) {
      await updateAnthroRange(editingId, {
        name: formName,
        minHeight: minH,
        maxHeight: maxH,
        image: formImage,
      });
    } else {
      await addAnthroRange({
        name: formName,
        minHeight: minH,
        maxHeight: maxH,
        image: formImage,
      });
    }
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deseja realmente excluir esta faixa?")) {
      await deleteAnthroRange(id);
    }
  };

  const generateDefaults = async () => {
    if (!confirm("Isso criará faixas de 130 a 200 cm em intervalos de 5 cm. Continuar?")) return;
    for (let min = 130; min < 200; min += 5) {
      await addAnthroRange({
        name: `${min} - ${min + 5} cm`,
        minHeight: min,
        maxHeight: min + 5,
      });
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Antropometria</h1>
      <p className="text-slate-500 text-sm mb-8">Cadastro de faixas de altura</p>

      <div className="flex gap-3 mb-6">
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <FiPlus size={16} /> Nova Faixa
        </button>
        <button
          onClick={generateDefaults}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border border-slate-300"
        >
          <FiZap size={16} /> Gerar faixas padrão (130-200 cm)
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        {sorted.length === 0 ? (
          <p className="text-slate-400 text-sm py-12 text-center">
            Nenhuma faixa cadastrada. Clique em &quot;Nova Faixa&quot; ou gere as faixas padrão.
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Imagem</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Faixa</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    {r.image ? (
                      <img
                        src={r.image}
                        alt={r.name}
                        className="w-[60px] h-[60px] object-cover rounded-lg border border-slate-200"
                      />
                    ) : (
                      <div className="w-[60px] h-[60px] bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center">
                        <FiImage className="text-slate-400" size={20} />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700 text-sm">{r.name || "-"}</td>
                  <td className="px-4 py-3 text-slate-800 font-medium text-sm">
                    {r.minHeight} - {r.maxHeight} cm
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(r)}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <FiEdit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <FiX size={20} />
            </button>
            <h2 className="text-lg font-bold text-slate-800 mb-6">
              {editingId ? "Editar Faixa" : "Nova Faixa"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome (opcional)</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Faixa 170-175"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Altura mínima (cm)</label>
                  <input
                    type="number"
                    value={formMin}
                    onChange={(e) => setFormMin(e.target.value)}
                    placeholder="130"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Altura máxima (cm)</label>
                  <input
                    type="number"
                    value={formMax}
                    onChange={(e) => setFormMax(e.target.value)}
                    placeholder="135"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Imagem</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
                {formImage && (
                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={formImage}
                      alt="Preview"
                      className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                    />
                    <button
                      onClick={() => setFormImage(undefined)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Remover imagem
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
