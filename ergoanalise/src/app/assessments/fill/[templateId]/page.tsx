"use client";
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useData } from "@/contexts/DataContext";
import type { FilledAnswer, FilledBlock, ChecklistBlock } from "@/contexts/DataContext";
import { FiArrowLeft, FiSave, FiCheck, FiAlertTriangle, FiCamera, FiX, FiRefreshCw } from "react-icons/fi";

export default function AssessmentFillPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { templates, blocks, companies, sectors, positions, addAssessment } = useData();

  const templateId = params.templateId as string;
  const template = templates.find((t) => t.id === templateId);

  const templateBlocks: ChecklistBlock[] = useMemo(() => {
    if (!template) return [];
    return template.blockIds
      .map((bid) => blocks.find((b) => b.id === bid))
      .filter(Boolean) as ChecklistBlock[];
  }, [template, blocks]);

  // ── Identificação via query params ────────────────────────────────────────
  const companyId = searchParams.get("company") || "";
  const positionIds = useMemo(
    () => (searchParams.get("positions") || "").split(",").filter(Boolean),
    [searchParams]
  );

  // Deriva os setores a partir dos cargos selecionados
  const uniqueSectorIds = useMemo(
    () => [...new Set(positionIds.map((pid) => positions.find((p) => p.id === pid)?.sectorId).filter(Boolean) as string[])],
    [positionIds, positions]
  );

  // ── Chave do rascunho ─────────────────────────────────────────────────────
  const DRAFT_KEY = `assessment_draft_${templateId}_${companyId}_${[...positionIds].sort().join(",")}`;

  // ── Estado do formulário ──────────────────────────────────────────────────
  const [workstation, setWorkstation] = useState("");
  const [observedWorker, setObservedWorker] = useState("");
  const [answers, setAnswers] = useState<Record<string, { value: string; evidence: string; recommendation: string }>>({});
  const [blockRecs, setBlockRecs] = useState<Record<string, string>>({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [workstationPhoto, setWorkstationPhoto] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  // ── Restaurar rascunho do localStorage ───────────────────────────────────
  useEffect(() => {
    if (!templateId || !companyId || positionIds.length === 0) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.answers) setAnswers(draft.answers);
      if (draft.blockRecs) setBlockRecs(draft.blockRecs);
      if (draft.generalNotes !== undefined) setGeneralNotes(draft.generalNotes);
      if (draft.workstation !== undefined) setWorkstation(draft.workstation);
      if (draft.observedWorker !== undefined) setObservedWorker(draft.observedWorker);
      if (draft.workstationPhoto) setWorkstationPhoto(draft.workstationPhoto);
      setHasDraft(true);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-save no localStorage ─────────────────────────────────────────────
  useEffect(() => {
    if (!templateId || !companyId || positionIds.length === 0) return;
    const draft = { answers, blockRecs, generalNotes, workstation, observedWorker, workstationPhoto };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, blockRecs, generalNotes, workstation, observedWorker, workstationPhoto]);

  // ── Helpers de respostas ──────────────────────────────────────────────────
  const getAnswer = (blockId: string, questionId: string) => {
    const key = `${blockId}::${questionId}`;
    return answers[key] ?? { value: "", evidence: "", recommendation: "" };
  };

  const setAnswer = (blockId: string, questionId: string, updates: Partial<{ value: string; evidence: string; recommendation: string }>) => {
    const key = `${blockId}::${questionId}`;
    setAnswers((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? { value: "", evidence: "", recommendation: "" }), ...updates },
    }));
  };

  const getBlockRec = (blockId: string) => blockRecs[blockId] ?? "";
  const setBlockRec = (blockId: string, value: string) =>
    setBlockRecs((prev) => ({ ...prev, [blockId]: value }));

  // ── Foto do posto (única por avaliação) ───────────────────────────────────
  const photoInputRef = useRef<HTMLInputElement>(null);

  const resizeImage = useCallback((file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const MAX_WIDTH = 800;
          let { width, height } = img;
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeImage(file);
    setWorkstationPhoto(dataUrl);
    e.target.value = "";
  };

  // ── Não conformidades ─────────────────────────────────────────────────────
  const nonConformities = useMemo(() => {
    const items: { blockName: string; questionText: string; evidence: string; recommendation: string }[] = [];
    for (const block of templateBlocks) {
      for (const q of block.questions) {
        if (q.type === "marcacao") {
          const ans = getAnswer(block.id, q.id);
          if (ans.value.toLowerCase().includes("não") && !ans.value.toLowerCase().includes("não se aplica")) {
            items.push({ blockName: block.name, questionText: q.text, evidence: ans.evidence, recommendation: ans.recommendation });
          }
        }
      }
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, templateBlocks]);

  // ── Salvar avaliação ──────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!companyId || positionIds.length === 0 || !template) return;

    const filledBlocks: FilledBlock[] = templateBlocks.map((block) => {
      const filledAnswers: FilledAnswer[] = block.questions.map((q) => {
        const ans = getAnswer(block.id, q.id);
        const fa: FilledAnswer = { questionId: q.id, questionText: q.text, type: q.type, value: ans.value };
        if (q.type === "marcacao" && ans.value.toLowerCase().includes("não") && !ans.value.toLowerCase().includes("não se aplica")) {
          fa.evidence = ans.evidence;
          fa.recommendation = ans.recommendation;
        }
        return fa;
      });
      return { blockId: block.id, blockName: block.name, image: block.image, answers: filledAnswers, blockRecommendation: getBlockRec(block.id) };
    });

    // Foto do posto e observações gerais são codificadas juntas em general_notes
    const savedNotes = workstationPhoto
      ? JSON.stringify({ notes: generalNotes, workstationPhoto })
      : generalNotes;

    // Cria uma avaliação para cada cargo, usando o sectorId do próprio cargo
    for (const posId of positionIds) {
      const posObj = positions.find((p) => p.id === posId);
      await addAssessment({
        companyId,
        sectorId: posObj?.sectorId || uniqueSectorIds[0] || "",
        positionId: posId,
        templateId,
        templateName: template.name,
        workstation,
        observedWorker,
        filledBlocks,
        generalNotes: savedNotes,
      });
    }

    // Limpa rascunho após salvar com sucesso
    localStorage.removeItem(DRAFT_KEY);
    setSaved(true);
  };

  const discardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setAnswers({});
    setBlockRecs({});
    setGeneralNotes("");
    setWorkstation("");
    setObservedWorker("");
    setWorkstationPhoto("");
    setHasDraft(false);
  };

  // ── Template não encontrado ───────────────────────────────────────────────
  if (!template) {
    return <div className="p-8 text-center text-slate-500">Checklist não encontrado.</div>;
  }

  // ── Tela de sucesso ───────────────────────────────────────────────────────
  if (saved) {
    return (
      <div className="p-8 max-w-4xl">
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <FiCheck size={18} />
          <span className="font-medium">Avaliação salva com sucesso!</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-2">Resumo de Não Conformidades</h1>
        <p className="text-slate-500 text-sm mb-6">
          {nonConformities.length === 0
            ? "Nenhuma não conformidade foi identificada nesta avaliação."
            : `${nonConformities.length} não conformidade(s) identificada(s).`}
        </p>

        {nonConformities.length > 0 && (
          <div className="space-y-4 mb-8">
            {nonConformities.map((nc, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-red-200 p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-red-600 text-xs font-bold">{idx + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">
                      <span className="text-slate-400">[{nc.blockName}]</span> {nc.questionText}
                    </p>
                    {nc.evidence && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Evidência observada</p>
                        <p className="text-sm text-slate-700 mt-0.5">{nc.evidence}</p>
                      </div>
                    )}
                    {nc.recommendation && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Recomendação técnica</p>
                        <p className="text-sm text-slate-700 mt-0.5">{nc.recommendation}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => router.push("/assessments")}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            Voltar às Avaliações
          </button>
          <button
            onClick={() => router.push(`/assessments/fill/${templateId}`)}
            className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-medium hover:bg-slate-50 transition-colors"
          >
            Nova Avaliação com este Checklist
          </button>
        </div>
      </div>
    );
  }

  // ── Formulário principal ──────────────────────────────────────────────────
  return (
    <div className="p-8 max-w-4xl">
      {/* Input oculto para foto do posto */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoCapture}
        className="hidden"
      />

      {/* Aviso de rascunho recuperado */}
      {hasDraft && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-700">
            <FiRefreshCw size={16} />
            <span className="text-sm font-medium">Rascunho recuperado — suas respostas anteriores foram restauradas.</span>
          </div>
          <button
            onClick={discardDraft}
            className="text-xs text-amber-600 hover:text-amber-800 underline whitespace-nowrap"
          >
            Descartar rascunho
          </button>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push("/assessments")}
          className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
          title="Voltar"
        >
          <FiArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{template.name}</h1>
          <p className="text-slate-500 text-sm">Preencha a avaliação de campo</p>
        </div>
      </div>

      {/* ── Identificação ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="font-semibold text-slate-800 mb-4">Identificação</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-0.5">Empresa</label>
            <p className="text-sm font-medium text-slate-800">
              {companies.find((c) => c.id === companyId)?.name || "—"}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-0.5">Setor(es)</label>
            <div className="flex flex-wrap gap-1">
              {uniqueSectorIds.map((sid) => (
                <span key={sid} className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded">
                  {sectors.find((s) => s.id === sid)?.name || sid}
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-0.5">Cargo(s)</label>
            <div className="flex flex-wrap gap-1">
              {positionIds.map((pid) => (
                <span key={pid} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">
                  {positions.find((p) => p.id === pid)?.name || pid}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Posto de trabalho</label>
            <input
              value={workstation}
              onChange={(e) => setWorkstation(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Descreva o posto de trabalho"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Trabalhador observado</label>
            <input
              value={observedWorker}
              onChange={(e) => setObservedWorker(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Nome do trabalhador observado"
            />
          </div>
        </div>

        {/* Foto do posto */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Foto do posto de trabalho</label>
          {workstationPhoto ? (
            <div className="relative inline-block">
              <img
                src={workstationPhoto}
                alt="Foto do posto"
                className="h-40 w-auto object-cover rounded-lg border border-slate-200"
              />
              <button
                type="button"
                onClick={() => setWorkstationPhoto("")}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm hover:bg-red-600 transition-colors"
                title="Remover foto"
              >
                <FiX size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <FiCamera size={16} />
              Tirar foto do posto
            </button>
          )}
        </div>
      </div>

      {/* ── Blocos ── */}
      {templateBlocks.map((block) => (
        <div key={block.id} className="bg-white rounded-xl border border-slate-200 mb-6 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-start gap-4">
              {block.image && (
                <img
                  src={block.image}
                  alt={block.name}
                  className="w-24 h-24 object-cover rounded-lg border border-slate-200 flex-shrink-0"
                />
              )}
              <div>
                <h2 className="font-semibold text-slate-800 text-lg">{block.name}</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {block.questions.length} {block.questions.length === 1 ? "pergunta" : "perguntas"}
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 pt-4 space-y-5">
            {[...block.questions]
              .sort((a, b) => a.order - b.order)
              .map((question) => {
                const ans = getAnswer(block.id, question.id);
                const isNonConform =
                  question.type === "marcacao" &&
                  ans.value.toLowerCase().includes("não") &&
                  !ans.value.toLowerCase().includes("não se aplica");

                return (
                  <div key={question.id}>
                    <p className="text-sm font-medium text-slate-700 mb-2">{question.text}</p>

                    {question.type === "marcacao" && question.options && (
                      <div className="flex flex-wrap gap-2">
                        {question.options.map((opt) => {
                          const isSelected = ans.value === opt.label;
                          const isNao = opt.label.toLowerCase().includes("não");
                          return (
                            <button
                              key={opt.label}
                              type="button"
                              onClick={() => setAnswer(block.id, question.id, { value: opt.label })}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                                isSelected
                                  ? isNao
                                    ? "bg-red-100 text-red-700 border-red-300"
                                    : "bg-emerald-100 text-emerald-700 border-emerald-300"
                                  : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {question.type === "numerico" && (
                      <div className="relative max-w-[220px]">
                        <input
                          type="number"
                          value={ans.value}
                          onChange={(e) => setAnswer(block.id, question.id, { value: e.target.value })}
                          className="w-full px-3 py-2 pr-12 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                          placeholder="0"
                        />
                        {question.unit && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                            {question.unit}
                          </span>
                        )}
                      </div>
                    )}

                    {isNonConform && (
                      <div className="ml-4 mt-3 pl-4 border-l-2 border-red-200 space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-red-600 mb-1">Evidência observada</label>
                          <textarea
                            value={ans.evidence}
                            onChange={(e) => setAnswer(block.id, question.id, { evidence: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-red-200 rounded-lg focus:ring-2 focus:ring-red-300 outline-none resize-none bg-red-50"
                            placeholder="Descreva o que está inadequado..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-red-600 mb-1">Recomendação técnica</label>
                          <textarea
                            value={ans.recommendation}
                            onChange={(e) => setAnswer(block.id, question.id, { recommendation: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-red-200 rounded-lg focus:ring-2 focus:ring-red-300 outline-none resize-none bg-red-50"
                            placeholder="Descreva o que deve ser feito..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

            <div className="pt-3 border-t border-slate-100">
              <label className="block text-sm font-medium text-slate-500 mb-1">
                Recomendações e observações do bloco
              </label>
              <textarea
                value={getBlockRec(block.id)}
                onChange={(e) => setBlockRec(block.id, e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                placeholder="Observações adicionais para este bloco..."
              />
            </div>
          </div>
        </div>
      ))}

      {/* ── Observações gerais ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="font-semibold text-slate-800 mb-4">Observações Gerais</h2>
        <textarea
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          rows={4}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
          placeholder="Observações gerais sobre a avaliação ergonômica..."
        />
      </div>

      {nonConformities.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <FiAlertTriangle size={16} />
          <span className="text-sm font-medium">
            {nonConformities.length} não conformidade(s) identificada(s)
          </span>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={!companyId || positionIds.length === 0}
        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
          !companyId || positionIds.length === 0
            ? "bg-slate-300 text-slate-500 cursor-not-allowed"
            : "bg-emerald-600 text-white hover:bg-emerald-700"
        }`}
      >
        <FiSave size={18} />
        Salvar Avaliação
      </button>
    </div>
  );
}
