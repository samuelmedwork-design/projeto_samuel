"use client";
import { useData } from "@/contexts/DataContext";
import { useRouter } from "next/navigation";
import { FiClipboard, FiFileText, FiArrowRight, FiEye, FiTrash2 } from "react-icons/fi";

export default function AssessmentsPage() {
  const { templates, assessments, companies, sectors, positions, blocks, deleteAssessment } = useData();
  const router = useRouter();

  const getCompanyName = (id: string) => companies.find((c) => c.id === id)?.name ?? "—";
  const getSectorName = (id: string) => sectors.find((s) => s.id === id)?.name ?? "—";
  const getPositionName = (id: string) => positions.find((p) => p.id === id)?.name ?? "—";

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Excluir a avaliação "${name}"? Esta ação não pode ser desfeita.`)) {
      await deleteAssessment(id);
    }
  };

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Avaliações Técnicas</h1>
      <p className="text-slate-500 text-sm mb-8">
        Inicie uma nova avaliação a partir de um checklist ou consulte avaliações já realizadas.
      </p>

      {/* ── Nova Avaliação ── */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Nova Avaliação</h2>

        {templates.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-400">
            <FiClipboard size={32} className="mx-auto mb-2 opacity-50" />
            <p>Nenhum checklist cadastrado.</p>
            <p className="text-sm mt-1">
              Crie um checklist em <span className="font-medium text-emerald-600">Checklists</span> para iniciar avaliações.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tpl) => {
              const tplBlocks = tpl.blockIds.map((bid) => blocks.find((b) => b.id === bid)).filter(Boolean);
              const totalQuestions = tplBlocks.reduce((sum, b) => sum + (b?.questions.length ?? 0), 0);
              return (
                <button key={tpl.id} onClick={() => router.push(`/assessments/fill/${tpl.id}`)}
                  className="bg-white rounded-xl border border-slate-200 p-5 text-left hover:border-emerald-400 hover:shadow-md transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <FiFileText size={20} />
                    </div>
                    <FiArrowRight size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors mt-1" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1">{tpl.name}</h3>
                  <p className="text-sm text-slate-500">
                    {tplBlocks.length} {tplBlocks.length === 1 ? "bloco" : "blocos"} &middot; {totalQuestions} {totalQuestions === 1 ? "pergunta" : "perguntas"}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Avaliações Realizadas ── */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Avaliações Realizadas ({assessments.length})
        </h2>

        {assessments.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-400">
            <p>Nenhuma avaliação realizada ainda.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-4 py-3 font-medium text-slate-600">Empresa</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Checklist</th>
                  <th className="px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Setor / Cargo</th>
                  <th className="px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">Posto</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Data</th>
                  <th className="px-4 py-3 font-medium text-slate-600 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((a) => {
                  const ncCount = (a.filledBlocks || []).reduce((sum, fb) =>
                    sum + (fb.answers || []).filter(
                      (ans) => ans.type === "marcacao" && ans.value.toLowerCase().includes("não") && !ans.value.toLowerCase().includes("não se aplica")
                    ).length, 0
                  );
                  return (
                    <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-800 font-medium">{getCompanyName(a.companyId)}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {a.templateName}
                        {ncCount > 0 && (
                          <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
                            {ncCount} NC
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                        {getSectorName(a.sectorId)} / {getPositionName(a.positionId)}
                      </td>
                      <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">{a.workstation || "—"}</td>
                      <td className="px-4 py-3 text-slate-500">{new Date(a.createdAt).toLocaleDateString("pt-BR")}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => router.push(`/assessments/${a.id}`)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Ver detalhes">
                            <FiEye size={15} />
                          </button>
                          <button onClick={() => handleDelete(a.id, a.templateName)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir">
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
