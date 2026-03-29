"use client";
import { useParams, useRouter } from "next/navigation";
import { useData } from "@/contexts/DataContext";
import { FiArrowLeft, FiTrash2 } from "react-icons/fi";
import BodyMap, { BodyMapLegend } from "@/components/BodyMap";
import type { WorkRelation } from "@/contexts/DataContext";

const workRelationLabels: Record<WorkRelation, string> = {
  ja_inicia_com_dor: "Já inicio o trabalho com essa dor",
  piora_ao_longo: "A dor piora ao longo do trabalho",
  surge_ao_final: "A dor só surge na hora de ir embora",
  sem_relacao: "Não tem relação com o trabalho",
};

const intensityStyles: Record<string, string> = {
  baixa: "bg-blue-100 text-blue-700",
  media: "bg-yellow-100 text-yellow-700",
  alta: "bg-red-100 text-red-700",
};

const intensityLabels: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

function capitalize(str: string) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function SurveyDetailPage() {
  const { id, surveyId } = useParams<{ id: string; surveyId: string }>();
  const router = useRouter();
  const { companies, surveys, deleteSurvey } = useData();

  const company = companies.find((c) => c.id === id);
  const survey = surveys.find((s) => s.id === surveyId);

  const handleDelete = async () => {
    if (
      confirm(
        `Tem certeza que deseja excluir o questionário de "${survey?.workerName}"? Esta ação não pode ser desfeita.`
      )
    ) {
      await deleteSurvey(surveyId);
      router.push(`/companies/${id}/surveys`);
    }
  };

  if (!company)
    return <div className="p-8 text-slate-500">Empresa não encontrada.</div>;
  if (!survey)
    return (
      <div className="p-8 text-slate-500">Questionário não encontrado.</div>
    );

  return (
    <div className="p-8 max-w-4xl">
      {/* Voltar */}
      <button
        onClick={() => router.push(`/companies/${id}/surveys`)}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6"
      >
        <FiArrowLeft size={18} /> Voltar para histórico
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {survey.workerName}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Preenchido em{" "}
            {new Date(survey.createdAt).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
        >
          <FiTrash2 size={15} /> Excluir questionário
        </button>
      </div>

      {/* Identificação */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Identificação
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">
              Nome
            </span>
            <p className="text-sm text-slate-800 mt-1 font-medium">
              {survey.workerName}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">
              Setor
            </span>
            <p className="text-sm text-slate-800 mt-1">
              {survey.sector || "-"}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">
              Cargo
            </span>
            <p className="text-sm text-slate-800 mt-1">
              {survey.position || "-"}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">
              Altura
            </span>
            <p className="text-sm text-slate-800 mt-1">
              {survey.height ? `${survey.height} cm` : "-"}
            </p>
          </div>
        </div>
      </section>

      {/* Riscos Ergonômicos */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Riscos Ergonômicos
        </h2>
        {survey.ergonomicRisks?.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {survey.ergonomicRisks.map((risk, i) => (
              <span
                key={i}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
              >
                {risk}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm">Nenhum risco selecionado</p>
        )}
      </section>

      {/* Dor e Desconforto */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Dor e Desconforto
        </h2>

        {survey.painAreas?.length > 0 ? (
          <div className="grid md:grid-cols-[auto_1fr] gap-6">
            {/* Body Map */}
            <div className="flex flex-col items-center gap-3">
              <BodyMap painAreas={survey.painAreas} size="md" />
              <BodyMapLegend />
            </div>

            {/* List */}
            <div className="space-y-3">
              {survey.painAreas.map((pa, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-slate-800">
                        {pa.region}
                      </span>
                      {pa.side && pa.side !== "nsa" && (
                        <span className="text-xs text-slate-500">
                          ({capitalize(pa.side)})
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          intensityStyles[pa.intensity] || "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {intensityLabels[pa.intensity] || pa.intensity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {workRelationLabels[pa.workRelation] || pa.workRelation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-slate-400 text-sm">
            Nenhuma queixa de dor ou desconforto registrada.
          </p>
        )}
      </section>

      {/* Transporte Manual de Cargas */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Transporte Manual de Cargas
        </h2>
        {survey.manualLoad?.performs ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                Faixa de Peso
              </span>
              <p className="text-sm text-slate-800 mt-1">
                {survey.manualLoad.weightLevel}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                % do Tempo
              </span>
              <p className="text-sm text-slate-800 mt-1">
                {survey.manualLoad.timePercentage}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                Frequência de Esforço
              </span>
              <p className="text-sm text-slate-800 mt-1">
                {survey.manualLoad.effortFrequency}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                Qualidade da Pega
              </span>
              <p className="text-sm text-slate-800 mt-1">
                {survey.manualLoad.gripQuality}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                Ritmo de Trabalho
              </span>
              <p className="text-sm text-slate-800 mt-1">
                {survey.manualLoad.workPace}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                Duração Diária
              </span>
              <p className="text-sm text-slate-800 mt-1">
                {survey.manualLoad.dailyDuration}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-slate-400 text-sm">
            Não realiza transporte manual de cargas.
          </p>
        )}
      </section>

      {/* Assinatura */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Assinatura
        </h2>
        {survey.signature ? (
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 inline-block">
            <img
              src={survey.signature}
              alt="Assinatura do trabalhador"
              className="max-h-32"
            />
          </div>
        ) : (
          <p className="text-slate-400 text-sm">Sem assinatura</p>
        )}
      </section>
    </div>
  );
}
