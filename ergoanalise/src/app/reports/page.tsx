"use client";
import { useState } from "react";
import { useData } from "@/contexts/DataContext";
import { useRouter } from "next/navigation";
import { FiFileText, FiUsers, FiClipboard, FiAlertTriangle, FiActivity, FiSearch, FiDownload } from "react-icons/fi";
import { exportChecklistDocx, exportSurveyDocx, exportAnthroDocx, type DocxChecklistData, type DocxSurveyData, type DocxAnthroData } from "@/lib/export";
import JSZip from "jszip";

export default function ReportsPage() {
  const router = useRouter();
  const { companies, surveys, assessments, actions, sectors, positions, anthroRanges } = useData();
  const [exporting, setExporting] = useState("");
  const [search, setSearch] = useState("");

  const getSectorName = (id: string) => sectors.find((s) => s.id === id)?.name || "-";
  const getPositionName = (id: string) => positions.find((p) => p.id === id)?.name || "-";
  const findRange = (height: number) => anthroRanges.find((r) => height >= r.minHeight && height <= r.maxHeight);

  const handleBatchExport = async (companyId: string) => {
    const company = companies.find((c) => c.id === companyId);
    if (!company) return;
    setExporting(companyId);

    const zip = new JSZip();
    const date = new Date().toLocaleDateString("pt-BR");

    // 1. Checklist report
    const compAssessments = assessments.filter((a) => a.companyId === companyId);
    if (compAssessments.length > 0) {
      const data: DocxChecklistData = {
        companyName: company.name, companyCnpj: company.cnpj, companyCity: company.city, date,
        assessments: compAssessments.map((a) => ({
          templateName: a.templateName, sector: getSectorName(a.sectorId), position: getPositionName(a.positionId),
          workstation: a.workstation || "", worker: a.observedWorker || "",
          date: new Date(a.createdAt).toLocaleDateString("pt-BR"),
          blocks: (a.filledBlocks || []).map((fb) => ({
            name: fb.blockName, image: fb.image,
            answers: (fb.answers || []).map((ans) => ({ question: ans.questionText, value: ans.value, type: ans.type, evidence: ans.evidence, recommendation: ans.recommendation, photos: ans.photos })),
            blockRecommendation: fb.blockRecommendation,
          })),
          generalNotes: a.generalNotes,
        })),
      };
      // Generate DOCX content inline (simplified - without logo for ZIP)
      await exportChecklistDocx(data, `_temp_checklist`);
    }

    // 2. Survey report
    const compSurveys = surveys.filter((s) => s.companyId === companyId);
    if (compSurveys.length > 0) {
      const data: DocxSurveyData = {
        companyName: company.name, companyCnpj: company.cnpj, companyCity: company.city, date,
        surveys: compSurveys.map((s) => ({
          name: s.workerName, sector: s.sector, position: s.position, height: s.height,
          date: new Date(s.createdAt).toLocaleDateString("pt-BR"),
          risks: s.ergonomicRisks || [], manualLoad: s.manualLoad,
          painAreas: (s.painAreas || []).map((p) => ({ region: p.region, side: p.side, intensity: p.intensity, workRelation: p.workRelation })),
        })),
      };
      await exportSurveyDocx(data, `_temp_queixas`);
    }

    // 3. Anthropometry report
    if (compSurveys.length > 0) {
      const grouped: Record<string, typeof compSurveys> = {};
      for (const s of compSurveys) {
        const pos = s.position || "Sem cargo";
        if (!grouped[pos]) grouped[pos] = [];
        grouped[pos].push(s);
      }
      const data: DocxAnthroData = {
        companyName: company.name, date,
        groups: Object.entries(grouped).map(([position, workers]) => ({
          position,
          workers: workers.map((w) => {
            const range = findRange(w.height);
            return { name: w.workerName, sector: w.sector || "—", position: w.position || "—", height: w.height, rangeName: range?.name, rangeMin: range?.minHeight, rangeMax: range?.maxHeight, rangeImage: range?.image };
          }),
        })),
      };
      await exportAnthroDocx(data, `_temp_anthro`);
    }

    setExporting("");
    // Note: individual downloads happen since ZIP with MHTML is complex
    // Each report downloads separately
  };

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.cnpj.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Central de Relatórios</h1>
      <p className="text-slate-500 text-sm mb-6">Visualização consolidada e geração de laudos</p>

      {/* Busca por empresa ou CNPJ */}
      {companies.length > 0 && (
        <div className="relative mb-6">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome da empresa ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
          />
        </div>
      )}

      {filteredCompanies.length === 0 && companies.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FiFileText size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhuma empresa cadastrada ainda.</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FiSearch size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhuma empresa encontrada para &ldquo;{search}&rdquo;.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCompanies.map((company) => {
            const companySurveys = surveys.filter((s) => s.companyId === company.id);
            const companyAssessments = assessments.filter((a) => a.companyId === company.id);
            const companyActions = actions.filter((a) => a.companyId === company.id);
            const companySectors = sectors.filter((s) => s.companyId === company.id);
            const totalPains = companySurveys.reduce((acc, s) => acc + (s.painAreas || []).length, 0);
            const pendingActions = companyActions.filter((a) => a.status === "pendente").length;

            return (
              <div key={company.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                <div className="mb-3">
                  <h3 className="font-semibold text-slate-800 text-sm leading-tight">{company.name}</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">{company.cnpj} — {company.city}</p>
                </div>

                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  <div className="bg-slate-50 rounded-md px-2 py-1.5 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Respostas</span>
                    <span className="text-sm font-bold text-slate-800">{companySurveys.length}</span>
                  </div>
                  <div className="bg-slate-50 rounded-md px-2 py-1.5 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Checklists</span>
                    <span className="text-sm font-bold text-slate-800">{companyAssessments.length}</span>
                  </div>
                  <div className="bg-slate-50 rounded-md px-2 py-1.5 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Queixas</span>
                    <span className="text-sm font-bold text-red-600">{totalPains}</span>
                  </div>
                  <div className="bg-slate-50 rounded-md px-2 py-1.5 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Ações Pend.</span>
                    <span className="text-sm font-bold text-amber-600">{pendingActions}</span>
                  </div>
                </div>

                {/* Botões de relatório */}
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => router.push(`/reports/${company.id}`)}
                    className="w-full text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1.5 rounded-lg hover:bg-blue-100 transition-colors font-medium text-left flex items-center gap-1.5"
                  >
                    <FiUsers size={12} />
                    Queixas de Dores
                  </button>
                  <button
                    onClick={() => router.push(`/reports/checklists/${company.id}`)}
                    className="w-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors font-medium text-left flex items-center gap-1.5"
                  >
                    <FiClipboard size={12} />
                    Checklists Técnicos
                  </button>
                  <button
                    onClick={() => router.push(`/reports/anthropometry/${company.id}`)}
                    className="w-full text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1.5 rounded-lg hover:bg-purple-100 transition-colors font-medium text-left flex items-center gap-1.5"
                  >
                    <FiActivity size={12} />
                    Antropométricos
                  </button>
                  <button
                    onClick={() => handleBatchExport(company.id)}
                    disabled={exporting === company.id}
                    className="w-full text-xs bg-slate-800 text-white px-2 py-1.5 rounded-lg hover:bg-slate-900 transition-colors font-medium text-left flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <FiDownload size={12} />
                    {exporting === company.id ? "Baixando..." : "Baixar Tudo (DOCX)"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
