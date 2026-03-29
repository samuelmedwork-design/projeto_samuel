"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useData } from "@/contexts/DataContext";
import type { FilledBlock, FilledAnswer } from "@/contexts/DataContext";
import { FiArrowLeft, FiTrash2, FiEdit2, FiSave, FiDownload, FiX } from "react-icons/fi";
import { exportChecklistDocx, type DocxChecklistData } from "@/lib/export";
import { useToast } from "@/components/Toast";

const WORK_RELATION_LABELS: Record<string, string> = {
  ja_inicia_com_dor: "Já inicio o trabalho com essa dor",
  piora_ao_longo: "A dor piora ao longo do trabalho",
  surge_ao_final: "A dor só surge na hora de ir embora",
  sem_relacao: "Não tem relação com o trabalho",
};

export default function AssessmentDetailPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const router = useRouter();
  const { assessments, companies, sectors, positions, updateAssessment, deleteAssessment } = useData();
  const { toast } = useToast();

  const assessment = assessments.find((a) => a.id === assessmentId);
  const company = assessment ? companies.find((c) => c.id === assessment.companyId) : null;
  const sector = assessment ? sectors.find((s) => s.id === assessment.sectorId) : null;
  const position = assessment ? positions.find((p) => p.id === assessment.positionId) : null;

  const [editing, setEditing] = useState(false);
  const [editBlocks, setEditBlocks] = useState<FilledBlock[]>([]);
  const [editNotes, setEditNotes] = useState("");
  const [editWorkstation, setEditWorkstation] = useState("");
  const [editWorker, setEditWorker] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    if (!assessment) return;
    setEditBlocks(JSON.parse(JSON.stringify(assessment.filledBlocks || [])));
    setEditNotes(assessment.generalNotes || "");
    setEditWorkstation(assessment.workstation || "");
    setEditWorker(assessment.observedWorker || "");
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    if (!assessment) return;
    setSaving(true);
    await updateAssessment(assessmentId, {
      filledBlocks: editBlocks,
      generalNotes: editNotes,
      workstation: editWorkstation,
      observedWorker: editWorker,
    });
    setSaving(false);
    setEditing(false);
    toast("Avaliação salva com sucesso!");
  };

  const updateEditAnswer = (blockIdx: number, answerIdx: number, updates: Partial<FilledAnswer>) => {
    setEditBlocks((prev) => {
      const next = [...prev];
      next[blockIdx] = { ...next[blockIdx], answers: [...next[blockIdx].answers] };
      next[blockIdx].answers[answerIdx] = { ...next[blockIdx].answers[answerIdx], ...updates };
      return next;
    });
  };

  const updateBlockRec = (blockIdx: number, value: string) => {
    setEditBlocks((prev) => {
      const next = [...prev];
      next[blockIdx] = { ...next[blockIdx], blockRecommendation: value };
      return next;
    });
  };

  const handleDocx = () => {
    if (!assessment || !company) return;
    const data: DocxChecklistData = {
      companyName: company.name,
      companyCnpj: company.cnpj,
      companyCity: company.city,
      date: new Date(assessment.createdAt).toLocaleDateString("pt-BR"),
      logoUrl: "/logo-horizontal.png",
      assessments: [{
        templateName: assessment.templateName,
        sector: sector?.name || "—",
        position: position?.name || "—",
        workstation: assessment.workstation || "",
        worker: assessment.observedWorker || "",
        date: new Date(assessment.createdAt).toLocaleDateString("pt-BR"),
        blocks: (assessment.filledBlocks || []).map((fb) => ({
          name: fb.blockName,
          image: fb.image,
          answers: (fb.answers || []).map((ans) => ({
            question: ans.questionText,
            value: ans.value,
            type: ans.type,
            evidence: ans.evidence,
            recommendation: ans.recommendation,
            photos: ans.photos,
          })),
          blockRecommendation: fb.blockRecommendation,
        })),
        generalNotes: assessment.generalNotes,
      }],
    };
    exportChecklistDocx(data, `avaliacao-${assessment.templateName}`);
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir esta avaliação? Esta ação não pode ser desfeita.")) return;
    await deleteAssessment(assessmentId);
    router.push("/assessments");
  };

  if (!assessment) {
    return (
      <div className="p-8">
        <button onClick={() => router.push("/assessments")} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6">
          <FiArrowLeft size={18} /> Voltar
        </button>
        <p className="text-slate-400">Avaliação não encontrada.</p>
      </div>
    );
  }

  const displayBlocks = editing ? editBlocks : (assessment.filledBlocks || []);
  const displayNotes = editing ? editNotes : (assessment.generalNotes || "");

  const nonConformities = displayBlocks.flatMap((block) =>
    (block.answers || []).filter(
      (a) => a.type === "marcacao" && a.value.toLowerCase().includes("não") && !a.value.toLowerCase().includes("não se aplica")
    ).map((a) => ({ ...a, blockName: block.blockName }))
  );

  return (
    <div className="p-8 max-w-5xl">
      <button onClick={() => router.push("/assessments")} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 no-print">
        <FiArrowLeft size={18} /> Voltar às avaliações
      </button>

      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{assessment.templateName}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {company?.name || "—"} | {sector?.name || "—"} | {position?.name || "—"}
          </p>
          <p className="text-slate-400 text-xs mt-1">
            {new Date(assessment.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            {(editing ? editWorkstation : assessment.workstation) && ` | Posto: ${editing ? editWorkstation : assessment.workstation}`}
            {(editing ? editWorker : assessment.observedWorker) && ` | Trabalhador: ${editing ? editWorker : assessment.observedWorker}`}
          </p>
        </div>
        <div className="flex gap-2 no-print">
          {editing ? (
            <>
              <button onClick={cancelEdit}
                className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors font-medium">
                <FiX size={14} /> Cancelar
              </button>
              <button onClick={saveEdit} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50">
                <FiSave size={14} /> {saving ? "Salvando..." : "Salvar"}
              </button>
            </>
          ) : (
            <>
              <button onClick={startEdit}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors font-medium">
                <FiEdit2 size={14} /> Editar
              </button>
              <button onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-medium">
                <FiDownload size={14} /> PDF
              </button>
              <button onClick={handleDocx}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors font-medium">
                <FiDownload size={14} /> DOCX
              </button>
              <button onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-medium">
                <FiTrash2 size={14} /> Excluir
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editáveis: posto e trabalhador */}
      {editing && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Posto de trabalho</label>
              <input value={editWorkstation} onChange={(e) => setEditWorkstation(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Trabalhador observado</label>
              <input value={editWorker} onChange={(e) => setEditWorker(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
          </div>
        </div>
      )}

      <div id="print-area">
        {/* Logo para impressão */}
        <div className="hidden print:flex justify-center mb-4">
          <img src="/logo-horizontal.png" alt="ErgoAnálise" className="h-14 w-auto" />
        </div>
        <div className="hidden print:block border-b border-slate-200 pb-3 mb-4">
          <h1 className="text-xl font-bold text-slate-800">{assessment.templateName}</h1>
          <p className="text-sm text-slate-500">{company?.name} | {sector?.name} | {position?.name}</p>
          <p className="text-xs text-slate-400">
            {new Date(assessment.createdAt).toLocaleDateString("pt-BR")}
            {assessment.workstation && ` | Posto: ${assessment.workstation}`}
            {assessment.observedWorker && ` | Trabalhador: ${assessment.observedWorker}`}
          </p>
        </div>

        {/* Resumo de não conformidades */}
        {nonConformities.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-8">
            <h2 className="font-semibold text-red-800 mb-3">{nonConformities.length} não conformidade(s)</h2>
            <div className="space-y-2">
              {nonConformities.map((nc, i) => (
                <div key={i} className="bg-white border border-red-200 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">{nc.blockName}</span>
                    <span className="text-sm font-medium text-slate-800">{nc.questionText}</span>
                  </div>
                  <p className="text-xs text-red-600"><strong>Resposta:</strong> {nc.value}</p>
                  {nc.evidence && <p className="text-xs text-slate-600 mt-1"><strong>Evidência:</strong> {nc.evidence}</p>}
                  {nc.recommendation && <p className="text-xs text-slate-600 mt-0.5"><strong>Recomendação:</strong> {nc.recommendation}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Blocos preenchidos */}
        <div className="space-y-6">
          {displayBlocks.map((block, bIdx) => (
            <div key={bIdx} className="bg-white rounded-xl border border-slate-200 p-6" style={{ breakInside: "avoid" }}>
              <div className="flex items-start gap-4 mb-4">
                {block.image && (
                  <img src={block.image} alt={block.blockName} className="w-16 h-16 rounded-lg object-cover border border-slate-200 shrink-0" />
                )}
                <h3 className="text-lg font-semibold text-slate-800">{block.blockName}</h3>
              </div>

              <div className="space-y-3">
                {(block.answers || []).map((answer, aIdx) => {
                  const isNonConform = answer.type === "marcacao" && answer.value.toLowerCase().includes("não") && !answer.value.toLowerCase().includes("não se aplica");
                  return (
                    <div key={aIdx} className={`rounded-lg px-4 py-3 ${isNonConform ? "bg-red-50 border border-red-200" : "bg-slate-50"}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700">{answer.questionText}</span>
                        {editing ? (
                          answer.type === "numerico" ? (
                            <input value={answer.value} onChange={(e) => updateEditAnswer(bIdx, aIdx, { value: e.target.value })}
                              className="w-24 px-2 py-1 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none text-right" />
                          ) : (
                            <select value={answer.value} onChange={(e) => updateEditAnswer(bIdx, aIdx, { value: e.target.value })}
                              className="px-2 py-1 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none">
                              <option value="">—</option>
                              <option value="Atende">Atende</option>
                              <option value="Não atende">Não atende</option>
                              <option value="Não se aplica">Não se aplica</option>
                            </select>
                          )
                        ) : (
                          <span className={`text-xs font-medium px-2.5 py-1 rounded ${
                            isNonConform ? "bg-red-100 text-red-700" :
                            answer.type === "numerico" ? "bg-blue-100 text-blue-700" :
                            answer.value.toLowerCase().includes("não se aplica") ? "bg-slate-200 text-slate-600" :
                            "bg-emerald-100 text-emerald-700"
                          }`}>
                            {answer.value || "—"}
                          </span>
                        )}
                      </div>
                      {/* Evidência e Recomendação */}
                      {(isNonConform || editing) && answer.type === "marcacao" && answer.value.toLowerCase().includes("não") && !answer.value.toLowerCase().includes("não se aplica") && (
                        <>
                          {editing ? (
                            <div className="mt-2 space-y-2">
                              <div>
                                <label className="text-[10px] text-slate-500 font-medium">Evidência</label>
                                <input value={answer.evidence || ""} onChange={(e) => updateEditAnswer(bIdx, aIdx, { evidence: e.target.value })}
                                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none" />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-500 font-medium">Recomendação</label>
                                <input value={answer.recommendation || ""} onChange={(e) => updateEditAnswer(bIdx, aIdx, { recommendation: e.target.value })}
                                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none" />
                              </div>
                            </div>
                          ) : (
                            <>
                              {answer.evidence && <p className="text-xs text-red-600 mt-2"><strong>Evidência:</strong> {answer.evidence}</p>}
                              {answer.recommendation && <p className="text-xs text-red-600 mt-0.5"><strong>Recomendação:</strong> {answer.recommendation}</p>}
                            </>
                          )}
                        </>
                      )}
                      {/* Fotos */}
                      {(answer.photos || []).length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {answer.photos!.map((photo, pIdx) => (
                            <img key={pIdx} src={photo} alt="Foto" className="w-20 h-20 rounded-lg object-cover border border-slate-200" />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Recomendação do bloco */}
              {editing ? (
                <div className="mt-4">
                  <label className="text-xs text-slate-500 font-medium">Recomendações do bloco</label>
                  <textarea value={block.blockRecommendation || ""} onChange={(e) => updateBlockRec(bIdx, e.target.value)}
                    rows={2} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none mt-1" />
                </div>
              ) : block.blockRecommendation ? (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Recomendações do bloco</p>
                  <p className="text-sm text-amber-600 whitespace-pre-wrap">{block.blockRecommendation}</p>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {/* Observações gerais */}
        {editing ? (
          <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-2">Observações gerais</h3>
            <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)}
              rows={4} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
          </div>
        ) : displayNotes ? (
          <div className="mt-6 bg-slate-50 rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-2">Observações gerais</h3>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{displayNotes}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
