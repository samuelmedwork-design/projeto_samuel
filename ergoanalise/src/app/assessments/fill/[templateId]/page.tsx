"use client";
import { useState, useMemo, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useData } from "@/contexts/DataContext";
import type { FilledAnswer, FilledBlock, ChecklistBlock } from "@/contexts/DataContext";
import { FiArrowLeft, FiSave, FiCheck, FiAlertTriangle, FiCamera, FiX } from "react-icons/fi";

export default function AssessmentFillPage() {
  const params = useParams();
  const router = useRouter();
  const {
    templates,
    blocks,
    companies,
    sectors,
    positions,
    addAssessment,
  } = useData();

  const templateId = params.templateId as string;
  const template = templates.find((t) => t.id === templateId);

  // Resolve blocks in order
  const templateBlocks: ChecklistBlock[] = useMemo(() => {
    if (!template) return [];
    return template.blockIds
      .map((bid) => blocks.find((b) => b.id === bid))
      .filter(Boolean) as ChecklistBlock[];
  }, [template, blocks]);

  // ── Identification state ──────────────────────────────────────────
  const [companyId, setCompanyId] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [workstation, setWorkstation] = useState("");
  const [observedWorker, setObservedWorker] = useState("");

  const companySectors = sectors.filter((s) => s.companyId === companyId);
  const sectorPositions = positions.filter((p) => p.sectorId === sectorId);

  // ── Answers state ─────────────────────────────────────────────────
  // Keyed by `${blockId}::${questionId}`
  const [answers, setAnswers] = useState<
    Record<string, { value: string; evidence: string; recommendation: string }>
  >({});

  const getAnswer = (blockId: string, questionId: string) => {
    const key = `${blockId}::${questionId}`;
    return answers[key] ?? { value: "", evidence: "", recommendation: "" };
  };

  const setAnswer = (
    blockId: string,
    questionId: string,
    updates: Partial<{ value: string; evidence: string; recommendation: string }>
  ) => {
    const key = `${blockId}::${questionId}`;
    setAnswers((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? { value: "", evidence: "", recommendation: "" }), ...updates },
    }));
  };

  // ── Photos state ──────────────────────────────────────────────────
  // Keyed by `${blockId}::${questionId}`, value is array of base64 data URLs
  const [photos, setPhotos] = useState<Record<string, string[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activePhotoKey, setActivePhotoKey] = useState<string>("");

  const getPhotos = (blockId: string, questionId: string): string[] => {
    const key = `${blockId}::${questionId}`;
    return photos[key] ?? [];
  };

  const resizeImage = useCallback((file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const MAX_WIDTH = 800;
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePhotoKey) return;
    const dataUrl = await resizeImage(file);
    setPhotos((prev) => ({
      ...prev,
      [activePhotoKey]: [...(prev[activePhotoKey] ?? []), dataUrl],
    }));
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const removePhoto = (blockId: string, questionId: string, index: number) => {
    const key = `${blockId}::${questionId}`;
    setPhotos((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).filter((_, i) => i !== index),
    }));
  };

  const triggerPhotoInput = (blockId: string, questionId: string) => {
    const key = `${blockId}::${questionId}`;
    setActivePhotoKey(key);
    // Small timeout to ensure state is set before click
    setTimeout(() => fileInputRef.current?.click(), 0);
  };

  // ── Block recommendations state ───────────────────────────────────
  const [blockRecs, setBlockRecs] = useState<Record<string, string>>({});

  const getBlockRec = (blockId: string) => blockRecs[blockId] ?? "";
  const setBlockRec = (blockId: string, value: string) =>
    setBlockRecs((prev) => ({ ...prev, [blockId]: value }));

  // ── General observations ──────────────────────────────────────────
  const [generalNotes, setGeneralNotes] = useState("");

  // ── Save state ────────────────────────────────────────────────────
  const [saved, setSaved] = useState(false);

  // ── Non-conformities count ────────────────────────────────────────
  const nonConformities = useMemo(() => {
    const items: { blockName: string; questionText: string; evidence: string; recommendation: string }[] = [];
    for (const block of templateBlocks) {
      for (const q of block.questions) {
        if (q.type === "marcacao") {
          const ans = getAnswer(block.id, q.id);
          if (ans.value.toLowerCase().includes("não") && !ans.value.toLowerCase().includes("não se aplica")) {
            items.push({
              blockName: block.name,
              questionText: q.text,
              evidence: ans.evidence,
              recommendation: ans.recommendation,
            });
          }
        }
      }
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, templateBlocks]);

  // ── Handle save ───────────────────────────────────────────────────
  const handleSave = async () => {
    if (!companyId || !sectorId || !positionId || !template) return;

    const filledBlocks: FilledBlock[] = templateBlocks.map((block) => {
      const filledAnswers: FilledAnswer[] = block.questions.map((q) => {
        const ans = getAnswer(block.id, q.id);
        const questionPhotos = getPhotos(block.id, q.id);
        const fa: FilledAnswer = {
          questionId: q.id,
          questionText: q.text,
          type: q.type,
          value: ans.value,
        };
        if (q.type === "marcacao" && ans.value.toLowerCase().includes("não") && !ans.value.toLowerCase().includes("não se aplica")) {
          fa.evidence = ans.evidence;
          fa.recommendation = ans.recommendation;
        }
        if (questionPhotos.length > 0) {
          fa.photos = questionPhotos;
        }
        return fa;
      });

      return {
        blockId: block.id,
        blockName: block.name,
        image: block.image,
        answers: filledAnswers,
        blockRecommendation: getBlockRec(block.id),
      };
    });

    await addAssessment({
      companyId,
      sectorId,
      positionId,
      templateId,
      templateName: template.name,
      workstation,
      observedWorker,
      filledBlocks,
      generalNotes,
    });

    setSaved(true);
  };

  // ── Template not found ────────────────────────────────────────────
  if (!template) {
    return (
      <div className="p-8 text-center text-slate-500">
        Checklist não encontrado.
      </div>
    );
  }

  // ── Success summary ───────────────────────────────────────────────
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
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Evidência observada
                        </p>
                        <p className="text-sm text-slate-700 mt-0.5">{nc.evidence}</p>
                      </div>
                    )}
                    {nc.recommendation && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Recomendação técnica
                        </p>
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

  // ── Main form ─────────────────────────────────────────────────────
  return (
    <div className="p-8 max-w-4xl">
      {/* Hidden file input for photo capture */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoCapture}
        className="hidden"
      />

      {/* Header */}
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

      {/* ── Identification ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="font-semibold text-slate-800 mb-4">Identificação</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Empresa *</label>
            <select
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                setSectorId("");
                setPositionId("");
              }}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="">Selecione</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Setor *</label>
            <select
              value={sectorId}
              onChange={(e) => {
                setSectorId(e.target.value);
                setPositionId("");
              }}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              disabled={!companyId}
            >
              <option value="">Selecione</option>
              {companySectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cargo *</label>
            <select
              value={positionId}
              onChange={(e) => setPositionId(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              disabled={!sectorId}
            >
              <option value="">Selecione</option>
              {sectorPositions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>

      {/* ── Blocks ─────────────────────────────────────────────────── */}
      {templateBlocks.map((block) => (
        <div key={block.id} className="bg-white rounded-xl border border-slate-200 mb-6 overflow-hidden">
          {/* Block header */}
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
                  {block.questions.length}{" "}
                  {block.questions.length === 1 ? "pergunta" : "perguntas"}
                </p>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="px-6 pb-6 pt-4 space-y-5">
            {[...block.questions]
              .sort((a, b) => a.order - b.order)
              .map((question) => {
                const ans = getAnswer(block.id, question.id);
                const isNonConform =
                  question.type === "marcacao" &&
                  ans.value.toLowerCase().includes("não") && !ans.value.toLowerCase().includes("não se aplica");

                return (
                  <div key={question.id}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-medium text-slate-700">{question.text}</p>
                      <button
                        type="button"
                        onClick={() => triggerPhotoInput(block.id, question.id)}
                        className="flex-shrink-0 flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-500 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-600 rounded-lg transition-colors border border-slate-200"
                        title="Anexar foto"
                      >
                        <FiCamera size={14} />
                        <span>Foto</span>
                      </button>
                    </div>

                    {/* ── Marcação type ───────────────────────── */}
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

                    {/* ── Numérico type ──────────────────────── */}
                    {question.type === "numerico" && (
                      <div className="relative max-w-[220px]">
                        <input
                          type="number"
                          value={ans.value}
                          onChange={(e) =>
                            setAnswer(block.id, question.id, { value: e.target.value })
                          }
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

                    {/* ── Non-conformity extra fields ─────────── */}
                    {isNonConform && (
                      <div className="ml-4 mt-3 pl-4 border-l-2 border-red-200 space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-red-600 mb-1">
                            Evidência observada
                          </label>
                          <textarea
                            value={ans.evidence}
                            onChange={(e) =>
                              setAnswer(block.id, question.id, { evidence: e.target.value })
                            }
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-red-200 rounded-lg focus:ring-2 focus:ring-red-300 outline-none resize-none bg-red-50"
                            placeholder="Descreva o que está inadequado..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-red-600 mb-1">
                            Recomendação técnica
                          </label>
                          <textarea
                            value={ans.recommendation}
                            onChange={(e) =>
                              setAnswer(block.id, question.id, {
                                recommendation: e.target.value,
                              })
                            }
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-red-200 rounded-lg focus:ring-2 focus:ring-red-300 outline-none resize-none bg-red-50"
                            placeholder="Descreva o que deve ser feito..."
                          />
                        </div>
                      </div>
                    )}

                    {/* ── Photo thumbnails ──────────────────────── */}
                    {getPhotos(block.id, question.id).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {getPhotos(block.id, question.id).map((photo, idx) => (
                          <div key={idx} className="relative group">
                            <img
                              src={photo}
                              alt={`Foto ${idx + 1}`}
                              className="w-[60px] h-[60px] object-cover rounded-lg border border-slate-200"
                            />
                            <button
                              type="button"
                              onClick={() => removePhoto(block.id, question.id, idx)}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                              title="Remover foto"
                            >
                              <FiX size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

            {/* Block recommendation */}
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

      {/* ── General observations ───────────────────────────────────── */}
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

      {/* ── Non-conformity counter ─────────────────────────────────── */}
      {nonConformities.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <FiAlertTriangle size={16} />
          <span className="text-sm font-medium">
            {nonConformities.length} não conformidade(s) identificada(s)
          </span>
        </div>
      )}

      {/* ── Save button ────────────────────────────────────────────── */}
      <button
        onClick={handleSave}
        disabled={!companyId || !sectorId || !positionId}
        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
          !companyId || !sectorId || !positionId
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
