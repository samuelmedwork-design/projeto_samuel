"use client";
import { useParams, useRouter } from "next/navigation";
import { useData } from "@/contexts/DataContext";
import BodyMap, { BodyMapLegend } from "@/components/BodyMap";
import { FiArrowLeft, FiDownload } from "react-icons/fi";
import { exportSurveyDocx, svgToBase64, type DocxSurveyData } from "@/lib/export";

const WORK_RELATION_LABELS: Record<string, string> = {
  ja_inicia_com_dor: "Já inicio o trabalho com essa dor",
  piora_ao_longo: "A dor piora ao longo do trabalho",
  surge_ao_final: "A dor só surge na hora de ir embora",
  sem_relacao: "Não tem relação com o trabalho",
};

export default function CompanyReportPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const router = useRouter();
  const { companies, surveys } = useData();
  const company = companies.find((c) => c.id === companyId);
  const companySurveys = surveys.filter((s) => s.companyId === companyId);

  const handleDocx = async () => {
    if (!company) return;

    // Captura os SVGs dos BodyMaps renderizados na página
    const svgs = document.querySelectorAll<SVGSVGElement>("[data-bodymap]");
    const bodyMapImages: string[] = [];
    for (let i = 0; i < svgs.length; i++) {
      const img = await svgToBase64(svgs[i]);
      bodyMapImages.push(img);
    }

    const data: DocxSurveyData = {
      companyName: company.name,
      companyCnpj: company.cnpj,
      companyCity: company.city,
      date: new Date().toLocaleDateString("pt-BR"),
      logoUrl: "/logo-horizontal.png",
      surveys: companySurveys.map((s, idx) => ({
        name: s.workerName,
        sector: s.sector,
        position: s.position,
        height: s.height,
        date: new Date(s.createdAt).toLocaleDateString("pt-BR"),
        risks: s.ergonomicRisks || [],
        manualLoad: s.manualLoad,
        painAreas: (s.painAreas || []).map((p) => ({
          region: p.region,
          side: p.side,
          intensity: p.intensity,
          workRelation: p.workRelation,
        })),
        bodyMapImage: bodyMapImages[idx] || "",
      })),
    };
    exportSurveyDocx(data, `queixas-${company.name}`);
  };

  if (!company) return <div className="p-8 text-slate-500">Empresa não encontrada.</div>;

  return (
    <div className="p-8 print-area">
      <div className="flex items-center justify-between mb-6 no-print">
        <button onClick={() => router.push("/reports")}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors">
          <FiArrowLeft size={18} /> Voltar
        </button>
        {companySurveys.length > 0 && (
          <div className="flex gap-2">
            <button onClick={() => window.print()}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors font-medium text-sm">
              <FiDownload size={16} /> PDF
            </button>
            <button onClick={handleDocx}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm">
              <FiDownload size={16} /> DOCX
            </button>
          </div>
        )}
      </div>

      <div className="bg-white" id="print-area">
        <div className="border-b border-slate-200 pb-4 mb-6 px-2">
          <div className="flex justify-center mb-4">
            <img src="/logo-horizontal.png" alt="ErgoAnálise" className="h-14 w-auto" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Relatório de Queixas de Dores</h1>
          <p className="text-slate-500 text-sm mt-1">{company.name} - {company.cnpj} - {company.city}</p>
          <p className="text-slate-400 text-xs mt-1">Gerado em {new Date().toLocaleDateString("pt-BR")} | {companySurveys.length} respostas coletadas</p>
        </div>

        <div className="px-2 mb-4">
          <BodyMapLegend />
        </div>

        {companySurveys.length === 0 ? (
          <div className="rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            Nenhuma resposta coletada para esta empresa.
          </div>
        ) : (
          <div className="space-y-6">
            {companySurveys.map((survey) => (
              <div key={survey.id} className="rounded-xl border border-slate-200 p-5" style={{ breakInside: "avoid" }}>
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px_1fr] gap-6 items-start">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">{survey.workerName}</h3>
                    <div className="space-y-1 text-sm text-slate-600">
                      <p><span className="text-slate-400">Setor:</span> {survey.sector}</p>
                      <p><span className="text-slate-400">Cargo:</span> {survey.position}</p>
                      <p><span className="text-slate-400">Altura:</span> {survey.height} cm</p>
                      <p><span className="text-slate-400">Data:</span> {new Date(survey.createdAt).toLocaleDateString("pt-BR")}</p>
                    </div>
                    {(survey.ergonomicRisks || []).length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Riscos Percebidos</p>
                        <div className="flex flex-wrap gap-1">
                          {survey.ergonomicRisks.map((r) => (
                            <span key={r} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded">{r}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {survey.manualLoad?.performs && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Transporte Manual de Cargas</p>
                        <div className="text-xs text-slate-600 space-y-0.5">
                          {survey.manualLoad.weightLevel && <p>Peso: {survey.manualLoad.weightLevel}</p>}
                          {survey.manualLoad.timePercentage && <p>Tempo: {survey.manualLoad.timePercentage}</p>}
                          {survey.manualLoad.gripQuality && <p>Pega: {survey.manualLoad.gripQuality}</p>}
                          {survey.manualLoad.workPace && <p>Ritmo: {survey.manualLoad.workPace}</p>}
                          {survey.manualLoad.dailyDuration && <p>Duração: {survey.manualLoad.dailyDuration}</p>}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center">
                    {(survey.painAreas || []).length > 0 ? (
                      <BodyMap painAreas={survey.painAreas} size="sm" />
                    ) : (
                      <div className="w-[150px] h-[300px] bg-slate-50 rounded-lg flex items-center justify-center">
                        <p className="text-xs text-slate-400 text-center px-4">Sem queixas</p>
                      </div>
                    )}
                  </div>

                  <div>
                    {(survey.painAreas || []).length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                          {(survey.painAreas || []).length} queixa(s)
                        </p>
                        {[...(survey.painAreas || [])]
                          .sort((a, b) => ({ alta: 0, media: 1, baixa: 2 }[a.intensity] ?? 2) - ({ alta: 0, media: 1, baixa: 2 }[b.intensity] ?? 2))
                          .map((p) => {
                            const colorClass = p.intensity === "alta" ? "border-l-red-500 bg-red-50" : p.intensity === "media" ? "border-l-yellow-500 bg-yellow-50" : "border-l-blue-500 bg-blue-50";
                            const textColor = p.intensity === "alta" ? "text-red-700" : p.intensity === "media" ? "text-yellow-700" : "text-blue-700";
                            const levelLabel = p.intensity === "alta" ? "ALTA" : p.intensity === "media" ? "MÉDIA" : "BAIXA";
                            return (
                              <div key={p.region} className={`border-l-4 rounded-r-lg px-3 py-2 ${colorClass}`}>
                                <div className="flex items-center justify-between">
                                  <span className={`text-sm font-semibold ${textColor}`}>{p.region}</span>
                                  <span className={`text-xs font-bold ${textColor}`}>{levelLabel}</span>
                                </div>
                                <div className="flex gap-2 mt-0.5 text-xs text-slate-500">
                                  {p.side !== "nsa" && <span className="capitalize">Lado: {p.side}</span>}
                                  <span>{WORK_RELATION_LABELS[p.workRelation] || p.workRelation}</span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-sm text-slate-400">Nenhuma queixa registrada.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
