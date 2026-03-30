"use client";
import { useData } from "@/contexts/DataContext";
import { useRouter } from "next/navigation";
import { FiHome, FiUsers, FiClipboard, FiAlertCircle, FiAlertTriangle, FiClock, FiDownload } from "react-icons/fi";
import { useToast } from "@/components/Toast";
import { useMemo, useState } from "react";

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
  const chartW = 400;
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
            {/* label */}
            <text
              x={labelW - 8}
              y={y + barH / 2 + 1}
              textAnchor="end"
              dominantBaseline="central"
              className="fill-slate-600"
              fontSize={12}
            >
              {label.length > 26 ? label.slice(0, 24) + "..." : label}
            </text>
            {/* background track */}
            <rect
              x={labelW}
              y={y + 2}
              width={chartW}
              height={barH - 4}
              rx={4}
              fill="#f1f5f9"
            />
            {/* bar */}
            <rect
              x={labelW}
              y={y + 2}
              width={Math.max(barW, 4)}
              height={barH - 4}
              rx={4}
              fill={barColor}
              opacity={0.85}
            />
            {/* count */}
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

/* ─── Main Dashboard ────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { companies, sectors, positions, surveys, assessments, actions, blocks, templates, anthroRanges } = useData();
  const router = useRouter();
  const { toast } = useToast();
  const [backingUp, setBackingUp] = useState(false);

  const handleBackup = () => {
    setBackingUp(true);
    const backup = {
      exportDate: new Date().toISOString(),
      version: "1.0",
      data: { companies, sectors, positions, surveys, assessments, actions, blocks, templates, anthroRanges },
    };
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ergoanalise-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackingUp(false);
    toast("Backup exportado com sucesso!");
  };

  const pendingActions = actions.filter((a) => a.status === "pendente");
  const overdueActions = actions.filter((a) => a.status !== "concluido" && a.deadline && new Date(a.deadline) < new Date());
  const totalNC = useMemo(() => {
    return assessments.reduce((total, a) =>
      total + (a.filledBlocks || []).reduce((sum, fb) =>
        sum + (fb.answers || []).filter(
          (ans) => ans.type === "marcacao" && ans.value.toLowerCase().includes("não") && !ans.value.toLowerCase().includes("não se aplica")
        ).length, 0
      ), 0);
  }, [assessments]);

  /* Aggregate pain areas across ALL surveys */
  const topPainRegions = useMemo(() => {
    const counts: Record<string, number> = {};
    surveys.forEach((s) => {
      (s.painAreas || []).forEach((p) => {
        counts[p.region] = (counts[p.region] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) as [string, number][];
  }, [surveys]);

  /* Aggregate ergonomic risks across ALL surveys */
  const topRisks = useMemo(() => {
    const counts: Record<string, number> = {};
    surveys.forEach((s) => {
      (s.ergonomicRisks || []).forEach((r) => {
        counts[r] = (counts[r] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8) as [string, number][];
  }, [surveys]);

  const summaryCards = [
    {
      label: "Empresas cadastradas",
      value: companies.length,
      icon: FiHome,
      bg: "bg-emerald-100",
      text: "text-emerald-700",
    },
    {
      label: "Questionários respondidos",
      value: surveys.length,
      icon: FiUsers,
      bg: "bg-blue-100",
      text: "text-blue-700",
    },
    {
      label: "Checklists realizados",
      value: assessments.length,
      icon: FiClipboard,
      bg: "bg-amber-100",
      text: "text-amber-700",
    },
    {
      label: "Não conformidades",
      value: totalNC,
      icon: FiAlertTriangle,
      bg: "bg-orange-100",
      text: "text-orange-700",
    },
    {
      label: "Ações pendentes",
      value: pendingActions.length,
      icon: FiAlertCircle,
      bg: "bg-red-100",
      text: "text-red-700",
    },
    {
      label: "Ações vencidas",
      value: overdueActions.length,
      icon: FiClock,
      bg: "bg-purple-100",
      text: "text-purple-700",
    },
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 mt-1">Visão geral do sistema</p>
        </div>
        <button onClick={handleBackup} disabled={backingUp}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors font-medium text-sm disabled:opacity-50">
          <FiDownload size={16} />
          {backingUp ? "Exportando..." : "Backup dos Dados"}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        {/* Pain distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Distribuição de Queixas de Dor
          </h2>
          <HorizontalBarChart
            data={topPainRegions}
            barColor="#3b82f6"
            emptyMessage="Nenhuma queixa de dor registrada ainda."
          />
        </div>

        {/* Ergonomic risks */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Riscos Ergonômicos Mais Reportados
          </h2>
          <HorizontalBarChart
            data={topRisks}
            barColor="#f59e0b"
            emptyMessage="Nenhum risco ergonômico reportado ainda."
          />
        </div>
      </div>

      {/* Empresas Section */}
      <div>
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Empresas</h2>

        {companies.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
            Nenhuma empresa cadastrada ainda.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((company) => {
              const companySurveys = surveys.filter(
                (s) => s.companyId === company.id
              );
              const companyAssessments = assessments.filter(
                (a) => a.companyId === company.id
              );
              const hasSurveys = companySurveys.length > 0;

              return (
                <button
                  key={company.id}
                  onClick={() => router.push(`/dashboard/${company.id}`)}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm text-left hover:border-emerald-400 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        hasSurveys ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                    <h3 className="font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors">
                      {company.name}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-400 ml-[18px]">
                    {company.city}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 ml-[18px]">
                    <p className="text-xs text-slate-500">
                      <span className="font-semibold text-emerald-600">
                        {companySurveys.length}
                      </span>{" "}
                      questionários{" "}
                      <span className="mx-1 text-slate-300">|</span>
                      <span className="font-semibold text-emerald-600">
                        {companyAssessments.length}
                      </span>{" "}
                      checklists
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
