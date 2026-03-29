"use client";
import { useParams, useRouter } from "next/navigation";
import { useData } from "@/contexts/DataContext";
import { FiArrowLeft, FiTrash2 } from "react-icons/fi";

const WORK_RELATION_LABELS: Record<string, string> = {
  ja_inicia_com_dor: "Já inicio o trabalho com essa dor",
  piora_ao_longo: "A dor piora ao longo do trabalho",
  surge_ao_final: "A dor só surge na hora de ir embora",
  sem_relacao: "Não tem relação com o trabalho",
};

export default function AssessmentDetailPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const router = useRouter();
  const { assessments, companies, sectors, positions, deleteAssessment } = useData();

  const assessment = assessments.find((a) => a.id === assessmentId);
  const company = assessment ? companies.find((c) => c.id === assessment.companyId) : null;
  const sector = assessment ? sectors.find((s) => s.id === assessment.sectorId) : null;
  const position = assessment ? positions.find((p) => p.id === assessment.positionId) : null;

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

  const nonConformities = (assessment.filledBlocks || []).flatMap((block) =>
    (block.answers || []).filter(
      (a) => a.type === "marcacao" && a.value.toLowerCase().includes("não") && !a.value.toLowerCase().includes("não se aplica")
    ).map((a) => ({ ...a, blockName: block.blockName }))
  );

  return (
    <div className="p-8 max-w-5xl">
      <button onClick={() => router.push("/assessments")} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6">
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
            {assessment.workstation && ` | Posto: ${assessment.workstation}`}
            {assessment.observedWorker && ` | Trabalhador: ${assessment.observedWorker}`}
          </p>
        </div>
        <button onClick={handleDelete}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-medium">
          <FiTrash2 size={14} />
          Excluir avaliação
        </button>
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
        {(assessment.filledBlocks || []).map((block, bIdx) => (
          <div key={bIdx} className="bg-white rounded-xl border border-slate-200 p-6">
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
                      <span className={`text-xs font-medium px-2.5 py-1 rounded ${
                        isNonConform ? "bg-red-100 text-red-700" :
                        answer.type === "numerico" ? "bg-blue-100 text-blue-700" :
                        answer.value.toLowerCase().includes("não se aplica") ? "bg-slate-200 text-slate-600" :
                        "bg-emerald-100 text-emerald-700"
                      }`}>
                        {answer.value || "—"}
                      </span>
                    </div>
                    {isNonConform && answer.evidence && (
                      <p className="text-xs text-red-600 mt-2"><strong>Evidência:</strong> {answer.evidence}</p>
                    )}
                    {isNonConform && answer.recommendation && (
                      <p className="text-xs text-red-600 mt-0.5"><strong>Recomendação:</strong> {answer.recommendation}</p>
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

            {block.blockRecommendation && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">Recomendações do bloco</p>
                <p className="text-sm text-amber-600 whitespace-pre-wrap">{block.blockRecommendation}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Observações gerais */}
      {assessment.generalNotes && (
        <div className="mt-6 bg-slate-50 rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-2">Observações gerais</h3>
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{assessment.generalNotes}</p>
        </div>
      )}
    </div>
  );
}
