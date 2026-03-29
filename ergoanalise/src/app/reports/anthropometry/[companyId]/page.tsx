"use client";
import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useData } from "@/contexts/DataContext";
import { FiArrowLeft, FiDownload, FiUser, FiImage } from "react-icons/fi";
import { exportAnthroDocx, type DocxAnthroData } from "@/lib/export";

export default function AnthropometryReportPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const router = useRouter();
  const { companies, surveys, anthroRanges } = useData();
  const company = companies.find((c) => c.id === companyId);

  const companySurveys = useMemo(
    () => surveys.filter((s) => s.companyId === companyId),
    [surveys, companyId]
  );

  const groupedByPosition = useMemo(() => {
    const map: Record<string, typeof companySurveys> = {};
    for (const s of companySurveys) {
      const pos = s.position || "Sem cargo";
      if (!map[pos]) map[pos] = [];
      map[pos].push(s);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [companySurveys]);

  const findRange = (height: number) => {
    return anthroRanges.find((r) => height >= r.minHeight && height <= r.maxHeight);
  };

  const exportPDF = () => window.print();

  const handleDocx = () => {
    if (!company) return;
    const data: DocxAnthroData = {
      companyName: company.name,
      date: new Date().toLocaleDateString("pt-BR"),
      logoUrl: "/logo-horizontal.png",
      groups: groupedByPosition.map(([position, workers]) => ({
        position,
        workers: workers.map((w) => {
          const range = findRange(w.height);
          return {
            name: w.workerName,
            sector: w.sector || "—",
            position: w.position || "—",
            height: w.height,
            rangeName: range?.name,
            rangeMin: range?.minHeight,
            rangeMax: range?.maxHeight,
            rangeImage: range?.image,
          };
        }),
      })),
    };
    exportAnthroDocx(data, `antropometria-${company.name}`);
  };

  if (!company) {
    return (
      <div className="p-8">
        <p className="text-slate-500">Empresa não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="p-8 print-area">
      <div className="flex items-center justify-between mb-8 no-print">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/reports")}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <FiArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Dados Antropométricos</h1>
            <p className="text-slate-500 text-sm">{company.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportPDF}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
            <FiDownload size={16} /> PDF
          </button>
          <button onClick={handleDocx}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
            <FiDownload size={16} /> DOCX
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6" id="print-area">
        {/* PDF header */}
        <div className="mb-6 pb-4 border-b border-slate-200">
          <div className="flex justify-center mb-4">
            <img src="/logo-horizontal.png" alt="ErgoAnálise" className="h-14 w-auto" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Relatório Antropométrico</h2>
          <p className="text-sm text-slate-500">{company.name}</p>
        </div>

        {companySurveys.length === 0 ? (
          <p className="text-slate-400 text-sm py-12 text-center">
            Nenhum dado coletado para esta empresa.
          </p>
        ) : (
          <div className="space-y-8">
            {groupedByPosition.map(([position, workers]) => (
              <div key={position}>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mb-4">
                  <h3 className="font-semibold text-emerald-800 text-sm uppercase tracking-wide">
                    Cargo: {position}
                  </h3>
                </div>

                <div className="space-y-4">
                  {workers.map((worker) => {
                    const range = findRange(worker.height);
                    return (
                      <div
                        key={worker.id}
                        className="border border-slate-200 rounded-lg p-4 grid grid-cols-[1fr_2fr] gap-5 items-start"
                        style={{ breakInside: "avoid" }}
                      >
                        {/* Coluna esquerda (1/3): Dados do trabalhador */}
                        <div className="py-2">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                              <FiUser size={14} className="text-emerald-600" />
                            </div>
                            <h4 className="font-semibold text-slate-800 text-base leading-tight">{worker.workerName}</h4>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-slate-400 text-xs uppercase tracking-wide">Altura</span>
                              <p className="font-semibold text-slate-800 text-lg">{worker.height} cm</p>
                            </div>
                            <div>
                              <span className="text-slate-400 text-xs uppercase tracking-wide">Setor</span>
                              <p className="text-slate-700">{worker.sector || "—"}</p>
                            </div>
                            <div>
                              <span className="text-slate-400 text-xs uppercase tracking-wide">Cargo</span>
                              <p className="text-slate-700">{worker.position || "—"}</p>
                            </div>
                            {range && (
                              <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                                <span className="text-emerald-600 text-xs font-medium">
                                  Faixa: {range.minHeight} – {range.maxHeight} cm
                                  {range.name && ` (${range.name})`}
                                </span>
                              </div>
                            )}
                            {!range && (
                              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                <span className="text-amber-600 text-xs">Sem faixa correspondente</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Coluna direita (2/3): Imagem grande */}
                        <div className="flex justify-center">
                          {range?.image ? (
                            <img
                              src={range.image}
                              alt={range.name}
                              className="w-full max-h-[360px] object-contain rounded-lg border border-slate-200 bg-white"
                            />
                          ) : (
                            <div className="w-full h-64 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center">
                              <FiImage className="text-slate-300" size={48} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
