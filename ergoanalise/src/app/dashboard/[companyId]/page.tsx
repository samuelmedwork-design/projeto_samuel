"use client";
import { useData } from "@/contexts/DataContext";
import { useParams, useRouter } from "next/navigation";
import {
  FiArrowLeft,
  FiUsers,
  FiClipboard,
  FiAlertTriangle,
  FiXCircle,
} from "react-icons/fi";
import { useMemo } from "react";

/* ─── Reusable SVG horizontal bar chart ─────────────────────────────── */
function HorizontalBarChart({
  data,
  barColor,
  emptyMessage,
}: {
  data: [string, number][];
  barColor: string;
  emptyMessage: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-400 py-4">{emptyMessage}</p>;
  }
  const maxVal = Math.max(...data.map(([, v]) => v), 1);
  const barH = 26;
  const gap = 8;
  const labelW = 180;
  const countW = 40;
  const chartW = 360;
  const totalW = labelW + chartW + countW + 16;
  const totalH = data.length * (barH + gap);

  return (
    <svg
      viewBox={`0 0 ${totalW} ${totalH}`}
      width="100%"
      height={totalH}
      className="overflow-visible"
    >
      {data.map(([label, count], i) => {
        const y = i * (barH + gap);
        const barW = (count / maxVal) * chartW;
        return (
          <g key={label}>
            <text
              x={labelW - 8}
              y={y + barH / 2 + 1}
              textAnchor="end"
              dominantBaseline="central"
              className="fill-slate-600"
              fontSize={12}
            >
              {label.length > 24 ? label.slice(0, 22) + "..." : label}
            </text>
            <rect
              x={labelW}
              y={y + 2}
              width={chartW}
              height={barH - 4}
              rx={4}
              fill="#f1f5f9"
            />
            <rect
              x={labelW}
              y={y + 2}
              width={Math.max(barW, 4)}
              height={barH - 4}
              rx={4}
              fill={barColor}
              opacity={0.85}
            />
            <text
              x={labelW + chartW + 10}
              y={y + barH / 2 + 1}
              dominantBaseline="central"
              className="fill-slate-700"
              fontSize={12}
              fontWeight={600}
            >
              {count}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── SVG Donut Chart ───────────────────────────────────────────────── */
function DonutChart({
  slices,
}: {
  slices: { label: string; value: number; color: string }[];
}) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <p className="text-sm text-slate-400 py-4">Nenhum dado disponível.</p>
    );
  }

  const cx = 90;
  const cy = 90;
  const r = 70;
  const innerR = 42;
  const size = 180;

  let cumAngle = -Math.PI / 2; // start at top

  const paths = slices
    .filter((s) => s.value > 0)
    .map((slice) => {
      const angle = (slice.value / total) * 2 * Math.PI;
      const startAngle = cumAngle;
      const endAngle = cumAngle + angle;
      cumAngle = endAngle;

      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const ix1 = cx + innerR * Math.cos(endAngle);
      const iy1 = cy + innerR * Math.sin(endAngle);
      const ix2 = cx + innerR * Math.cos(startAngle);
      const iy2 = cy + innerR * Math.sin(startAngle);
      const largeArc = angle > Math.PI ? 1 : 0;

      const d = [
        `M ${x1} ${y1}`,
        `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${ix1} ${iy1}`,
        `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}`,
        `Z`,
      ].join(" ");

      return (
        <path key={slice.label} d={d} fill={slice.color} opacity={0.9} />
      );
    });

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths}
        {/* center text */}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          className="fill-slate-700"
          fontSize={20}
          fontWeight={700}
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          className="fill-slate-400"
          fontSize={10}
        >
          queixas
        </text>
      </svg>
      {/* Legend */}
      <div className="flex flex-col gap-2">
        {slices
          .filter((s) => s.value > 0)
          .map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-sm inline-block"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-sm text-slate-600">
                {s.label}:{" "}
                <span className="font-semibold">{s.value}</span>{" "}
                <span className="text-slate-400">
                  ({((s.value / total) * 100).toFixed(0)}%)
                </span>
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

/* ─── Company Dashboard ─────────────────────────────────────────────── */
export default function CompanyDashboardPage() {
  const { companies, surveys, assessments, sectors, positions } = useData();
  const params = useParams();
  const router = useRouter();

  const companyId = params.companyId as string;
  const company = companies.find((c) => c.id === companyId);

  const companySurveys = useMemo(
    () => surveys.filter((s) => s.companyId === companyId),
    [surveys, companyId]
  );
  const companyAssessments = useMemo(
    () => assessments.filter((a) => a.companyId === companyId),
    [assessments, companyId]
  );
  const companySectors = useMemo(
    () => sectors.filter((s) => s.companyId === companyId),
    [sectors, companyId]
  );

  /* Total pain areas */
  const totalPainAreas = companySurveys.reduce(
    (sum, s) => sum + (s.painAreas || []).length,
    0
  );

  /* Non-conformities: answers containing "não" (case insensitive) */
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

  /* Pain by intensity for donut */
  const painByIntensity = useMemo(() => {
    const counts = { baixa: 0, media: 0, alta: 0 };
    companySurveys.forEach((s) => {
      (s.painAreas || []).forEach((p) => {
        if (p.intensity in counts) counts[p.intensity]++;
      });
    });
    return counts;
  }, [companySurveys]);

  /* Top 5 pain regions */
  const topPainRegions = useMemo(() => {
    const counts: Record<string, number> = {};
    companySurveys.forEach((s) => {
      (s.painAreas || []).forEach((p) => {
        counts[p.region] = (counts[p.region] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) as [string, number][];
  }, [companySurveys]);

  /* Positions with most responses */
  const topPositions = useMemo(() => {
    const counts: Record<string, number> = {};
    companySurveys.forEach((s) => {
      const label = s.position || "Não informado";
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) as [string, number][];
  }, [companySurveys]);

  /* Ergonomic risks top 10 */
  const topRisks = useMemo(() => {
    const counts: Record<string, number> = {};
    companySurveys.forEach((s) => {
      (s.ergonomicRisks || []).forEach((r) => {
        counts[r] = (counts[r] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) as [string, number][];
  }, [companySurveys]);

  /* Sector status table */
  const sectorStatus = useMemo(() => {
    return companySectors.map((sector) => {
      const surveyCount = companySurveys.filter(
        (s) => s.sector === sector.name
      ).length;
      const checklistCount = companyAssessments.filter(
        (a) => a.sectorId === sector.id
      ).length;
      return { name: sector.name, surveyCount, checklistCount };
    });
  }, [companySectors, companySurveys, companyAssessments]);

  if (!company) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors mb-6"
        >
          <FiArrowLeft size={18} />
          Voltar ao Dashboard
        </button>
        <p className="text-slate-400">Empresa não encontrada.</p>
      </div>
    );
  }

  const summaryCards = [
    {
      label: "Funcionários respondidos",
      value: companySurveys.length,
      icon: FiUsers,
      bg: "bg-emerald-100",
      text: "text-emerald-700",
    },
    {
      label: "Checklists preenchidos",
      value: companyAssessments.length,
      icon: FiClipboard,
      bg: "bg-blue-100",
      text: "text-blue-700",
    },
    {
      label: "Queixas de dor",
      value: totalPainAreas,
      icon: FiAlertTriangle,
      bg: "bg-amber-100",
      text: "text-amber-700",
    },
    {
      label: "Não conformidades",
      value: nonConformities,
      icon: FiXCircle,
      bg: "bg-red-100",
      text: "text-red-700",
    },
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.push("/dashboard")}
        className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors mb-6"
      >
        <FiArrowLeft size={18} />
        Voltar ao Dashboard
      </button>

      {/* Company header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">{company.name}</h1>
        <p className="text-slate-500 mt-1">
          CNPJ: {company.cnpj} &middot; {company.city}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.bg} ${card.text}`}
              >
                <card.icon size={20} />
              </div>
              <span className="text-sm text-slate-500">{card.label}</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Status de Preenchimento */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Status de Preenchimento
        </h2>
        {sectorStatus.length === 0 ? (
          <p className="text-sm text-slate-400">
            Nenhum setor cadastrado para esta empresa.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 pr-4 text-slate-500 font-medium">
                    Status
                  </th>
                  <th className="text-left py-2 pr-4 text-slate-500 font-medium">
                    Setor
                  </th>
                  <th className="text-center py-2 pr-4 text-slate-500 font-medium">
                    Questionários
                  </th>
                  <th className="text-center py-2 text-slate-500 font-medium">
                    Checklists
                  </th>
                </tr>
              </thead>
              <tbody>
                {sectorStatus.map((s) => {
                  const dotColor =
                    s.surveyCount > 5
                      ? "bg-emerald-500"
                      : s.surveyCount >= 1
                      ? "bg-amber-500"
                      : "bg-red-500";
                  return (
                    <tr
                      key={s.name}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="py-2.5 pr-4">
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-full ${dotColor}`}
                        />
                      </td>
                      <td className="py-2.5 pr-4 text-slate-700">{s.name}</td>
                      <td className="py-2.5 pr-4 text-center text-slate-600 font-medium">
                        {s.surveyCount}
                      </td>
                      <td className="py-2.5 text-center text-slate-600 font-medium">
                        {s.checklistCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Donut + Top 5 Pain Regions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Donut chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Mapa de Dores
          </h2>
          <DonutChart
            slices={[
              {
                label: "Baixa",
                value: painByIntensity.baixa,
                color: "#3b82f6",
              },
              {
                label: "Média",
                value: painByIntensity.media,
                color: "#f59e0b",
              },
              {
                label: "Alta",
                value: painByIntensity.alta,
                color: "#ef4444",
              },
            ]}
          />
        </div>

        {/* Top 5 pain regions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Top 5 Regiões de Dor
          </h2>
          <HorizontalBarChart
            data={topPainRegions}
            barColor="#3b82f6"
            emptyMessage="Nenhuma queixa registrada."
          />
        </div>
      </div>

      {/* Positions + Risks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Positions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Cargos com Mais Respostas
          </h2>
          <HorizontalBarChart
            data={topPositions}
            barColor="#10b981"
            emptyMessage="Nenhuma resposta registrada."
          />
        </div>

        {/* Ergonomic risks */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Riscos Ergonômicos
          </h2>
          <HorizontalBarChart
            data={topRisks}
            barColor="#f59e0b"
            emptyMessage="Nenhum risco reportado."
          />
        </div>
      </div>
    </div>
  );
}
