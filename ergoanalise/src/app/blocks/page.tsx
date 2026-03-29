"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useData, ChecklistBlock, BlockQuestion } from "@/contexts/DataContext";
import { FiPlus, FiImage, FiGrid, FiTrash2, FiSearch } from "react-icons/fi";
import { v4 as uuidv4 } from "uuid";

export default function BlocksPage() {
  const router = useRouter();
  const { blocks, addBlock, deleteBlock } = useData();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [image, setImage] = useState<string | undefined>(undefined);
  const [nr17Success, setNr17Success] = useState(false);
  const [search, setSearch] = useState("");

  const filteredBlocks = blocks.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  const marcacaoOpts = [{ label: "Atende" }, { label: "Não atende" }, { label: "Não se aplica" }];

  const makeQ = (text: string, type: "marcacao" | "numerico", order: number, unit?: string): BlockQuestion => ({
    id: uuidv4(),
    text,
    type,
    order,
    ...(type === "marcacao" ? { options: marcacaoOpts } : {}),
    ...(unit ? { unit } : {}),
  });

  const handleImportNR17 = async () => {
    if (!confirm("Deseja importar os 5 blocos pré-configurados da NR-17? Isso criará novos blocos na sua biblioteca.")) return;

    try {
    // Bloco 1: Monitor
    await addBlock({
      name: "Monitor",
      questions: [
        makeQ("Monitor posicionado na altura dos olhos", "marcacao", 0),
        makeQ("Presença de filtro antirreflexo", "marcacao", 1),
        makeQ("Monitor posicionado no eixo visual do trabalhador", "marcacao", 2),
        makeQ("Ângulo de visão adequado (15° a 20°)", "marcacao", 3),
        makeQ("Monitor posicionado frontalmente ao usuário", "marcacao", 4),
        makeQ("Distância adequada entre olhos e tela (50 a 75 cm)", "marcacao", 5),
      ],
    });

    // Bloco 2: Mesa / Superfície de Trabalho
    await addBlock({
      name: "Mesa / Superfície de Trabalho",
      questions: [
        makeQ("Altura da mesa", "numerico", 0, "cm"),
        makeQ("Profundidade da mesa", "numerico", 1, "cm"),
        makeQ("Largura da mesa", "numerico", 2, "cm"),
        makeQ("Espaço livre para pernas sob a mesa", "marcacao", 3),
        makeQ("Bordas arredondadas", "marcacao", 4),
        makeQ("Superfície fosca (sem reflexos)", "marcacao", 5),
      ],
    });

    // Bloco 3: Assento
    await addBlock({
      name: "Assento",
      questions: [
        makeQ("Altura do assento regulável", "marcacao", 0),
        makeQ("Apoio lombar presente e ajustável", "marcacao", 1),
        makeQ("Apoio de braços regulável", "marcacao", 2),
        makeQ("Profundidade do assento adequada ao biótipo", "marcacao", 3),
        makeQ("Base com 5 patas e rodízios", "marcacao", 4),
        makeQ("Estofamento em bom estado", "marcacao", 5),
        makeQ("Apoio para os pés disponível quando necessário", "marcacao", 6),
      ],
    });

    // Bloco 4: Teclado e Mouse
    await addBlock({
      name: "Teclado e Mouse",
      questions: [
        makeQ("Teclado independente do monitor", "marcacao", 0),
        makeQ("Mouse independente do teclado", "marcacao", 1),
        makeQ("Alinhamento dos dispositivos com o eixo do corpo", "marcacao", 2),
        makeQ("Apoio para punhos durante digitação", "marcacao", 3),
        makeQ("Postura de punhos neutra durante uso", "marcacao", 4),
        makeQ("Ombros relaxados durante digitação", "marcacao", 5),
      ],
    });

    // Bloco 5: Avaliação Ambiental
    await addBlock({
      name: "Avaliação Ambiental",
      questions: [
        makeQ("Ruído", "numerico", 0, "dB"),
        makeQ("Iluminação", "numerico", 1, "lux"),
        makeQ("Umidade relativa", "numerico", 2, "%"),
        makeQ("Velocidade do ar", "numerico", 3, "m/s"),
        makeQ("Temperatura", "numerico", 4, "°C"),
      ],
    });

    setNr17Success(true);
    setTimeout(() => setNr17Success(false), 4000);
    } catch (err: any) {
      alert("Erro ao importar blocos: " + (err.message || "Tente novamente"));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addBlock({ name, image, questions: [] });
      setName("");
      setImage(undefined);
      setShowModal(false);
    } catch (err: any) {
      alert("Erro ao criar bloco: " + (err.message || "Tente novamente"));
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setName("");
    setImage(undefined);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Tem certeza que deseja excluir este bloco?")) {
      await deleteBlock(id);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Biblioteca de Blocos</h1>
          <p className="text-slate-500 text-sm mt-1">
            {blocks.length} {blocks.length === 1 ? "bloco cadastrado" : "blocos cadastrados"}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleImportNR17}
            className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-lg hover:bg-amber-600 transition-colors font-medium text-sm"
          >
            <FiGrid size={18} />
            Importar Blocos NR-17
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
          >
            <FiPlus size={18} />
            Novo Bloco
          </button>
        </div>
      </div>

      {nr17Success && (
        <div className="mb-6 bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-lg text-sm font-medium">
          5 blocos NR-17 importados com sucesso!
        </div>
      )}

      {/* Busca */}
      {blocks.length > 0 && (
        <div className="relative mb-6">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar bloco pelo nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
          />
        </div>
      )}

      {blocks.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <FiGrid size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">Nenhum bloco criado ainda.</p>
          <p className="text-sm mt-1">Clique em &quot;Novo Bloco&quot; para começar.</p>
        </div>
      ) : filteredBlocks.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FiSearch size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhum bloco encontrado para &ldquo;{search}&rdquo;.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {filteredBlocks.map((block) => (
            <div
              key={block.id}
              onClick={() => router.push(`/blocks/${block.id}`)}
              className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-md hover:border-emerald-300 cursor-pointer transition-all group"
            >
              <div className="h-24 bg-slate-100 flex items-center justify-center overflow-hidden">
                {block.image ? (
                  <img
                    src={block.image}
                    alt={block.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FiImage size={24} className="text-slate-300" />
                )}
              </div>
              <div className="p-2.5">
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800 text-xs leading-tight group-hover:text-emerald-700 transition-colors truncate">
                      {block.name}
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {block.questions.length} {block.questions.length === 1 ? "pergunta" : "perguntas"}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, block.id)}
                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0"
                    title="Excluir bloco"
                  >
                    <FiTrash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form
            onSubmit={handleCreate}
            className="bg-white rounded-2xl p-8 w-full max-w-md mx-4 space-y-4"
          >
            <h2 className="text-lg font-semibold text-slate-800">Novo Bloco</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nome do bloco
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Mobiliário, Iluminação..."
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Imagem ilustrativa (opcional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-colors"
              />
              {image && (
                <div className="mt-3 rounded-lg overflow-hidden border border-slate-200">
                  <img src={image} alt="Preview" className="w-full h-32 object-cover" />
                </div>
              )}
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
