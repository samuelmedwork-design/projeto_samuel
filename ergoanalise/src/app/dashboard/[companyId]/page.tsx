"use client";
import { useData } from "@/contexts/DataContext";
import { useParams, useRouter } from "next/navigation";
import {
  FiArrowLeft, FiUsers, FiClipboard, FiAlertTriangle, FiXCircle,
  FiChevronDown, FiChevronRight,
} from "react-icons/fi";
import { useMemo, useState } from "react";

/* ─── SVG horizontal bar chart ─────────────────────────────────────── */
function HorizontalBarChart({ data, barColor, emptyMessage }: { data: [string, number][]; barColor: string; emptyMessage: string }) {
  if (data.length === 0) return <p className="text-sm text-slate-400 py-4">{emptyMessage}</p>;
  const maxVal = Math.max(...data.map(([, v]) => v), 1);
  const barH = 26, gap = 8, labelW = 180, countW = 40, chartW = 360;
  const totalW = labelW + chartW + countW + 16;
  const totalH = data.length * (barH + gap);
  return (
    <svg viewBox={`0 0 ${totalW} ${totalH}`} width="100%" height={totalH} className="overflow-visible">
      {data.map(([label, count], i) => {
        const y = i * (barH + gap);
        const barW = (count / maxVal) * chartW;
        return (
          <g key={label}>
            <text x={labelW - 8} y={y + barH / 2 + 1} textAnchor="end" dominantBaseline="central" className="fill-slate-600" fontSize={12}>
              {label.length > 24 ? label.slice(0, 22) + "..." : label}
            </text>
            <rect x={labelW} y={y + 2} width={chartW} height={barH - 4} rx={4} fill="#f1f5f9" />
            <rect x={labelW} y={y + 2} width={Math.max(barW, 4)} height={barH - 4} rx={4} fill={barColor} opacity={0.85} />
            <text x={labelW + chartW + 10} y={y + barH / 2 + 1} dominantBaseline="central" className="fill-slate-700" fontSize={12} fontWeight={600}>{count}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── SVG Donut Chart ───────────────────────────────────────────────── */
function DonutChart({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="text-sm text-slate-400 py-4">Nenhum dado disponível.</p>;
  const cx = 90, cy = 90, r = 70, innerR = 42, size = 180;
  let cumAngle = -Math.PI / 2;
  const paths = slices.filter((s) => s.value > 0).map((slice) => {
    const angle = (slice.value / total) * 2 * Math.PI;
    const startAngle = cumAngle, endAngle = cumAngle + angle;
    cumAngle = endAngle;
    const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(endAngle), iy1 = cy + innerR * Math.sin(endAngle);
    const ix2 = cx + innerR * Math.cos(startAngle), iy2 = cy + innerR * Math.sin(startAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const d = [`M ${x1} ${y1}`, `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`, `L ${ix1} ${iy1}`, `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}`, `Z`].join(" ");
    return <path key={slice.label} d={d} fill={slice.color} opacity={0.9} />;
  });
  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths}
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-slate-700" fontSize={20} fontWeight={700}>{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="fill-slate-400" fontSize={10}>queixas</text>
      </svg>
      <div className="flex flex-col gap-2">
        {slices.filter((s) => s.value > 0).map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: s.color }} />
            <span className="text-sm text-slate-600">{s.label}: <span className="font-semibold">{s.value}</span> <span className="text-slate-400">({((s.value / total) * 100).toFixed(0)}%)</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Company Dashboard ─────────────────────────────────────────────── */
export default function CompanyDashboardPage() {
  const { companies, surveys, assessments, sectors, positions } = useData();
  const [statSector, setStatSector] = useState("");
  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set());
  const params = useParams();
  const router = useRouter();

  const companyId = params.companyId as string;
  const company = companies.find((c) => c.id === companyId);

  const companySurveys = useMemo(() => surveys.filter((s) => s.companyId === companyId), [surveys, companyId]);
  const companyAssessments = useMemo(() => assessments.filter((a) => a.companyId === companyId), [assessments, companyId]);
  const companySectors = useMemo(() => sectors.filter((s) => s.companyId === companyId), [sectors, companyId]);

  const totalPainAreas = companySurveys.reduce((sum, s) => sum + (s.painAreas || []).length, 0);

  const nonConformities = useMemo(() => {
    let count = 0;
    companyAssessments.forEach((a) => {
      (a.filledBlocks || []).forEach((fb) => {
        (fb.answers || []).forEach((ans) => {
          if (ans.value && ans.value.toLowerCase().includes("não") && !ans.value.toLowerCase().includes("não se aplica")) count++;
        });
      });
    });
    return count;
  }, [companyAssessments]);

  const painByIntensity = useMemo(() => {
    const counts = { baixa: 0, media: 0, alta: 0 };
    companySurveys.forEach((s) => { (s.painAreas || []).forEach((p) => { if (p.intensity in counts) counts[p.intensity]++; }); });
    return counts;
  }, [companySurveys]);

  const topPainRegions = useMemo(() => {
    const counts: Record<string, number> = {};
    companySurveys.forEach((s) => { (s.painAreas || []).forEach((p) => { counts[p.region] = (counts[p.region] || 0) + 1; }); });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5) as [string, number][];
  }, [companySurveys]);

  const topPositions = useMemo(() => {
    const counts: Record<string, number> = {};
    companySurveys.forEach((s) => { const label = s.position || "Não informado"; counts[label] = (counts[label] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5) as [string, number][];
  }, [companySurveys]);

  const topRisks = useMemo(() => {
    const counts: Record<string, number> = {};
    companySurveys.forEach((s) => { (s.ergonomicRisks || []).forEach((r) => { counts[r] = (counts[r] || 0) + 1; }); });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10) as [string, number][];
  }, [companySurveys]);

  const sectorNames = useMemo(() => [...new Set(companySurveys.map((s) => s.sector).filter(Boolean))].sort(), [companySurveys]);
  const statsFiltered = statSector ? companySurveys.filter((s) => s.sector === statSector) : companySurveys;

  const maleCount = companySurveys.filter((s) => s.sex === "Masculino").length;
  const femaleCount = companySurveys.filter((s) => s.sex === "Feminino").length;
  const totalWithSex = maleCount + femaleCount;

  const heightSamples = statsFiltered.filter((s) => (s.height ?? 0) > 0);
  const avgHeight = heightSamples.length > 0 ? (heightSamples.reduce((sum, s) => sum + (s.height ?? 0), 0) / heightSamples.length).toFixed(1) : null;

  const weightSamples = statsFiltered.filter((s) => (s.weight ?? 0) > 0);
  const avgWeight = weightSamples.length > 0 ? (weightSamples.reduce((sum, s) => sum + (s.weight ?? 0), 0) / weightSamples.length).toFixed(1) : null;

  /* Sector + position status */
  const sectorStatus = useMemo(() => {
    return companySectors.map((sector) => {
      const sectorPositions = positions.filter((p) => p.sectorId === sector.id);
      const surveyCount = companySurveys.filter((s) => s.sector === sector.name).length;
      const checklistCount = companyAssessments.filter((a) => a.sectorId === sector.id).length;

      const positionStatus = sectorPositions.map((pos) => {
        const posSurveys = companySurveys.filter((s) => s.position === pos.name && s.sector === sector.name).length;
        const posChecklists = companyAssessments.filter((a) => a.positionId === pos.id).length;
        return { id: pos.id, name: pos.name, descricao: pos.descricao, surveyCount: posSurveys, checklistCount: posChecklists };
      });

      return { id: sector.id, name: sector.name, surveyCount, checklistCount, positions: positionStatus };
    });
  }, [companySectors, positions, companySurveys, companyAssessments]);

  const toggleSector = (sectorId: string) => {
    setExpandedSectors((prev) => {
      const next = new Set(prev);
      if (next.has(sectorId)) { next.delete(sectorId); } else { next.add(sectorId); }
      return next;
    });
  };

  if (!company) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors mb-6">
          <FiArrowLeft size={18} /> Voltar ao Dashboard
        </button>
        <p className="text-slate-400">Empresa não encontrada.</p>
      </div>
    );
  }

  const summaryCards = [
    { label: "Funcionários respondidos", value: companySurveys.length, icon: FiUsers, bg: "bg-emerald-100", text: "text-emerald-700" },
    { label: "Checklists preenchidos", value: companyAssessments.length, icon: FiClipboard, bg: "bg-blue-100", text: "text-blue-700" },
    { label: "Queixas de dor", value: totalPainAreas, icon: FiAlertTriangle, bg: "bg-amber-100", text: "text-amber-700" },
    { label: "Não conformidades", value: nonConformities, icon: FiXCircle, bg: "bg-red-100", text: "text-red-700" },
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors mb-6">
        <FiArrowLeft size={18} /> Voltar ao Dashboard
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">{company.name}</h1>
        <p className="text-slate-500 mt-1">CNPJ: {company.cnpj} &middot; {company.city}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.bg} ${card.text}`}><card.icon size={20} /></div>
              <span className="text-sm text-slate-500">{card.label}</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Sexo / Altura / Peso */}
      {companySurveys.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-medium text-slate-600">Filtrar altura/peso por setor:</span>
            <select value={statSector} onChange={(e) => setStatSector(e.target.value)} className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
              <option value="">Todos os setores</option>
              {sectorNames.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-600 mb-4">Distribuição por Sexo</p>
              <div className="flex items-center gap-5">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <div className="w-20 h-20 rounded-full" style={{ background: totalWithSex === 0 ? "#e2e8f0" : `conic-gradient(#3b82f6 ${(maleCount / totalWithSex) * 360}deg, #ec4899 ${(maleCount / totalWithSex) * 360}deg 360deg)` }} />
                  <div className="absolute inset-[18%] bg-white rounded-full" />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" /><span className="text-slate-600">Masculino: <strong>{maleCount}</strong></span></div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-pink-500 flex-shrink-0" /><span className="text-slate-600">Feminino: <strong>{femaleCount}</strong></span></div>
                  {totalWithSex < companySurveys.length && <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-slate-300 flex-shrink-0" /><span className="text-slate-400 text-xs">Não inf.: {companySurveys.length - totalWithSex}</span></div>}
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-600 mb-1">Altura Média</p>
              {statSector && <p className="text-xs text-slate-400 mb-2">{statSector}</p>}
              <p className="text-3xl font-bold text-emerald-600">{avgHeight ? `${avgHeight} cm` : "—"}</p>
              <p className="text-xs text-slate-400 mt-1">{heightSamples.length} registro(s) com altura</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-600 mb-1">Peso Médio</p>
              {statSector && <p className="text-xs text-slate-400 mb-2">{statSector}</p>}
              <p className="text-3xl font-bold text-emerald-600">{avgWeight ? `${avgWeight} kg` : "—"}</p>
              <p className="text-xs text-slate-400 mt-1">{weightSamples.length} registro(s) com peso</p>
            </div>
          </div>
        </div>
      )}

      {/* Status de Preenchimento — drill-down por setor → cargos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-8">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Status de Preenchimento</h2>
          <p className="text-xs text-slate-400 mt-0.5">Clique em um setor para ver os cargos</p>
        </div>

        {sectorStatus.length === 0 ? (
          <p className="text-sm text-slate-400 px-6 py-8">Nenhum setor cadastrado para esta empresa.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {sectorStatus.map((sector) => {
              const isExpanded = expandedSectors.has(sector.id);
              const dotColor = sector.surveyCount > 5 ? "bg-emerald-500" : sector.surveyCount >= 1 ? "bg-amber-500" : "bg-red-500";

              return (
                <div key={sector.id}>
                  {/* Sector row */}
                  <button
                    onClick={() => toggleSector(sector.id)}
                    className="w-full flex items-center gap-3 px-6 py-3.5 hover:bg-slate-50 transition-colors text-left"
                  >
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
                    <span className="flex-1 font-medium text-slate-800 text-sm">{sector.name}</span>
                    <span className="text-xs text-slate-500 mr-6">
                      <span className="font-semibold text-emerald-600">{sector.surveyCount}</span> quest.
                      <span className="mx-1.5 text-slate-300">|</span>
                      <span className="font-semibold text-blue-600">{sector.checklistCount}</span> check.
                    </span>
                    {sector.positions.length > 0 && (
                      isExpanded ? <FiChevronDown size={16} className="text-slate-400 shrink-0" /> : <FiChevronRight size={16} className="text-slate-400 shrink-0" />
                    )}
                  </button>

                  {/* Position rows */}
                  {isExpanded && sector.positions.length > 0 && (
                    <div className="bg-slate-50 border-t border-slate-100">
                      {/* Header */}
                      <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-12 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        <span>Cargo</span>
                        <span className="w-24 text-center">Questionários</span>
                        <span className="w-20 text-center">Checklists</span>
                      </div>
                      {sector.positions.map((pos) => {
                        const posDot = pos.surveyCount > 0 ? "bg-emerald-400" : "bg-slate-300";
                        return (
                          <div key={pos.id} className="grid grid-cols-[1fr_auto_auto] gap-4 px-12 py-2.5 items-center border-b border-slate-100 last:border-0">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${posDot}`} />
                                <span className="text-sm text-slate-700">{pos.name}</span>
                              </div>
                              {pos.descricao && (
                                <p className="text-xs text-slate-400 mt-0.5 ml-4 line-clamp-1">{pos.descricao}</p>
                              )}
                            </div>
                            <span className="w-24 text-center text-sm font-semibold text-emerald-600">{pos.surveyCount}</span>
                            <span className="w-20 text-center text-sm font-semibold text-blue-600">{pos.checklistCount}</span>
                          </div>
                        );
                      })}
                      {sector.positions.length === 0 && (
                        <p className="px-12 py-3 text-xs text-slate-400">Nenhum cargo cadastrado neste setor.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Donut + Top 5 Pain Regions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Mapa de Dores</h2>
          <DonutChart slices={[{ label: "Baixa", value: painByIntensity.baixa, color: "#3b82f6" }, { label: "Média", value: painByIntensity.media, color: "#f59e0b" }, { label: "Alta", value: painByIntensity.alta, color: "#ef4444" }]} />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Top 5 Regiões de Dor</h2>
          <HorizontalBarChart data={topPainRegions} barColor="#3b82f6" emptyMessage="Nenhuma queixa registrada." />
        </div>
      </div>

      {/* Positions + Risks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Cargos com Mais Respostas</h2>
          <HorizontalBarChart data={topPositions} barColor="#10b981" emptyMessage="Nenhuma resposta registrada." />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Riscos Ergonômicos</h2>
          <HorizontalBarChart data={topRisks} barColor="#f59e0b" emptyMessage="Nenhum risco reportado." />
        </div>
      </div>
    </div>
  );
}
