"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useData } from "@/contexts/DataContext";
import { FiArrowLeft, FiDownload, FiFilter } from "react-icons/fi";
import { exportChecklistDocx, type DocxChecklistData } from "@/lib/export";

export default function ChecklistReportPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const router = useRouter();
  const { companies, sectors, positions, assessments } = useData();
  const company = companies.find((c) => c.id === companyId);

  const [filterSector, setFilterSector] = useState("");
  const [filterPosition, setFilterPosition] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const companySectors = sectors.filter((s) => s.companyId === companyId);
  const companyAssessments = assessments.filter((a) => {
    if (a.companyId !== companyId) return false;
    if (filterSector && a.sectorId !== filterSector) return false;
    if (filterPosition && a.positionId !== filterPosition) return false;
    if (startDate && a.createdAt < startDate) return false;
    if (endDate && a.createdAt > endDate + "T23:59:59") return false;
    return true;
  });

  const filteredPositions = filterSector
    ? positions.filter((p) => p.sectorId === filterSector)
    : positions.filter((p) => p.companyId === companyId);

  const getSectorName = (id: string) => sectors.find((s) => s.id === id)?.name || "-";
  const getPositionName = (id: string) => positions.find((p) => p.id === id)?.name || "-";

  const exportPDF = () => window.print();

  const handleDocx = () => {
    if (!company) return;
    const data: DocxChecklistData = {
      companyName: company.name,
      companyCnpj: company.cnpj,
      companyCity: company.city,
      date: new Date().toLocaleDateString("pt-BR"),
      logoUrl: "/logo-horizontal.png",
      assessments: companyAssessments.map((a) => ({
        templateName: a.templateName,
        sector: getSectorName(a.sectorId),
        position: getPositionName(a.positionId),
        workstation: a.workstation || "",
        worker: a.observedWorker || "",
        date: new Date(a.createdAt).toLocaleDateString("pt-BR"),
        blocks: (a.filledBlocks || []).map((fb) => ({
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
        generalNotes: a.generalNotes,
      })),
    };
    exportChecklistDocx(data, `checklists-${company.name}`);
  };

  if (!company) return <div className="p-8 text-slate-500">Empresa não encontrada.</div>;

  return (
    <div className="p-8 print-area">
      <div className="flex items-center justify-between mb-6 no-print">
        <button onClick={() => router.push("/reports")}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors">
          <FiArrowLeft size={18} /> Voltar
        </button>
        {companyAssessments.length > 0 && (
          <div className="flex gap-2">
            <button onClick={exportPDF}
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

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 no-print">
        <div className="flex items-center gap-2 mb-3">
          <FiFilter className="text-slate-500" size={16} />
          <h3 className="font-semibold text-slate-800 text-sm">Filtros</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Setor</label>
            <select value={filterSector} onChange={(e) => { setFilterSector(e.target.value); setFilterPosition(""); }}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm">
              <option value="">Todos os setores</option>
              {companySectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cargo</label>
            <select value={filterPosition} onChange={(e) => setFilterPosition(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm">
              <option value="">Todos os cargos</option>
              {filteredPositions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">De</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Até</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
          </div>
        </div>
      </div>

      {/* Área capturada para PDF */}
      <div className="bg-white" id="print-area">
        <div className="border-b border-slate-200 pb-4 mb-6 px-2">
          <div className="flex justify-center mb-4">
            <img src="/logo-horizontal.png" alt="ErgoAnálise" className="h-14 w-auto" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Relatório de Checklists Técnicos</h1>
          <p className="text-slate-500 text-sm mt-1">{company.name} - {company.cnpj} - {company.city}</p>
          <p className="text-slate-400 text-xs mt-1">
            Gerado em {new Date().toLocaleDateString("pt-BR")} | {companyAssessments.length} avaliação(ões)
            {filterSector && ` | Setor: ${getSectorName(filterSector)}`}
            {filterPosition && ` | Cargo: ${getPositionName(filterPosition)}`}
          </p>
        </div>

        {companyAssessments.length === 0 ? (
          <div className="rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            Nenhum checklist encontrado com os filtros selecionados.
          </div>
        ) : (
          <div className="space-y-8">
            {companyAssessments.map((assessment) => (
              <div key={assessment.id} className="rounded-xl border border-slate-200 p-5" style={{ pageBreakInside: "avoid" }}>
                {/* Cabeçalho da avaliação */}
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800">{assessment.templateName}</h3>
                    <span className="text-xs text-slate-400">{new Date(assessment.createdAt).toLocaleDateString("pt-BR")}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                    <span>Setor: {getSectorName(assessment.sectorId)}</span>
                    <span>Cargo: {getPositionName(assessment.positionId)}</span>
                    {assessment.workstation && <span>Posto: {assessment.workstation}</span>}
                    {assessment.observedWorker && <span>Trabalhador: {assessment.observedWorker}</span>}
                  </div>
                </div>

                {/* Blocos preenchidos */}
                {(assessment.filledBlocks || []).map((block, bIdx) => (
                  <div key={bIdx} className="mb-5 last:mb-0">
                    <div className="flex items-start gap-4 mb-3">
                      {block.image && (
                        <img src={block.image} alt={block.blockName} className="w-16 h-16 rounded-lg object-cover border border-slate-200 shrink-0" />
                      )}
                      <h4 className="font-semibold text-slate-700 text-sm pt-1">{block.blockName}</h4>
                    </div>

                    <div className="space-y-2 ml-0">
                      {block.answers.map((answer, aIdx) => {
                        const isNonConform = answer.type === "marcacao" && answer.value.toLowerCase().includes("não") && !answer.value.toLowerCase().includes("não se aplica");
                        return (
                          <div key={aIdx} className={`rounded-lg px-3 py-2 text-sm ${isNonConform ? "bg-red-50 border border-red-200" : "bg-slate-50"}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-700">{answer.questionText}</span>
                              <span className={`font-medium text-xs px-2 py-0.5 rounded ${
                                isNonConform ? "bg-red-100 text-red-700" :
                                answer.type === "numerico" ? "bg-blue-100 text-blue-700" :
                                "bg-emerald-100 text-emerald-700"
                              }`}>
                                {answer.value}
                              </span>
                            </div>
                            {isNonConform && answer.evidence && (
                              <p className="text-xs text-red-600 mt-1"><strong>Evidência:</strong> {answer.evidence}</p>
                            )}
                            {isNonConform && answer.recommendation && (
                              <p className="text-xs text-red-600 mt-0.5"><strong>Recomendação:</strong> {answer.recommendation}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {block.blockRecommendation && (
                      <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        <p className="text-xs font-semibold text-amber-700">Recomendações do bloco:</p>
                        <p className="text-xs text-amber-600 mt-0.5 whitespace-pre-wrap">{block.blockRecommendation}</p>
                      </div>
                    )}
                  </div>
                ))}

                {assessment.generalNotes && (
                  <div className="mt-4 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                    <p className="text-xs font-semibold text-slate-600">Observações gerais:</p>
                    <p className="text-xs text-slate-500 mt-0.5 whitespace-pre-wrap">{assessment.generalNotes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
