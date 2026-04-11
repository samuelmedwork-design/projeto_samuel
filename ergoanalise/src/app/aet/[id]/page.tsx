"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useData, ActionPlanQuestion } from "@/contexts/DataContext";
import { useToast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";
import GseManager from "@/components/GseManager";
import {
  FiArrowLeft, FiArrowRight, FiCheckCircle, FiPrinter,
  FiAlertTriangle, FiTrash2, FiPlus, FiX,
} from "react-icons/fi";

/* ─────────────── Tipos ─────────────────────────────────────────────── */
interface AetActionResponse {
  id: string;
  questionText: string;
  priority: ActionPlanQuestion["priority"];
  resposta: "sim" | "nao" | "nao_se_aplica" | null;
  isCustom: boolean;
  ordem: number;
}

/* ─────────────── Helpers ────────────────────────────────────────────── */
function priorityLabel(p: string) {
  const map: Record<string, string> = { baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente" };
  return map[p] || p;
}

function priorityColor(p: string) {
  const map: Record<string, string> = {
    baixa: "bg-slate-100 text-slate-600",
    media: "bg-amber-100 text-amber-700",
    alta: "bg-orange-100 text-orange-700",
    urgente: "bg-red-100 text-red-700",
  };
  return map[p] || "bg-slate-100 text-slate-600";
}

/* ─────────────── Step 3: Plano de Ação ─────────────────────────────── */
function PlanoAcaoStep({ aetId, companyId }: { aetId: string; companyId: string }) {
  const { actionPlanQuestions, assessments, positions, gses, updateGse } = useData();
  const { toast } = useToast();

  const [responses, setResponses] = useState<AetActionResponse[]>([]);
  const [loadingResp, setLoadingResp] = useState(true);
  const [newCustom, setNewCustom] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);

  const companyGses = useMemo(() => gses.filter((g) => g.companyId === companyId).sort((a, b) => a.numero - b.numero), [gses, companyId]);

  // Load responses from DB
  const loadResponses = useCallback(async () => {
    const { data } = await supabase.from("aet_action_responses").select("*").eq("aet_id", aetId).order("ordem");
    if (data) {
      setResponses(data.map((r: any) => ({
        id: r.id,
        questionText: r.question_text,
        priority: r.priority,
        resposta: r.resposta || null,
        isCustom: r.is_custom || false,
        ordem: r.ordem || 0,
      })));
    }
    setLoadingResp(false);
  }, [aetId]);

  // Initialize responses from action_plan_questions if not yet created
  useEffect(() => {
    loadResponses().then(async () => {
      // After load, check if we need to seed from template
      const { data: existing } = await supabase.from("aet_action_responses").select("id").eq("aet_id", aetId).limit(1);
      if (!existing || existing.length === 0) {
        // Seed from action_plan_questions
        const sorted = [...actionPlanQuestions].sort((a, b) => a.ordem - b.ordem);
        if (sorted.length > 0) {
          const inserts = sorted.map((q, i) => ({
            aet_id: aetId,
            question_text: q.question,
            priority: q.priority,
            resposta: null,
            is_custom: false,
            ordem: i,
          }));
          await supabase.from("aet_action_responses").insert(inserts);
          await loadResponses();
        } else {
          setLoadingResp(false);
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aetId]);

  const setResposta = async (respId: string, val: "sim" | "nao" | "nao_se_aplica") => {
    const current = responses.find((r) => r.id === respId);
    const newVal = current?.resposta === val ? null : val;
    await supabase.from("aet_action_responses").update({ resposta: newVal }).eq("id", respId);
    setResponses((prev) => prev.map((r) => (r.id === respId ? { ...r, resposta: newVal } : r)));
  };

  const addCustomItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustom.trim()) return;
    setAddingCustom(true);
    const maxOrdem = responses.reduce((m, r) => Math.max(m, r.ordem), 0);
    const { data, error } = await supabase.from("aet_action_responses").insert({
      aet_id: aetId,
      question_text: newCustom.trim(),
      priority: "media",
      resposta: null,
      is_custom: true,
      ordem: maxOrdem + 1,
    }).select().single();
    if (!error && data) {
      setResponses((prev) => [...prev, { id: data.id, questionText: data.question_text, priority: data.priority, resposta: null, isCustom: true, ordem: data.ordem }]);
      setNewCustom("");
      toast("Item adicionado!");
    }
    setAddingCustom(false);
  };

  const removeCustomItem = async (id: string) => {
    await supabase.from("aet_action_responses").delete().eq("id", id);
    setResponses((prev) => prev.filter((r) => r.id !== id));
  };

  const respostaBtnCls = (current: string | null, val: string) => {
    const colors: Record<string, string> = {
      sim: current === val ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-300 text-slate-600 hover:border-emerald-400",
      nao: current === val ? "bg-red-500 text-white border-red-500" : "border-slate-300 text-slate-600 hover:border-red-400",
      nao_se_aplica: current === val ? "bg-slate-500 text-white border-slate-500" : "border-slate-300 text-slate-600 hover:border-slate-400",
    };
    return `px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${colors[val]}`;
  };

  // Specific plan: NC items from assessments per GSE
  const getGseNcItems = (gse: typeof companyGses[0]) => {
    const items: { id: string; questionText: string; recommendation: string; blockName: string; positionName: string }[] = [];
    gse.assessmentIds.forEach((assessmentId) => {
      const assessment = assessments.find((a) => a.id === assessmentId);
      if (!assessment) return;
      (assessment.filledBlocks || []).forEach((fb) => {
        (fb.answers || []).forEach((ans) => {
          const isNC = ans.value?.toLowerCase().includes("não") && !ans.value?.toLowerCase().includes("não se aplica");
          if (isNC && ans.recommendation?.trim()) {
            items.push({
              id: `${assessmentId}::${ans.questionId}`,
              questionText: ans.questionText,
              recommendation: ans.recommendation,
              blockName: fb.blockName,
              positionName: positions.find((p) => p.id === assessment.positionId)?.name || "",
            });
          }
        });
      });
    });
    return items.filter((item) => !gse.excludedActionIds.includes(item.id));
  };

  const removeSpecificItem = async (gse: typeof companyGses[0], itemId: string) => {
    const updated = [...gse.excludedActionIds, itemId];
    await updateGse(gse.id, { excludedActionIds: updated });
    toast("Item removido do plano específico.");
  };

  if (loadingResp) return <div className="py-8 text-center text-slate-400 text-sm">Carregando...</div>;

  return (
    <div className="space-y-8">
      {/* Plano Geral */}
      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">Plano de Ação Geral</h3>
        <p className="text-sm text-slate-500 mb-4">
          Responda cada item. Respostas "Não" indicam ações necessárias e aparecerão no plano de ação da AET.
        </p>

        {/* Adicionar item personalizado */}
        <form onSubmit={addCustomItem} className="flex gap-2 mb-4">
          <input
            value={newCustom}
            onChange={(e) => setNewCustom(e.target.value)}
            placeholder="Adicionar item personalizado ao plano geral..."
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
          />
          <button type="submit" disabled={addingCustom} className="p-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50">
            <FiPlus size={16} />
          </button>
        </form>

        {responses.length === 0 ? (
          <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl">
            <p className="text-sm">Nenhuma pergunta no plano de ação geral.</p>
            <p className="text-xs mt-1">Cadastre perguntas em Cadastros → Plano de Ação Geral.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {responses.map((r) => (
              <div key={r.id} className={`bg-white border rounded-lg p-4 ${r.resposta === "nao" ? "border-red-200 bg-red-50" : "border-slate-200"}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-slate-800">{r.questionText}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${priorityColor(r.priority)}`}>{priorityLabel(r.priority)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => setResposta(r.id, "sim")} className={respostaBtnCls(r.resposta, "sim")}>Sim</button>
                      <button onClick={() => setResposta(r.id, "nao")} className={respostaBtnCls(r.resposta, "nao")}>Não</button>
                      <button onClick={() => setResposta(r.id, "nao_se_aplica")} className={respostaBtnCls(r.resposta, "nao_se_aplica")}>N/A</button>
                    </div>
                  </div>
                  {r.isCustom && (
                    <button onClick={() => removeCustomItem(r.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                      <FiX size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plano Específico por GSE */}
      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">Plano de Ação Específico (por GSE)</h3>
        <p className="text-sm text-slate-500 mb-4">
          Não conformidades com recomendação encontradas nas avaliações. Remova itens que não se aplicam.
        </p>

        {companyGses.length === 0 ? (
          <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl">
            <p className="text-sm">Nenhum GSE definido nesta AET.</p>
          </div>
        ) : (
          companyGses.map((gse) => {
            const items = getGseNcItems(gse);
            return (
              <div key={gse.id} className="mb-4">
                <p className="text-sm font-semibold text-amber-700 mb-2">GSE {String(gse.numero).padStart(2, "0")} — {items.length} item(s)</p>
                {items.length === 0 ? (
                  <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-4 py-3">Nenhuma NC com recomendação nas avaliações deste GSE.</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-3">
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                            <FiAlertTriangle size={10} className="text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-500 mb-0.5">{item.blockName} · {item.positionName}</p>
                            <p className="text-sm text-slate-700"><span className="font-medium">NC:</span> {item.questionText}</p>
                            <p className="text-sm text-emerald-700 bg-emerald-50 rounded px-2 py-1 mt-1">
                              <span className="font-medium">Recomendação:</span> {item.recommendation}
                            </p>
                          </div>
                          <button
                            onClick={() => removeSpecificItem(gse, item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                            title="Remover do plano"
                          >
                            <FiTrash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ─────────────── Print Document ────────────────────────────────────── */
function printAet(data: PrintData) {
  const { company, avaliadores, gses, surveys, positions, sectors, documentTemplates, aet, responses, companyGses } = data;

  const cover = documentTemplates.find((t) => t.type === "cover")?.content || "";
  const bodyInitial = documentTemplates.find((t) => t.type === "body_initial")?.content || "";
  const bodyFinal = documentTemplates.find((t) => t.type === "body_final")?.content || "";

  const companySurveys = surveys.filter((s) => s.companyId === company.id);

  // Section 4: GSE table
  const gseTableRows = companyGses.map((gse) => {
    const gsePositions = positions.filter((p) => gse.positionIds.includes(p.id));
    const gseSectors = [...new Set(gsePositions.map((p) => sectors.find((s) => s.id === p.sectorId)?.name).filter(Boolean))];
    const cellSectors = gseSectors.join(", ");
    const cellCargos = gsePositions.map((p) => p.name).join(", ");
    const cellDesc = gsePositions.filter((p) => p.descricao).map((p) => `<strong>${p.name}:</strong> ${p.descricao}`).join("<br/>");
    return `<tr>
      <td style="padding:8px;border:1px solid #ddd;font-weight:bold;vertical-align:top;">GSE ${String(gse.numero).padStart(2, "0")}</td>
      <td style="padding:8px;border:1px solid #ddd;vertical-align:top;">${cellSectors}<br/><em>${cellCargos}</em></td>
      <td style="padding:8px;border:1px solid #ddd;vertical-align:top;">${cellDesc || "<em>Sem descrição</em>"}</td>
    </tr>`;
  }).join("");

  // Section 5: Dados gerais por setor
  const sectorStats = sectors.filter((s) => s.companyId === company.id).map((sector) => {
    const sectorPositionNames = positions.filter((p) => p.sectorId === sector.id).map((p) => p.name);
    const sectorSurveys = companySurveys.filter((sv) => sectorPositionNames.includes(sv.position));
    if (sectorSurveys.length === 0) return null;
    const males = sectorSurveys.filter((sv) => sv.sex?.toLowerCase() === "masculino" || sv.sex?.toLowerCase() === "m").length;
    const females = sectorSurveys.filter((sv) => sv.sex?.toLowerCase() === "feminino" || sv.sex?.toLowerCase() === "f").length;
    const validHeights = sectorSurveys.filter((sv) => sv.height > 0);
    const avgHeight = validHeights.length > 0 ? (validHeights.reduce((s, sv) => s + sv.height, 0) / validHeights.length).toFixed(2) : "-";
    const validWeights = sectorSurveys.filter((sv) => (sv as any).weight > 0);
    const avgWeight = validWeights.length > 0 ? (validWeights.reduce((s, sv) => s + ((sv as any).weight || 0), 0) / validWeights.length).toFixed(1) : "-";
    return `<tr>
      <td style="padding:8px;border:1px solid #ddd;vertical-align:top;">${sector.name}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">${males > 0 ? `Masc: ${males}` : ""}${males > 0 && females > 0 ? " | " : ""}${females > 0 ? `Fem: ${females}` : ""}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">${avgHeight} m</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">${avgWeight} kg</td>
    </tr>`;
  }).filter(Boolean).join("");

  // Section 6: Reconhecimento de riscos por GSE
  const gseRiscosSections = companyGses.map((gse) => {
    const gsePositions = positions.filter((p) => gse.positionIds.includes(p.id));
    const gsePositionNames = gsePositions.map((p) => p.name);
    const gseSurveys = companySurveys.filter((sv) => gsePositionNames.includes(sv.position));

    // Pain complaints
    const painMap: Record<string, number> = {};
    gseSurveys.forEach((sv) => {
      (sv.painAreas || []).forEach((pa) => {
        const key = `${pa.region}${pa.side && pa.side !== "nsa" ? ` (${pa.side})` : ""}`;
        painMap[key] = (painMap[key] || 0) + 1;
      });
    });
    const painItems = Object.entries(painMap).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v}`).join("; ");

    // Assessments linked
    const assessmentLinks = gse.assessmentIds.map((aid) => {
      const a = data.assessments.find((x) => x.id === aid);
      if (!a) return "";
      const pos = positions.find((p) => p.id === a.positionId);
      return `${a.templateName} — ${pos?.name || ""} (${a.workstation})`;
    }).filter(Boolean);

    return `
      <div style="margin-bottom:24px;page-break-inside:avoid;">
        <h3 style="font-size:14px;font-weight:bold;color:#065f46;margin-bottom:8px;">GSE ${String(gse.numero).padStart(2, "0")}</h3>
        <p style="margin:4px 0;"><strong>Riscos ergonômicos evidenciados:</strong></p>
        ${gse.risks.length > 0
          ? `<ul style="margin:4px 0 8px 20px;">${gse.risks.map((r) => `<li>${r}</li>`).join("")}</ul>`
          : `<p style="color:#64748b;margin:4px 0 8px;">Nenhum risco selecionado.</p>`}
        <p style="margin:4px 0;"><strong>Queixas de dores (funcionários deste GSE):</strong></p>
        <p style="margin:4px 0 8px;color:#64748b;">${painItems || "Nenhuma queixa registrada."}</p>
        <p style="margin:4px 0;"><strong>Avaliações realizadas:</strong></p>
        ${assessmentLinks.length > 0
          ? `<ul style="margin:4px 0 8px 20px;">${assessmentLinks.map((a) => `<li>${a}</li>`).join("")}</ul>`
          : `<p style="color:#64748b;margin:4px 0 8px;">Nenhuma avaliação vinculada.</p>`}
        <p style="margin:4px 0;"><strong>Conclusão do GSE:</strong></p>
        <p style="margin:4px 0 8px;white-space:pre-wrap;">${gse.conclusao || "<em>Não preenchida.</em>"}</p>
      </div>`;
  }).join("");

  // Section 9: Action plan
  const actionNao = responses.filter((r) => r.resposta === "nao");
  const gseSpecificItems = companyGses.flatMap((gse) => {
    const gsePositions = positions.filter((p) => gse.positionIds.includes(p.id));
    const items: { gseLabel: string; questionText: string; recommendation: string }[] = [];
    gse.assessmentIds.forEach((aid) => {
      const a = data.assessments.find((x) => x.id === aid);
      if (!a) return;
      (a.filledBlocks || []).forEach((fb) => {
        (fb.answers || []).forEach((ans) => {
          const isNC = ans.value?.toLowerCase().includes("não") && !ans.value?.toLowerCase().includes("não se aplica");
          if (isNC && ans.recommendation?.trim() && !gse.excludedActionIds.includes(`${aid}::${ans.questionId}`)) {
            items.push({ gseLabel: `GSE ${String(gse.numero).padStart(2, "0")}`, questionText: ans.questionText, recommendation: ans.recommendation });
          }
        });
      });
    });
    return items;
  });

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>AET — ${company.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; line-height: 1.6; }
  h1 { font-size: 22px; font-weight: bold; }
  h2 { font-size: 16px; font-weight: bold; margin: 20px 0 10px; color: #1e293b; border-bottom: 2px solid #059669; padding-bottom: 4px; }
  h3 { font-size: 13px; font-weight: bold; margin: 12px 0 6px; }
  p { margin: 6px 0; }
  ul { margin: 6px 0 6px 20px; }
  li { margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th { background: #059669; color: white; padding: 8px; border: 1px solid #ddd; text-align: left; font-size: 11px; }
  td { padding: 8px; border: 1px solid #ddd; font-size: 11px; }
  .page-break { page-break-before: always; }
  .cover { text-align: center; padding: 80px 40px; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; }
  .cover h1 { font-size: 28px; margin-bottom: 12px; }
  .cover p { font-size: 14px; color: #475569; margin: 4px 0; }
  .section { padding: 0 0 24px; }
  .tag { display: inline-block; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; padding: 2px 8px; margin: 2px; font-size: 10px; }
  pre { white-space: pre-wrap; font-family: Arial, sans-serif; }
  @media print {
    body { margin: 20mm 25mm; }
    .cover { page-break-after: always; }
    .no-print { display: none; }
  }
</style>
</head>
<body>

<!-- 1. CAPA -->
<div class="cover">
  <h1>Análise Ergonômica do Trabalho</h1>
  <p style="font-size:18px;font-weight:bold;margin:8px 0;">${company.name}</p>
  <p>CNPJ: ${company.cnpj || ""}</p>
  <p>${company.city || ""}</p>
  <p style="margin-top:16px;">${new Date().toLocaleDateString("pt-BR", { year: "numeric", month: "long", day: "numeric" })}</p>
  ${cover ? `<div style="margin-top:32px;white-space:pre-wrap;">${cover}</div>` : ""}
</div>

<!-- 2. DADOS -->
<div class="page-break section">
  <h2>2. Dados da Empresa e Avaliadores</h2>
  <h3>Empresa</h3>
  <table>
    <tr><th style="width:30%">Campo</th><th>Dados</th></tr>
    <tr><td><strong>Razão Social</strong></td><td>${company.razaoSocial || company.name}</td></tr>
    <tr><td><strong>Nome Fantasia</strong></td><td>${company.name}</td></tr>
    <tr><td><strong>CNPJ</strong></td><td>${company.cnpj || "-"}</td></tr>
    <tr><td><strong>Cidade</strong></td><td>${company.city || "-"}</td></tr>
    <tr><td><strong>Endereço</strong></td><td>${company.endereco || "-"}</td></tr>
    <tr><td><strong>CNAE Principal</strong></td><td>${company.cnaePrincipal || "-"}</td></tr>
    <tr><td><strong>Telefone</strong></td><td>${company.telefone || "-"}</td></tr>
    <tr><td><strong>E-mail</strong></td><td>${company.email || "-"}</td></tr>
  </table>
  <h3 style="margin-top:16px;">Avaliadores</h3>
  ${avaliadores.length === 0 ? "<p>Nenhum avaliador cadastrado.</p>" : `
  <table>
    <tr><th>Nome</th><th>Formação</th><th>Registro Profissional</th></tr>
    ${avaliadores.map((a) => `<tr><td>${a.nome}</td><td>${a.formacao || "-"}</td><td>${a.registroProfissional || "-"}</td></tr>`).join("")}
  </table>`}
</div>

<!-- 3. CORPO INICIAL -->
${bodyInitial ? `<div class="page-break section"><h2>3. Introdução</h2><div style="white-space:pre-wrap;">${bodyInitial}</div></div>` : ""}

<!-- 4. TABELA GSE -->
<div class="page-break section">
  <h2>4. Divisão dos Grupos Similares de Exposição (GSE)</h2>
  ${companyGses.length === 0 ? "<p>Nenhum GSE definido.</p>" : `
  <table>
    <tr>
      <th style="width:10%">Nº GSE</th>
      <th style="width:30%">Setores e Cargos</th>
      <th>Descrição das Funções</th>
    </tr>
    ${gseTableRows}
  </table>`}
</div>

<!-- 5. DADOS GERAIS DOS SETORES -->
<div class="page-break section">
  <h2>5. Dados Gerais dos Setores da Empresa</h2>
  ${sectorStats ? `
  <table>
    <tr><th>Setor</th><th>Sexo</th><th>Altura Média</th><th>Peso Médio</th></tr>
    ${sectorStats}
  </table>` : "<p>Nenhum dado de questionário disponível.</p>"}
</div>

<!-- 6. RECONHECIMENTO DE RISCOS -->
<div class="page-break section">
  <h2>6. Reconhecimento de Riscos Ergonômicos por GSE</h2>
  ${gseRiscosSections || "<p>Nenhum GSE definido.</p>"}
</div>

<!-- 7. CONCLUSÃO GERAL -->
<div class="page-break section">
  <h2>7. Conclusão Geral da AET</h2>
  <div style="white-space:pre-wrap;">${aet.conclusaoGeral || "<em>Conclusão não preenchida.</em>"}</div>
</div>

<!-- 8. CORPO FINAL + ASSINATURAS -->
<div class="page-break section">
  <h2>8. Considerações Finais</h2>
  ${bodyFinal ? `<div style="white-space:pre-wrap;margin-bottom:24px;">${bodyFinal}</div>` : ""}
  <h3 style="margin-top:32px;">Assinaturas</h3>
  <div style="display:flex;gap:40px;margin-top:24px;flex-wrap:wrap;">
    ${avaliadores.map((a) => `
    <div style="text-align:center;min-width:180px;">
      <div style="border-top:1px solid #1e293b;width:180px;margin:0 auto;"></div>
      <p style="margin-top:6px;">${a.nome}</p>
      <p style="font-size:10px;color:#64748b;">${a.formacao || ""}${a.registroProfissional ? ` — ${a.registroProfissional}` : ""}</p>
    </div>`).join("")}
    <div style="text-align:center;min-width:180px;">
      <div style="border-top:1px solid #1e293b;width:180px;margin:0 auto;"></div>
      <p style="margin-top:6px;">Representante da Empresa</p>
      <p style="font-size:10px;color:#64748b;">${company.name}</p>
    </div>
  </div>
</div>

<!-- 9. PLANO DE AÇÃO -->
<div class="page-break section">
  <h2>9. Plano de Ação</h2>

  <h3>9.1 Plano de Ação Geral</h3>
  ${actionNao.length === 0 ? "<p>Nenhuma ação identificada no plano geral.</p>" : `
  <table>
    <tr><th style="width:5%">#</th><th>Ação Necessária</th><th style="width:15%">Prioridade</th></tr>
    ${actionNao.map((r, i) => `<tr><td>${i + 1}</td><td>${r.questionText}</td><td>${priorityLabel(r.priority)}</td></tr>`).join("")}
  </table>`}

  <h3 style="margin-top:20px;">9.2 Plano de Ação Específico (por GSE)</h3>
  ${gseSpecificItems.length === 0 ? "<p>Nenhum item no plano específico.</p>" : `
  <table>
    <tr><th style="width:10%">GSE</th><th>Não Conformidade</th><th>Recomendação</th></tr>
    ${gseSpecificItems.map((item) => `<tr><td>${item.gseLabel}</td><td>${item.questionText}</td><td>${item.recommendation}</td></tr>`).join("")}
  </table>`}
</div>

</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
}

interface PrintData {
  company: ReturnType<typeof useData>["companies"][0];
  avaliadores: ReturnType<typeof useData>["avaliadores"];
  gses: ReturnType<typeof useData>["gses"];
  companyGses: ReturnType<typeof useData>["gses"];
  surveys: ReturnType<typeof useData>["surveys"];
  assessments: ReturnType<typeof useData>["assessments"];
  positions: ReturnType<typeof useData>["positions"];
  sectors: ReturnType<typeof useData>["sectors"];
  documentTemplates: ReturnType<typeof useData>["documentTemplates"];
  aet: { conclusaoGeral: string };
  responses: AetActionResponse[];
}

/* ─────────────── Main Page ─────────────────────────────────────────── */
export default function AetPipelinePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const {
    companies, avaliadores, gses, surveys, assessments, positions, sectors, documentTemplates,
    aets, updateAet,
  } = useData();

  const aet = aets.find((a) => a.id === id);
  const company = aet ? companies.find((c) => c.id === aet.companyId) : null;
  const companyGses = useMemo(
    () => gses.filter((g) => g.companyId === aet?.companyId).sort((a, b) => a.numero - b.numero),
    [gses, aet]
  );

  const [step, setStep] = useState(aet?.currentStep || 1);
  const [conclusao, setConclusao] = useState(aet?.conclusaoGeral || "");
  const [savingConclusao, setSavingConclusao] = useState(false);
  const [actionResponses, setActionResponses] = useState<AetActionResponse[]>([]);

  // Load responses for printing
  useEffect(() => {
    if (!id) return;
    supabase.from("aet_action_responses").select("*").eq("aet_id", id).order("ordem").then(({ data }) => {
      if (data) {
        setActionResponses(data.map((r: any) => ({
          id: r.id,
          questionText: r.question_text,
          priority: r.priority,
          resposta: r.resposta || null,
          isCustom: r.is_custom || false,
          ordem: r.ordem || 0,
        })));
      }
    });
  }, [id]);

  const goToStep = async (next: number) => {
    if (next < 1 || next > 3) return;
    await updateAet(id, { currentStep: next });
    setStep(next);
  };

  const saveConclusao = async () => {
    setSavingConclusao(true);
    await updateAet(id, { conclusaoGeral: conclusao.trim() });
    setSavingConclusao(false);
    toast("Conclusão salva!");
  };

  const handleComplete = async () => {
    await updateAet(id, { completedAt: new Date().toISOString(), currentStep: 3 });
    toast("AET concluída!");
  };

  const handlePrint = () => {
    if (!company || !aet) return;
    supabase.from("aet_action_responses").select("*").eq("aet_id", id).order("ordem").then(({ data }) => {
      const responses = (data || []).map((r: any) => ({
        id: r.id,
        questionText: r.question_text,
        priority: r.priority,
        resposta: r.resposta || null,
        isCustom: r.is_custom || false,
        ordem: r.ordem || 0,
      }));
      printAet({
        company, avaliadores, gses, companyGses, surveys,
        assessments, positions, sectors, documentTemplates,
        aet: { conclusaoGeral: conclusao },
        responses,
      });
    });
  };

  if (!aet || !company) {
    return <div className="p-8 text-slate-500">AET não encontrada.</div>;
  }

  const steps = [
    { n: 1, label: "Definição dos GSEs" },
    { n: 2, label: "Conclusão Geral" },
    { n: 3, label: "Plano de Ação" },
  ];

  const isCompleted = !!aet.completedAt;

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/aet")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-600 transition-colors mb-2"
        >
          <FiArrowLeft size={14} /> Voltar às AETs
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{company.name}</h1>
            <p className="text-slate-500 text-sm mt-1">
              Análise Ergonômica do Trabalho
              {isCompleted && <span className="ml-2 text-emerald-600 font-medium">· Concluída</span>}
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors font-medium text-sm"
          >
            <FiPrinter size={16} />
            Baixar / Imprimir AET
          </button>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <button
              onClick={() => goToStep(s.n)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                step === s.n
                  ? "bg-emerald-600 text-white"
                  : s.n < step || isCompleted
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {(s.n < step || isCompleted) && s.n !== step ? <FiCheckCircle size={14} /> : <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center text-xs">{s.n}</span>}
              {s.label}
            </button>
            {i < steps.length - 1 && <div className="w-6 h-0.5 bg-slate-200" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Etapa 1 — Definição dos GSEs</h2>
            <p className="text-sm text-slate-500 mb-6">Configure os Grupos Similares de Exposição desta empresa.</p>
            <GseManager companyId={company.id} />
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Etapa 2 — Conclusão Geral da AET</h2>
            <p className="text-sm text-slate-500 mb-4">Redija a conclusão geral desta Análise Ergonômica do Trabalho.</p>
            <textarea
              value={conclusao}
              onChange={(e) => setConclusao(e.target.value)}
              placeholder="Escreva aqui a conclusão geral da AET..."
              rows={10}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-sm text-slate-700"
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={saveConclusao}
                disabled={savingConclusao}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {savingConclusao ? "Salvando..." : "Salvar Conclusão"}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Etapa 3 — Revisão do Plano de Ação</h2>
            <p className="text-sm text-slate-500 mb-6">Revise e responda o plano de ação geral e específico por GSE.</p>
            <PlanoAcaoStep aetId={id} companyId={company.id} />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => goToStep(step - 1)}
          disabled={step === 1}
          className="flex items-center gap-2 px-5 py-2.5 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors text-sm disabled:opacity-40"
        >
          <FiArrowLeft size={15} /> Etapa Anterior
        </button>

        {step < 3 ? (
          <button
            onClick={() => goToStep(step + 1)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium"
          >
            Próxima Etapa <FiArrowRight size={15} />
          </button>
        ) : (
          <button
            onClick={handleComplete}
            disabled={isCompleted}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <FiCheckCircle size={15} />
            {isCompleted ? "Concluída" : "Concluir AET"}
          </button>
        )}
      </div>
    </div>
  );
}
