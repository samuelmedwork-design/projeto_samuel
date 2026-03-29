"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useData, ChecklistBlock, ChecklistTemplate } from "@/contexts/DataContext";
import {
  FiArrowLeft,
  FiChevronUp,
  FiChevronDown,
  FiX,
  FiPlus,
} from "react-icons/fi";

export default function TemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { blocks, templates, updateTemplate } = useData();

  const templateId = params.id as string;
  const template = templates.find((t) => t.id === templateId);

  const [name, setName] = useState("");
  const [blockIds, setBlockIds] = useState<string[]>([]);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setBlockIds(template.blockIds);
    }
  }, [template]);

  if (!template) {
    return (
      <div className="p-8 text-center text-slate-500">
        Checklist não encontrado.
      </div>
    );
  }

  const save = async (updatedName: string, updatedBlockIds: string[]) => {
    await updateTemplate(templateId, { name: updatedName, blockIds: updatedBlockIds });
  };

  const handleNameChange = (newName: string) => {
    setName(newName);
    save(newName, blockIds);
  };

  const addBlock = (blockId: string) => {
    const updated = [...blockIds, blockId];
    setBlockIds(updated);
    save(name, updated);
  };

  const removeBlock = (index: number) => {
    const updated = blockIds.filter((_, i) => i !== index);
    setBlockIds(updated);
    save(name, updated);
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blockIds.length) return;
    const updated = [...blockIds];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setBlockIds(updated);
    save(name, updated);
  };

  // Blocks already in the checklist (resolved)
  const selectedBlocks = blockIds
    .map((id) => blocks.find((b) => b.id === id))
    .filter(Boolean) as ChecklistBlock[];

  // Blocks available to add (not yet in the checklist)
  const availableBlocks = blocks.filter((b) => !blockIds.includes(b.id));

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push("/checklist-templates")}
          className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
          title="Voltar"
        >
          <FiArrowLeft size={20} />
        </button>
        <input
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="text-2xl font-bold text-slate-800 bg-transparent border-b-2 border-transparent focus:border-emerald-500 outline-none flex-1 py-1"
          placeholder="Nome do checklist"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Panel - Selected Blocks */}
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Blocos no Checklist
          </h2>
          {selectedBlocks.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-400">
              <p>Nenhum bloco adicionado.</p>
              <p className="text-sm mt-1">
                Adicione blocos da biblioteca ao lado.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedBlocks.map((block, index) => (
                <div
                  key={`${block.id}-${index}`}
                  className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 shadow-sm"
                >
                  {/* Reorder arrows */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveBlock(index, "up")}
                      disabled={index === 0}
                      className="p-1 text-slate-400 hover:text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                      title="Mover para cima"
                    >
                      <FiChevronUp size={16} />
                    </button>
                    <button
                      onClick={() => moveBlock(index, "down")}
                      disabled={index === selectedBlocks.length - 1}
                      className="p-1 text-slate-400 hover:text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                      title="Mover para baixo"
                    >
                      <FiChevronDown size={16} />
                    </button>
                  </div>

                  {/* Block info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-800 truncate">
                      {block.name}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {block.questions.length}{" "}
                      {block.questions.length === 1 ? "pergunta" : "perguntas"}
                    </p>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => removeBlock(index)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remover bloco"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel - Available Blocks */}
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Biblioteca de Blocos
          </h2>
          {availableBlocks.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-400">
              <p>
                {blocks.length === 0
                  ? "Nenhum bloco disponível."
                  : "Todos os blocos já foram adicionados."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableBlocks.map((block) => (
                <div
                  key={block.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-800 truncate">
                      {block.name}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {block.questions.length}{" "}
                      {block.questions.length === 1 ? "pergunta" : "perguntas"}
                    </p>
                  </div>
                  <button
                    onClick={() => addBlock(block.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium"
                  >
                    <FiPlus size={14} />
                    Adicionar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
