"use client";
import { useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/components/Toast";
import { FiArrowLeft, FiPrinter, FiEdit2, FiCheck, FiX } from "react-icons/fi";

/* ─── Inline editable text area ───────────────────────────────────────── */
function EditableBlock({ value, onChange, placeholder, rows = 4 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <div
        onClick={() => { setDraft(value); setEditing(true); }}
        className="group relative cursor-text min-h-[60px] rounded-lg border border-dashed border-transparent hover:border-slate-300 transition-colors p-2"
      >
        {value ? (
          <p className="whitespace-pre-wrap text-slate-700 text-sm leading-relaxed">{value}</p>
        ) : (
          <p className="text-slate-400 italic text-sm">{placeholder || "Clique para editar..."}</p>
        )}
        <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <FiEdit2 size={13} className="text-slate-400" />
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={rows}
        className="w-full px-3 py-2 border border-emerald-400 rounded-lg text-sm text-slate-700 resize-y focus:ring-2 focus:ring-emerald-500 outline-none"
      />
      <div className="flex gap-2">
        <button onClick={() => { onChange(draft); setEditing(false); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs hover:bg-emerald-700 transition-colors">
          <FiCheck size={13} /> Salvar
        </button>
        <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-xs hover:bg-slate-50 transition-colors">
          <FiX size={13} /> Cancelar
        </button>
      </div>
    </div>
  );
}

/* ─── Print styles injected in <head> ──────────────────────────────────── */
const PRINT_STYLES = `
@media print {
  body * { visibility: hidden !important; }
  #doc-print-area, #doc-print-area * { visibility: visible !important; }
  #doc-print-area { position: fixed; top: 0; left: 0; width: 100%; padding: 20mm; box-sizing: border-box; }
  .no-print { display: none !important; }
  .page-break { page-break-before: always; }
}
`;

/* ─── Main page ──────────────────────────────────────────────────────── */
export default function DocumentacaoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const {
    companies, sectors, positions, avaliadores, surveys,
    assessments, gses, actionChecklist, updateCompany,
  } = useData();

  const company = companies.find((c) => c.id === id);
  const companyGses = useMemo(() => gses.filter((g) => g.companyId === id).sort((a, b) => a.numero - b.numero), [gses, id]);
  const companySectors = useMemo(() => sectors.filter((s) => s.companyId === id), [sectors, id]);
  const companyActionItems = useMemo(() => actionChecklist.filter((a) => a.companyId === id), [actionChecklist, id]);
  const companyAssessments = useMemo(() => assessments.filter((a) => a.companyId === id), [assessments, id]);
  const companySurveys = useMemo(() => surveys.filter((s) => s.companyId === id), [surveys, id]);

  // Corpo inicial e final editáveis (salvo no campo conclusaoAet e em estado local com prefix)
  const [corpoInicial, setCorpoInicial] = useState(
    "A presente Análise Ergonômica do Trabalho (AET) foi elaborada com o objetivo de identificar, avaliar e propor medidas de controle para os riscos ergonômicos presentes nos postos de trabalho avaliados, em conformidade com a Norma Regulamentadora NR-17 e demais normas aplicáveis.\n\nA metodologia utilizada baseou-se na observação direta das tarefas, entrevistas com os trabalhadores, aplicação de questionários e uso de instrumentos de avaliação ergonômica validados."
  );
  const [corpoFinal, setCorpoFinal] = useState(
    "Ressaltamos que as medidas recomendadas neste documento visam promover a saúde e o bem-estar dos trabalhadores, devendo ser implementadas de forma planejada e contínua. A presente análise deverá ser revisada sempre que ocorrerem alterações significativas nas condições de trabalho ou no quadro de funcionários."
  );
  const [savingConclusao, setSavingConclusao] = useState(false);

  const saveCompanyConclusao = async (text: string) => {
    setSavingConclusao(true);
    await updateCompany(id, { conclusaoAet: text });
    setSavingConclusao(false);
  };

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  if (!company) return <div className="p-8 text-slate-500">Empresa não encontrada.</div>;

  /* ─── Build plano de ação geral ─── */
  const planoGeralItems = companyActionItems.filter((a) => a.resposta === "nao");

  /* ─── Build plano específico por GSE ─── */
  const planoEspecifico = companyGses.map((gse) => {
    const items: { questionText: string; recommendation: string; positionName: string; blockName: string }[] = [];
    gse.assessmentIds.forEach((aid) => {
      const assessment = companyAssessments.find((a) => a.id === aid);
      if (!assessment) return;
      const pos = positions.find((p) => p.id === assessment.positionId);
      (assessment.filledBlocks || []).forEach((fb) => {
        (fb.answers || []).forEach((ans) => {
          const isNC = ans.value?.toLowerCase().includes("não") && !ans.value?.toLowerCase().includes("não se aplica");
          const itemId = `${aid}::${ans.questionId}`;
          if (isNC && ans.recommendation?.trim() && !gse.excludedActionIds.includes(itemId)) {
            items.push({ questionText: ans.questionText, recommendation: ans.recommendation, positionName: pos?.name || "", blockName: fb.blockName });
          }
        });
      });
    });
    return { gse, items };
  }).filter((g) => g.items.length > 0);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />
      <div className="p-8 max-w-5xl">
        {/* Controls */}
        <div className="no-print mb-8 flex items-start justify-between">
          <div>
            <button onClick={() => router.push(`/companies/${id}/structure`)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-600 transition-colors mb-2">
              <FiArrowLeft size={14} /> Voltar à estrutura
            </button>
            <h1 className="text-2xl font-bold text-slate-800">{company.name}</h1>
            <p className="text-slate-500 text-sm mt-1">Documentação — Relatório AET</p>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors font-medium text-sm"
          >
            <FiPrinter size={16} /> Imprimir / Exportar PDF
          </button>
        </div>

        <div id="doc-print-area" ref={printRef} className="space-y-8">

          {/* ── 1. CAPA ── */}
          <section className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <div className="no-print text-xs text-slate-400 mb-4 uppercase tracking-widest">Seção 1 — Capa</div>
            {company.logoUrl && <img src={company.logoUrl} alt="Logo" className="h-20 mx-auto mb-6 object-contain" />}
            <h1 className="text-3xl font-bold text-slate-900 mb-2">ANÁLISE ERGONÔMICA DO TRABALHO</h1>
            <p className="text-xl text-slate-700 font-medium mb-1">{company.name}</p>
            {company.razaoSocial && <p className="text-slate-500 mb-1">{company.razaoSocial}</p>}
            {company.cnpj && <p className="text-slate-500 mb-1">CNPJ: {company.cnpj}</p>}
            {company.endereco && <p className="text-slate-400 text-sm mb-4">{company.endereco}</p>}
            <p className="text-slate-400 text-sm mt-6">{new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</p>
          </section>

          {/* ── 2. DADOS DA EMPRESA E AVALIADORES ── */}
          <section className="bg-white rounded-xl border border-slate-200 p-8">
            <div className="no-print text-xs text-slate-400 mb-4 uppercase tracking-widest">Seção 2 — Dados da empresa e avaliadores</div>
            <h2 className="text-xl font-bold text-slate-800 mb-6 pb-2 border-b border-slate-200">1. Identificação da Empresa e Responsáveis Técnicos</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {[
                { label: "Razão Social", value: company.razaoSocial || company.name },
                { label: "Nome Fantasia", value: company.name },
                { label: "CNPJ", value: company.cnpj },
                { label: "Endereço", value: company.endereco },
                { label: "CNAE Principal", value: company.cnaePrincipal },
                { label: "Telefone", value: company.telefone },
                { label: "E-mail", value: company.email },
              ].filter((f) => f.value).map((field) => (
                <div key={field.label}>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">{field.label}</p>
                  <p className="text-sm text-slate-800">{field.value}</p>
                </div>
              ))}
            </div>

            {avaliadores.length > 0 && (
              <>
                <h3 className="text-base font-semibold text-slate-800 mb-3 mt-6">Responsáveis Técnicos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {avaliadores.map((av) => (
                    <div key={av.id} className="border border-slate-200 rounded-lg p-4">
                      <p className="font-semibold text-slate-800">{av.nome}</p>
                      {av.formacao && <p className="text-sm text-slate-600 mt-0.5">{av.formacao}</p>}
                      {av.registroProfissional && <p className="text-xs text-slate-500 mt-0.5">{av.registroProfissional}</p>}
                      {av.cpf && <p className="text-xs text-slate-400 mt-0.5">CPF: {av.cpf}</p>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* ── 3. CORPO INICIAL ── */}
          <section className="bg-white rounded-xl border border-slate-200 p-8">
            <div className="no-print text-xs text-slate-400 mb-4 uppercase tracking-widest">Seção 3 — Corpo inicial (editável)</div>
            <h2 className="text-xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">2. Introdução e Metodologia</h2>
            <EditableBlock value={corpoInicial} onChange={setCorpoInicial} placeholder="Clique para editar a introdução e metodologia..." rows={6} />
          </section>

          {/* ── 4. TABELA GSE ── */}
          <section className="bg-white rounded-xl border border-slate-200 p-8">
            <div className="no-print text-xs text-slate-400 mb-4 uppercase tracking-widest">Seção 4 — Tabela de GSE</div>
            <h2 className="text-xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">3. Grupos Similares de Exposição (GSE)</h2>
            {companyGses.length === 0 ? (
              <p className="text-slate-400 text-sm">Nenhum GSE cadastrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left px-4 py-3 border border-slate-200 font-semibold text-slate-700 w-20">GSE</th>
                      <th className="text-left px-4 py-3 border border-slate-200 font-semibold text-slate-700">Setores e Cargos</th>
                      <th className="text-left px-4 py-3 border border-slate-200 font-semibold text-slate-700">Descrição das Funções</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyGses.map((gse) => {
                      const gsePositions = positions.filter((p) => gse.positionIds.includes(p.id));
                      const gseSectors = [...new Set(gsePositions.map((p) => sectors.find((s) => s.id === p.sectorId)?.name).filter(Boolean))];
                      return (
                        <tr key={gse.id} className="border-b border-slate-100">
                          <td className="px-4 py-3 border border-slate-200 font-bold text-emerald-700 align-top">
                            {String(gse.numero).padStart(2, "0")}
                          </td>
                          <td className="px-4 py-3 border border-slate-200 align-top">
                            {gseSectors.map((sName) => {
                              const sPos = gsePositions.filter((p) => sectors.find((s) => s.id === p.sectorId)?.name === sName);
                              return (
                                <div key={sName} className="mb-2">
                                  <p className="font-semibold text-slate-700 text-xs uppercase tracking-wide">{sName}</p>
                                  {sPos.map((p) => <p key={p.id} className="text-slate-600 text-xs ml-2">• {p.name}</p>)}
                                </div>
                              );
                            })}
                          </td>
                          <td className="px-4 py-3 border border-slate-200 align-top">
                            {gsePositions.filter((p) => p.descricao).map((p) => (
                              <div key={p.id} className="mb-2">
                                <p className="font-semibold text-slate-600 text-xs">{p.name}:</p>
                                <p className="text-slate-600 text-xs leading-relaxed">{p.descricao}</p>
                              </div>
                            ))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── 5. DADOS GERAIS DOS SETORES ── */}
          <section className="bg-white rounded-xl border border-slate-200 p-8">
            <div className="no-print text-xs text-slate-400 mb-4 uppercase tracking-widest">Seção 5 — Dados gerais dos setores</div>
            <h2 className="text-xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">4. Dados dos Trabalhadores por Setor</h2>
            {companySectors.length === 0 ? (
              <p className="text-slate-400 text-sm">Nenhum setor cadastrado.</p>
            ) : (
              <div className="space-y-6">
                {companySectors.map((sector) => {
                  const secSurveys = companySurveys.filter((s) => s.sector === sector.name);
                  if (secSurveys.length === 0) return null;
                  const males = secSurveys.filter((s) => s.sex === "Masculino").length;
                  const females = secSurveys.filter((s) => s.sex === "Feminino").length;
                  const heights = secSurveys.filter((s) => (s.height ?? 0) > 0);
                  const avgH = heights.length > 0 ? (heights.reduce((s, r) => s + (r.height || 0), 0) / heights.length).toFixed(1) : null;
                  const weights = secSurveys.filter((s) => (s.weight ?? 0) > 0);
                  const avgW = weights.length > 0 ? (weights.reduce((s, r) => s + (r.weight || 0), 0) / weights.length).toFixed(1) : null;
                  return (
                    <div key={sector.id} className="border border-slate-100 rounded-lg p-4">
                      <h3 className="font-semibold text-slate-800 mb-3">{sector.name}</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-2xl font-bold text-slate-800">{secSurveys.length}</p>
                          <p className="text-xs text-slate-500 mt-1">Respondentes</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3">
                          <p className="text-2xl font-bold text-blue-700">{males}</p>
                          <p className="text-xs text-slate-500 mt-1">Masculino</p>
                        </div>
                        <div className="bg-pink-50 rounded-lg p-3">
                          <p className="text-2xl font-bold text-pink-700">{females}</p>
                          <p className="text-xs text-slate-500 mt-1">Feminino</p>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-3">
                          <p className="text-2xl font-bold text-emerald-700">{avgH ? `${avgH}cm` : "—"}</p>
                          <p className="text-xs text-slate-500 mt-1">Altura Média</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── 6. VARIÁVEIS POR GSE ── */}
          {companyGses.map((gse) => {
            const label = `GSE ${String(gse.numero).padStart(2, "0")}`;
            const gsePositions = positions.filter((p) => gse.positionIds.includes(p.id));
            const gseAssessmentObjs = companyAssessments.filter((a) => gse.assessmentIds.includes(a.id));
            const gseSurveys = companySurveys.filter((s) =>
              gsePositions.some((p) => p.name === s.position && sectors.find((sec) => sec.id === p.sectorId)?.name === s.sector)
            );
            // Pain areas
            const painCounts: Record<string, number> = {};
            gseSurveys.forEach((s) => (s.painAreas || []).forEach((p) => { painCounts[p.region] = (painCounts[p.region] || 0) + 1; }));
            const topPains = Object.entries(painCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
            // NCs
            const ncCount = gseAssessmentObjs.reduce((sum, a) =>
              sum + (a.filledBlocks || []).reduce((s, fb) =>
                s + (fb.answers || []).filter((ans) => ans.value?.toLowerCase().includes("não") && !ans.value?.toLowerCase().includes("não se aplica")).length, 0
              ), 0
            );
            return (
              <section key={gse.id} className="bg-white rounded-xl border border-slate-200 p-8 page-break">
                <div className="no-print text-xs text-slate-400 mb-4 uppercase tracking-widest">Seção 6 — {label}</div>
                <h2 className="text-xl font-bold text-slate-800 mb-6 pb-2 border-b border-slate-200">5. {label} — Variáveis Ergonômicas</h2>

                {/* Riscos */}
                {gse.risks.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-slate-700 mb-2">Riscos Ergonômicos Evidenciados</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {gse.risks.map((r) => <li key={r} className="text-sm text-slate-600">{r}</li>)}
                    </ul>
                  </div>
                )}

                {/* Queixas */}
                {topPains.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-slate-700 mb-2">Queixas de Dor dos Trabalhadores</h3>
                    <div className="flex flex-wrap gap-2">
                      {topPains.map(([region, count]) => (
                        <span key={region} className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-800">
                          {region}: <strong>{count}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Avaliações */}
                {gseAssessmentObjs.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-slate-700 mb-2">Avaliações Realizadas</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="text-left px-3 py-2 border border-slate-200 font-medium text-slate-600">Checklist</th>
                            <th className="text-left px-3 py-2 border border-slate-200 font-medium text-slate-600">Cargo</th>
                            <th className="text-left px-3 py-2 border border-slate-200 font-medium text-slate-600">Posto</th>
                            <th className="text-center px-3 py-2 border border-slate-200 font-medium text-slate-600">NCs</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gseAssessmentObjs.map((a) => {
                            const pos = positions.find((p) => p.id === a.positionId);
                            const nc = (a.filledBlocks || []).reduce((s, fb) =>
                              s + (fb.answers || []).filter((ans) => ans.value?.toLowerCase().includes("não") && !ans.value?.toLowerCase().includes("não se aplica")).length, 0
                            );
                            return (
                              <tr key={a.id} className="border-b border-slate-100">
                                <td className="px-3 py-2 border border-slate-200">{a.templateName}</td>
                                <td className="px-3 py-2 border border-slate-200">{pos?.name || "—"}</td>
                                <td className="px-3 py-2 border border-slate-200">{a.workstation}</td>
                                <td className="px-3 py-2 border border-slate-200 text-center font-semibold text-red-600">{nc}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Conclusão do GSE */}
                <div>
                  <h3 className="font-semibold text-slate-700 mb-2">Conclusão do Avaliador — {label}</h3>
                  {gse.conclusao ? (
                    <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{gse.conclusao}</p>
                  ) : (
                    <p className="text-slate-400 italic text-sm">Conclusão não preenchida. Acesse o módulo GSE para registrar.</p>
                  )}
                </div>
              </section>
            );
          })}

          {/* ── 7. CONCLUSÃO GERAL AET ── */}
          <section className="bg-white rounded-xl border border-slate-200 p-8">
            <div className="no-print text-xs text-slate-400 mb-4 uppercase tracking-widest">Seção 7 — Conclusão geral da AET</div>
            <h2 className="text-xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">6. Conclusão Geral da AET</h2>
            <EditableBlock
              value={company.conclusaoAet || ""}
              onChange={saveCompanyConclusao}
              placeholder="Preencha a conclusão geral na página de estrutura da empresa ou clique aqui para editar..."
              rows={8}
            />
          </section>

          {/* ── 8. CORPO FINAL ── */}
          <section className="bg-white rounded-xl border border-slate-200 p-8">
            <div className="no-print text-xs text-slate-400 mb-4 uppercase tracking-widest">Seção 8 — Corpo final (editável)</div>
            <h2 className="text-xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">7. Considerações Finais</h2>
            <EditableBlock value={corpoFinal} onChange={setCorpoFinal} placeholder="Clique para editar as considerações finais..." rows={5} />
          </section>

          {/* ── 9. PLANO DE AÇÃO ── */}
          <section className="bg-white rounded-xl border border-slate-200 p-8">
            <div className="no-print text-xs text-slate-400 mb-4 uppercase tracking-widest">Seção 9 — Plano de ação</div>
            <h2 className="text-xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">8. Plano de Ação</h2>

            {/* Específico */}
            {planoEspecifico.length > 0 && (
              <div className="mb-8">
                <h3 className="font-semibold text-slate-700 mb-3">8.1 Plano Específico por GSE</h3>
                {planoEspecifico.map(({ gse, items }) => (
                  <div key={gse.id} className="mb-5">
                    <p className="text-sm font-semibold text-amber-700 mb-2">GSE {String(gse.numero).padStart(2, "0")}</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-amber-50">
                            <th className="text-left px-3 py-2 border border-slate-200 font-medium">#</th>
                            <th className="text-left px-3 py-2 border border-slate-200 font-medium">Não Conformidade</th>
                            <th className="text-left px-3 py-2 border border-slate-200 font-medium">Recomendação</th>
                            <th className="text-left px-3 py-2 border border-slate-200 font-medium">Cargo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, idx) => (
                            <tr key={idx} className="border-b border-slate-100">
                              <td className="px-3 py-2 border border-slate-200 font-bold text-amber-700">{idx + 1}</td>
                              <td className="px-3 py-2 border border-slate-200">{item.questionText}</td>
                              <td className="px-3 py-2 border border-slate-200 text-emerald-700">{item.recommendation}</td>
                              <td className="px-3 py-2 border border-slate-200">{item.positionName}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Geral */}
            {planoGeralItems.length > 0 && (
              <div>
                <h3 className="font-semibold text-slate-700 mb-3">8.2 Plano Geral da Empresa</h3>
                <div className="space-y-2">
                  {planoGeralItems.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                      <span className="w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                      <p className="text-sm text-red-800">{item.item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {planoEspecifico.length === 0 && planoGeralItems.length === 0 && (
              <p className="text-slate-400 text-sm">Nenhum item no plano de ação. Configure os planos nas respectivas seções.</p>
            )}
          </section>

        </div>
      </div>
    </>
  );
}
