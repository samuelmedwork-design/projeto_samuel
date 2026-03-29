"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useData, BlockQuestion, QuestionType } from "@/contexts/DataContext";
import { v4 as uuidv4 } from "uuid";
import {
  FiArrowLeft,
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiChevronUp,
  FiChevronDown,
  FiCheck,
  FiX,
  FiImage,
} from "react-icons/fi";

const DEFAULT_OPTIONS = [
  { label: "Atende" },
  { label: "Não atende" },
  { label: "Não se aplica" },
];

export default function BlockEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { blocks, updateBlock } = useData();

  const blockId = params.id as string;
  const block = blocks.find((b) => b.id === blockId);

  // Block name editing
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  // New question form
  const [showForm, setShowForm] = useState(false);
  const [qText, setQText] = useState("");
  const [qType, setQType] = useState<QuestionType>("marcacao");
  const [qUnit, setQUnit] = useState("");
  const [qOptions, setQOptions] = useState<{ label: string }[]>([...DEFAULT_OPTIONS]);

  // Edit question
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editType, setEditType] = useState<QuestionType>("marcacao");
  const [editUnit, setEditUnit] = useState("");
  const [editOptions, setEditOptions] = useState<{ label: string }[]>([]);

  useEffect(() => {
    if (block) setNameValue(block.name);
  }, [block]);

  if (!block) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p className="text-lg">Bloco não encontrado.</p>
        <button
          onClick={() => router.push("/blocks")}
          className="mt-4 text-emerald-600 hover:underline"
        >
          Voltar para Biblioteca de Blocos
        </button>
      </div>
    );
  }

  const questions = [...block.questions].sort((a, b) => a.order - b.order);

  // ── Name ──────────────────────────────────────────────────────────
  const saveName = async () => {
    if (nameValue.trim()) {
      await updateBlock(blockId, { name: nameValue.trim() });
    }
    setEditingName(false);
  };

  // ── Image ─────────────────────────────────────────────────────────
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      await updateBlock(blockId, { image: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  // ── Add question ──────────────────────────────────────────────────
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const newQ: BlockQuestion = {
      id: uuidv4(),
      text: qText,
      type: qType,
      order: questions.length + 1,
      ...(qType === "numerico" ? { unit: qUnit } : { options: qOptions.filter((o) => o.label.trim()) }),
    };
    await updateBlock(blockId, { questions: [...block.questions, newQ] });
    resetForm();
  };

  const resetForm = () => {
    setShowForm(false);
    setQText("");
    setQType("marcacao");
    setQUnit("");
    setQOptions([...DEFAULT_OPTIONS]);
  };

  // ── Edit question ─────────────────────────────────────────────────
  const startEdit = (q: BlockQuestion) => {
    setEditingId(q.id);
    setEditText(q.text);
    setEditType(q.type);
    setEditUnit(q.unit || "");
    setEditOptions(q.options ? [...q.options] : [...DEFAULT_OPTIONS]);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const updated = block.questions.map((q) =>
      q.id === editingId
        ? {
            ...q,
            text: editText,
            type: editType,
            ...(editType === "numerico"
              ? { unit: editUnit, options: undefined }
              : { options: editOptions.filter((o) => o.label.trim()), unit: undefined }),
          }
        : q
    );
    await updateBlock(blockId, { questions: updated });
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  // ── Delete question ───────────────────────────────────────────────
  const deleteQuestion = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta pergunta?")) return;
    const filtered = block.questions
      .filter((q) => q.id !== id)
      .map((q, i) => ({ ...q, order: i + 1 }));
    await updateBlock(blockId, { questions: filtered });
  };

  // ── Reorder ───────────────────────────────────────────────────────
  const moveQuestion = async (id: string, direction: "up" | "down") => {
    const sorted = [...block.questions].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((q) => q.id === id);
    if (direction === "up" && idx <= 0) return;
    if (direction === "down" && idx >= sorted.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const temp = sorted[idx].order;
    sorted[idx] = { ...sorted[idx], order: sorted[swapIdx].order };
    sorted[swapIdx] = { ...sorted[swapIdx], order: temp };

    await updateBlock(blockId, { questions: sorted });
  };

  // ── Options helpers (for new question form) ───────────────────────
  const addOption = () => setQOptions([...qOptions, { label: "" }]);
  const removeOption = (i: number) => setQOptions(qOptions.filter((_, idx) => idx !== i));
  const updateOption = (i: number, label: string) =>
    setQOptions(qOptions.map((o, idx) => (idx === i ? { label } : o)));

  // ── Options helpers (for edit form) ───────────────────────────────
  const addEditOption = () => setEditOptions([...editOptions, { label: "" }]);
  const removeEditOption = (i: number) => setEditOptions(editOptions.filter((_, idx) => idx !== i));
  const updateEditOption = (i: number, label: string) =>
    setEditOptions(editOptions.map((o, idx) => (idx === i ? { label } : o)));

  return (
    <div className="p-8 max-w-4xl">
      {/* Back button */}
      <button
        onClick={() => router.push("/blocks")}
        className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors mb-6 text-sm"
      >
        <FiArrowLeft size={16} />
        Voltar para Biblioteca de Blocos
      </button>

      {/* Block header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Image */}
          <div className="relative w-full sm:w-48 h-40 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center group">
            {block.image ? (
              <img src={block.image} alt={block.name} className="w-full h-full object-cover" />
            ) : (
              <FiImage size={40} className="text-slate-300" />
            )}
            <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <span className="text-white text-sm font-medium">Alterar imagem</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Name */}
          <div className="flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  className="text-2xl font-bold text-slate-800 border-b-2 border-emerald-500 outline-none bg-transparent flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                />
                <button onClick={saveName} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                  <FiCheck size={18} />
                </button>
                <button onClick={() => setEditingName(false)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg">
                  <FiX size={18} />
                </button>
              </div>
            ) : (
              <h1
                onClick={() => setEditingName(true)}
                className="text-2xl font-bold text-slate-800 cursor-pointer hover:text-emerald-700 transition-colors"
                title="Clique para editar o nome"
              >
                {block.name}
                <FiEdit2 size={16} className="inline ml-2 text-slate-400" />
              </h1>
            )}
            <p className="text-slate-500 text-sm mt-2">
              {questions.length} {questions.length === 1 ? "pergunta" : "perguntas"} neste bloco
            </p>
          </div>
        </div>
      </div>

      {/* Questions list */}
      <div className="space-y-3 mb-6">
        {questions.length === 0 && !showForm && (
          <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200">
            <p>Nenhuma pergunta adicionada ainda.</p>
          </div>
        )}

        {questions.map((q, idx) => (
          <div
            key={q.id}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-4"
          >
            {editingId === q.id ? (
              /* ── Inline edit form ──────────────────────────────── */
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Enunciado</label>
                  <input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={editType === "marcacao"}
                        onChange={() => setEditType("marcacao")}
                        className="accent-emerald-600"
                      />
                      <span className="text-sm text-slate-700">Marcação</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={editType === "numerico"}
                        onChange={() => setEditType("numerico")}
                        className="accent-emerald-600"
                      />
                      <span className="text-sm text-slate-700">Numérico</span>
                    </label>
                  </div>
                </div>
                {editType === "numerico" ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Unidade</label>
                    <input
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value)}
                      placeholder="Ex: cm, dB, lux"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Opções</label>
                    <div className="space-y-2">
                      {editOptions.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input
                            value={opt.label}
                            onChange={(e) => updateEditOption(oi, e.target.value)}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => removeEditOption(oi)}
                            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <FiX size={16} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addEditOption}
                        className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        + Adicionar opção
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={saveEdit}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              /* ── Question display ─────────────────────────────── */
              <div className="flex items-start gap-3">
                {/* Reorder buttons */}
                <div className="flex flex-col gap-0.5 pt-0.5">
                  <button
                    onClick={() => moveQuestion(q.id, "up")}
                    disabled={idx === 0}
                    className="p-1 text-slate-400 hover:text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <FiChevronUp size={16} />
                  </button>
                  <button
                    onClick={() => moveQuestion(q.id, "down")}
                    disabled={idx === questions.length - 1}
                    className="p-1 text-slate-400 hover:text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <FiChevronDown size={16} />
                  </button>
                </div>

                {/* Order number */}
                <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {q.order}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 font-medium">{q.text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        q.type === "marcacao"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {q.type === "marcacao" ? "Marcação" : "Numérico"}
                    </span>
                    {q.type === "numerico" && q.unit && (
                      <span className="text-xs text-slate-500">Unidade: {q.unit}</span>
                    )}
                    {q.type === "marcacao" && q.options && (
                      <span className="text-xs text-slate-500">
                        {q.options.length} {q.options.length === 1 ? "opção" : "opções"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => startEdit(q)}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Editar pergunta"
                  >
                    <FiEdit2 size={16} />
                  </button>
                  <button
                    onClick={() => deleteQuestion(q.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir pergunta"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add question form */}
      {showForm ? (
        <form
          onSubmit={handleAddQuestion}
          className="bg-white rounded-xl shadow-sm border border-emerald-200 p-6 space-y-4"
        >
          <h3 className="text-lg font-semibold text-slate-800">Nova Pergunta</h3>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Enunciado da pergunta
            </label>
            <input
              required
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              placeholder="Ex: A altura da mesa é adequada?"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={qType === "marcacao"}
                  onChange={() => setQType("marcacao")}
                  className="accent-emerald-600"
                />
                <span className="text-sm text-slate-700">Marcação</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={qType === "numerico"}
                  onChange={() => setQType("numerico")}
                  className="accent-emerald-600"
                />
                <span className="text-sm text-slate-700">Numérico</span>
              </label>
            </div>
          </div>

          {qType === "numerico" ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unidade</label>
              <input
                value={qUnit}
                onChange={(e) => setQUnit(e.target.value)}
                placeholder="Ex: cm, dB, lux"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Opções</label>
              <div className="space-y-2">
                {qOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={opt.label}
                      onChange={(e) => updateOption(i, e.target.value)}
                      placeholder={`Opção ${i + 1}`}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <FiX size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addOption}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  + Adicionar opção
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
            >
              Adicionar Pergunta
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium text-sm transition-colors"
        >
          <FiPlus size={18} />
          Adicionar Pergunta
        </button>
      )}
    </div>
  );
}
