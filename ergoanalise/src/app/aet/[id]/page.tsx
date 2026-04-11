"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useData, ActionPlanQuestion, GSE_RISKS, Assessment } from "@/contexts/DataContext";
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

/* ─────────────── Body Map SVG helper ────────────────────────────────── */
function bodyMapSvg(painAreas: Array<{ region: string; side: string; intensity: string }>, w = 90, h = 207): string {
  const PIN_COORDS: Record<string, { center?: { x: number; y: number }; left?: { x: number; y: number }; right?: { x: number; y: number } }> = {
    "Olhos": { center: { x: 100, y: 30 } }, "Cabeça": { center: { x: 100, y: 16 } },
    "Pescoço": { center: { x: 100, y: 52 } }, "Trapézio": { center: { x: 100, y: 70 } },
    "Tórax": { center: { x: 100, y: 108 } }, "Lombar": { center: { x: 100, y: 160 } },
    "Nádegas": { center: { x: 100, y: 200 } },
    "Ombros": { left: { x: 62, y: 78 }, right: { x: 138, y: 78 } },
    "Braços": { left: { x: 54, y: 105 }, right: { x: 146, y: 105 } },
    "Cotovelos": { left: { x: 50, y: 132 }, right: { x: 150, y: 132 } },
    "Antebraços": { left: { x: 46, y: 158 }, right: { x: 154, y: 158 } },
    "Punhos": { left: { x: 42, y: 185 }, right: { x: 158, y: 185 } },
    "Mãos e Dedos": { left: { x: 38, y: 206 }, right: { x: 162, y: 206 } },
    "Coxas": { left: { x: 82, y: 262 }, right: { x: 118, y: 262 } },
    "Joelhos": { left: { x: 80, y: 316 }, right: { x: 120, y: 316 } },
    "Panturrilhas": { left: { x: 78, y: 362 }, right: { x: 122, y: 362 } },
    "Tornozelos": { left: { x: 76, y: 406 }, right: { x: 124, y: 406 } },
    "Pés e Dedos": { left: { x: 72, y: 436 }, right: { x: 128, y: 436 } },
  };
  const pins: Array<{ x: number; y: number; color: string }> = [];
  for (const pain of painAreas) {
    const c = PIN_COORDS[pain.region];
    if (!c) continue;
    const color = pain.intensity === "alta" ? "#ef4444" : pain.intensity === "media" ? "#eab308" : "#3b82f6";
    if (c.center) { pins.push({ x: c.center.x, y: c.center.y, color }); }
    else {
      const l = pain.side === "esquerdo" || pain.side === "ambos" || pain.side === "nsa";
      const r = pain.side === "direito" || pain.side === "ambos" || pain.side === "nsa";
      if (l && c.left) pins.push({ x: c.left.x, y: c.left.y, color });
      if (r && c.right) pins.push({ x: c.right.x, y: c.right.y, color });
    }
  }
  const silhouette = `
    <ellipse cx="100" cy="20" rx="18" ry="22"/>
    <rect x="93" y="42" width="14" height="14" rx="3"/>
    <path d="M93 50 L68 64 Q60 68 58 76 L58 82 Q62 86 68 82 L80 74 L93 68 Z"/>
    <path d="M107 50 L132 64 Q140 68 142 76 L142 82 Q138 86 132 82 L120 74 L107 68 Z"/>
    <path d="M80 68 L120 68 L122 140 Q118 148 110 152 L100 154 L90 152 Q82 148 78 140 Z"/>
    <path d="M82 148 L118 148 L116 190 Q112 198 100 200 Q88 198 84 190 Z"/>
    <path d="M58 82 Q52 92 50 108 L48 126 Q46 134 50 138 L56 136 Q56 126 58 112 L62 96 L66 84 Z"/>
    <path d="M142 82 Q148 92 150 108 L152 126 Q154 134 150 138 L144 136 Q144 126 142 112 L138 96 L134 84 Z"/>
    <path d="M48 136 Q44 150 42 168 L40 182 Q38 190 42 192 L48 190 Q48 178 50 164 L52 148 Z"/>
    <path d="M152 136 Q156 150 158 168 L160 182 Q162 190 158 192 L152 190 Q152 178 150 164 L148 148 Z"/>
    <path d="M40 190 Q36 198 34 208 Q34 216 38 218 L46 216 Q48 208 48 200 L46 192 Z"/>
    <path d="M160 190 Q164 198 166 208 Q166 216 162 218 L154 216 Q152 208 152 200 L154 192 Z"/>
    <path d="M86 196 Q82 220 80 250 L78 290 Q78 300 82 304 L88 302 Q88 290 90 258 L92 228 L94 202 Z"/>
    <path d="M114 196 Q118 220 120 250 L122 290 Q122 300 118 304 L112 302 Q112 290 110 258 L108 228 L106 202 Z"/>
    <path d="M78 302 Q76 312 78 324 Q80 330 84 330 L88 328 Q90 320 88 308 L86 302 Z"/>
    <path d="M122 302 Q124 312 122 324 Q120 330 116 330 L112 328 Q110 320 112 308 L114 302 Z"/>
    <path d="M78 330 Q76 350 74 375 L74 400 Q76 406 80 406 L84 404 Q84 390 84 370 L86 345 L86 332 Z"/>
    <path d="M122 330 Q124 350 126 375 L126 400 Q124 406 120 406 L116 404 Q116 390 116 370 L114 345 L114 332 Z"/>
    <path d="M74 404 Q72 412 74 420 Q76 424 80 422 L84 420 Q84 414 82 406 Z"/>
    <path d="M126 404 Q128 412 126 420 Q124 424 120 422 L116 420 Q116 414 118 406 Z"/>
    <path d="M72 420 Q68 428 66 436 Q66 444 72 446 L82 444 Q86 440 84 430 L82 422 Z"/>
    <path d="M128 420 Q132 428 134 436 Q134 444 128 446 L118 444 Q114 440 116 430 L118 422 Z"/>`;
  return `<svg viewBox="0 0 200 460" width="${w}" height="${h}" style="display:block;">
    <g fill="#d4d4d4" stroke="#a3a3a3" stroke-width="1" stroke-linejoin="round">${silhouette}</g>
    ${pins.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="8" fill="${p.color}" stroke="#fff" stroke-width="2.5"/>`).join("")}
  </svg>`;
}

/* ─────────────── Print helpers ─────────────────────────────────────── */
const WORK_RELATION_LABELS: Record<string, string> = {
  ja_inicia_com_dor: "Já inicio o trabalho com essa dor",
  piora_ao_longo: "A dor piora ao longo do trabalho",
  surge_ao_final: "A dor só surge na hora de ir embora",
  sem_relacao: "Não tem relação com o trabalho",
};

/* ─────────────── Print Document ────────────────────────────────────── */
interface PrintData {
  company: ReturnType<typeof useData>["companies"][0];
  avaliadores: ReturnType<typeof useData>["avaliadores"];
  companyGses: ReturnType<typeof useData>["gses"];
  surveys: ReturnType<typeof useData>["surveys"];
  fullAssessments: Assessment[];
  positions: ReturnType<typeof useData>["positions"];
  sectors: ReturnType<typeof useData>["sectors"];
  documentTemplates: ReturnType<typeof useData>["documentTemplates"];
  aet: { conclusaoGeral: string };
  responses: AetActionResponse[];
}

function printAet(data: PrintData) {
  const { company, avaliadores, companyGses, surveys, fullAssessments, positions, sectors, documentTemplates, aet, responses } = data;

  const cover = documentTemplates.find((t) => t.type === "cover")?.content || "";
  const bodyInitial = documentTemplates.find((t) => t.type === "body_initial")?.content || "";
  const bodyFinal = documentTemplates.find((t) => t.type === "body_final")?.content || "";
  const companySurveys = surveys.filter((s) => s.companyId === company.id);

  /* ── Section 4: GSE table with proper rowspans ── */
  let gseTableBody = "";
  for (const gse of companyGses) {
    const gsePositions = positions.filter((p) => gse.positionIds.includes(p.id));
    // Group positions by sector (preserving sector order)
    const sectorMap = new Map<string, typeof gsePositions>();
    for (const pos of gsePositions) {
      if (!sectorMap.has(pos.sectorId)) sectorMap.set(pos.sectorId, []);
      sectorMap.get(pos.sectorId)!.push(pos);
    }
    const sectorEntries = Array.from(sectorMap.entries());
    const totalRows = gsePositions.length;
    if (totalRows === 0) {
      gseTableBody += `<tr>
        <td style="padding:7px 8px;border:1px solid #ddd;font-weight:bold;color:#065f46;text-align:center;vertical-align:middle;">GSE ${String(gse.numero).padStart(2, "0")}</td>
        <td colspan="3" style="padding:7px 8px;border:1px solid #ddd;color:#94a3b8;font-style:italic;">Nenhum cargo vinculado</td>
      </tr>`;
      continue;
    }
    let gseFirstRow = true;
    for (const [sectorId, sectorPositions] of sectorEntries) {
      const sector = sectors.find((s) => s.id === sectorId);
      const sectorName = sector?.name || sectorId;
      let sectorFirstRow = true;
      for (const pos of sectorPositions) {
        let row = "<tr>";
        if (gseFirstRow) {
          row += `<td rowspan="${totalRows}" style="padding:7px 8px;border:1px solid #ddd;font-weight:bold;color:#065f46;text-align:center;vertical-align:middle;background:#f0fdf4;">GSE ${String(gse.numero).padStart(2, "0")}</td>`;
          gseFirstRow = false;
        }
        if (sectorFirstRow) {
          row += `<td rowspan="${sectorPositions.length}" style="padding:7px 8px;border:1px solid #ddd;font-weight:600;vertical-align:middle;background:#f8fafc;">${sectorName}</td>`;
          sectorFirstRow = false;
        }
        row += `<td style="padding:7px 8px;border:1px solid #ddd;vertical-align:top;">${pos.name}</td>`;
        row += `<td style="padding:7px 8px;border:1px solid #ddd;vertical-align:top;color:#475569;">${pos.descricao || "<em style='color:#94a3b8;'>Sem descrição</em>"}</td>`;
        row += "</tr>";
        gseTableBody += row;
      }
    }
  }

  /* ── Section 5: Population profile (charts per sector) ── */
  const BAR_MAX = 240;
  let sectorProfileHtml = "";
  for (const sector of sectors.filter((s) => s.companyId === company.id)) {
    const sectorPositionNames = positions.filter((p) => p.sectorId === sector.id).map((p) => p.name);
    const sectorSurveys = companySurveys.filter((sv) => sectorPositionNames.includes(sv.position));
    if (sectorSurveys.length === 0) continue;
    const total = sectorSurveys.length;
    const males = sectorSurveys.filter((sv) => sv.sex?.toLowerCase().startsWith("m")).length;
    const females = sectorSurveys.filter((sv) => sv.sex?.toLowerCase().startsWith("f")).length;
    const other = total - males - females;
    const maleBar = Math.round((males / total) * BAR_MAX);
    const femaleBar = Math.round((females / total) * BAR_MAX);
    const otherBar = Math.round((other / total) * BAR_MAX);
    const validH = sectorSurveys.filter((sv) => sv.height > 0);
    const avgH = validH.length ? (validH.reduce((s, sv) => s + sv.height, 0) / validH.length).toFixed(2) : null;
    const validW = sectorSurveys.filter((sv) => (sv as any).weight > 0);
    const avgW = validW.length ? (validW.reduce((s, sv) => s + ((sv as any).weight || 0), 0) / validW.length).toFixed(1) : null;

    sectorProfileHtml += `
    <div style="margin-bottom:24px;padding:14px 16px;border:1px solid #e2e8f0;border-radius:8px;page-break-inside:avoid;">
      <h3 style="font-size:13px;font-weight:bold;color:#1e293b;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid #f1f5f9;">${sector.name}</h3>
      <div style="display:flex;gap:32px;align-items:flex-start;flex-wrap:wrap;">
        <!-- Sex distribution chart -->
        <div style="flex:1;min-width:220px;">
          <p style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Distribuição por Sexo</p>
          ${males > 0 ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
            <span style="font-size:10px;width:70px;color:#475569;">Masculino</span>
            <div style="display:flex;align-items:center;gap:6px;">
              <div style="width:${maleBar}px;height:16px;background:#3b82f6;border-radius:3px;"></div>
              <span style="font-size:10px;color:#1e40af;font-weight:600;">${males} (${Math.round((males/total)*100)}%)</span>
            </div>
          </div>` : ""}
          ${females > 0 ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
            <span style="font-size:10px;width:70px;color:#475569;">Feminino</span>
            <div style="display:flex;align-items:center;gap:6px;">
              <div style="width:${femaleBar}px;height:16px;background:#ec4899;border-radius:3px;"></div>
              <span style="font-size:10px;color:#9d174d;font-weight:600;">${females} (${Math.round((females/total)*100)}%)</span>
            </div>
          </div>` : ""}
          ${other > 0 ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
            <span style="font-size:10px;width:70px;color:#475569;">Outro/N.I.</span>
            <div style="display:flex;align-items:center;gap:6px;">
              <div style="width:${otherBar}px;height:16px;background:#94a3b8;border-radius:3px;"></div>
              <span style="font-size:10px;color:#475569;font-weight:600;">${other} (${Math.round((other/total)*100)}%)</span>
            </div>
          </div>` : ""}
        </div>
        <!-- Anthropometry -->
        <div style="min-width:160px;">
          <p style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Dados Antropométricos</p>
          ${avgH ? `<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;padding:8px 12px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;">
            <span style="font-size:22px;font-weight:bold;color:#0ea5e9;">${avgH}</span>
            <div><p style="font-size:9px;color:#64748b;margin:0;">m</p><p style="font-size:10px;color:#475569;margin:0;">Altura Média</p></div>
          </div>` : ""}
          ${avgW ? `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;">
            <span style="font-size:22px;font-weight:bold;color:#10b981;">${avgW}</span>
            <div><p style="font-size:9px;color:#64748b;margin:0;">kg</p><p style="font-size:10px;color:#475569;margin:0;">Peso Médio</p></div>
          </div>` : ""}
        </div>
      </div>
    </div>`;
  }

  /* ── Section 6: Risks, pain, assessments per GSE ── */
  let gseDetailHtml = "";
  for (const gse of companyGses) {
    const gseLabel = `GSE ${String(gse.numero).padStart(2, "0")}`;
    const gsePositions = positions.filter((p) => gse.positionIds.includes(p.id));
    const gsePositionNames = gsePositions.map((p) => p.name);
    const gseSurveys = companySurveys.filter((sv) => gsePositionNames.includes(sv.position));

    /* 6a: Ergonomic risks checklist */
    const risksHtml = `
    <div style="margin-bottom:20px;">
      <h4 style="font-size:12px;font-weight:bold;color:#065f46;margin-bottom:10px;">Riscos Ergonômicos Evidenciados</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
        ${(GSE_RISKS as readonly string[]).map((risco) => {
          const selected = gse.risks.includes(risco);
          return `<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:5px;${selected ? "background:#ecfdf5;border:1px solid #6ee7b7;" : "background:#f8fafc;border:1px solid #f1f5f9;"}">
            <div style="width:14px;height:14px;border-radius:3px;border:2px solid ${selected ? "#059669" : "#cbd5e1"};background:${selected ? "#059669" : "white"};display:flex;align-items:center;justify-content:center;shrink:0;">
              ${selected ? '<svg width="10" height="8" viewBox="0 0 10 8"><polyline points="1,4 4,7 9,1" stroke="white" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ""}
            </div>
            <span style="font-size:10px;color:${selected ? "#065f46" : "#94a3b8"};font-weight:${selected ? "600" : "400"};">${risco}</span>
          </div>`;
        }).join("")}
      </div>
    </div>`;

    /* 6b: Pain complaints (like reports page) */
    let painHtml = `<div style="margin-bottom:20px;"><h4 style="font-size:12px;font-weight:bold;color:#065f46;margin-bottom:10px;">Queixas Registradas pelos Trabalhadores</h4>`;
    if (gseSurveys.length === 0) {
      painHtml += `<p style="font-size:11px;color:#94a3b8;padding:10px;background:#f8fafc;border-radius:6px;">Nenhum questionário registrado para os cargos deste GSE.</p>`;
    } else {
      for (const sv of gseSurveys) {
        const hasPain = (sv.painAreas || []).length > 0;
        const sortedPains = [...(sv.painAreas || [])].sort(
          (a, b) => ({ alta: 0, media: 1, baixa: 2 }[a.intensity] ?? 2) - ({ alta: 0, media: 1, baixa: 2 }[b.intensity] ?? 2)
        );
        painHtml += `
        <div style="display:flex;gap:16px;align-items:flex-start;padding:12px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px;page-break-inside:avoid;">
          <!-- Worker info -->
          <div style="flex:1;min-width:140px;">
            <p style="font-size:13px;font-weight:bold;color:#1e293b;margin-bottom:4px;">${sv.workerName}</p>
            <p style="font-size:10px;color:#64748b;margin:2px 0;"><span style="color:#94a3b8;">Setor:</span> ${sv.sector}</p>
            <p style="font-size:10px;color:#64748b;margin:2px 0;"><span style="color:#94a3b8;">Cargo:</span> ${sv.position}</p>
            <p style="font-size:10px;color:#64748b;margin:2px 0;"><span style="color:#94a3b8;">Altura:</span> ${sv.height} cm</p>
            ${(sv as any).weight ? `<p style="font-size:10px;color:#64748b;margin:2px 0;"><span style="color:#94a3b8;">Peso:</span> ${(sv as any).weight} kg</p>` : ""}
            <p style="font-size:10px;color:#64748b;margin:2px 0;"><span style="color:#94a3b8;">Data:</span> ${new Date(sv.createdAt).toLocaleDateString("pt-BR")}</p>
            ${(sv.ergonomicRisks || []).length > 0 ? `
            <div style="margin-top:8px;">
              <p style="font-size:9px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;">Riscos percebidos</p>
              ${(sv.ergonomicRisks || []).map((r: string) => `<div style="font-size:9px;color:#475569;padding:1px 0;">• ${r}</div>`).join("")}
            </div>` : ""}
          </div>
          <!-- Body map -->
          <div style="shrink:0;">${bodyMapSvg(sv.painAreas || [], 72, 165)}</div>
          <!-- Pain list -->
          <div style="flex:1;min-width:140px;">
            ${hasPain ? `
            <p style="font-size:9px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">${sortedPains.length} queixa(s)</p>
            ${sortedPains.map((p) => {
              const bg = p.intensity === "alta" ? "#fef2f2" : p.intensity === "media" ? "#fefce8" : "#eff6ff";
              const border = p.intensity === "alta" ? "#ef4444" : p.intensity === "media" ? "#eab308" : "#3b82f6";
              const text = p.intensity === "alta" ? "#b91c1c" : p.intensity === "media" ? "#713f12" : "#1d4ed8";
              const lvl = p.intensity === "alta" ? "ALTA" : p.intensity === "media" ? "MÉDIA" : "BAIXA";
              return `<div style="border-left:3px solid ${border};border-radius:0 4px 4px 0;padding:5px 8px;margin-bottom:4px;background:${bg};">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                  <span style="font-size:11px;font-weight:600;color:${text};">${p.region}</span>
                  <span style="font-size:9px;font-weight:bold;color:${text};">${lvl}</span>
                </div>
                <div style="display:flex;gap:8px;font-size:9px;color:#64748b;margin-top:2px;">
                  ${p.side && p.side !== "nsa" ? `<span style="text-transform:capitalize;">Lado: ${p.side}</span>` : ""}
                  <span>${WORK_RELATION_LABELS[p.workRelation] || p.workRelation || ""}</span>
                </div>
              </div>`;
            }).join("")}` : `<p style="font-size:10px;color:#94a3b8;margin-top:20px;">Nenhuma queixa registrada.</p>`}
          </div>
        </div>`;
      }
    }
    painHtml += `</div>`;

    /* 6c: Assessments (like checklists report) */
    const linkedAssessments = gse.assessmentIds.map((aid) => fullAssessments.find((a) => a.id === aid)).filter(Boolean) as Assessment[];
    let assessHtml = `<div style="margin-bottom:20px;"><h4 style="font-size:12px;font-weight:bold;color:#065f46;margin-bottom:10px;">Avaliações Realizadas</h4>`;
    if (linkedAssessments.length === 0) {
      assessHtml += `<p style="font-size:11px;color:#94a3b8;padding:10px;background:#f8fafc;border-radius:6px;">Nenhuma avaliação vinculada a este GSE.</p>`;
    } else {
      for (const assessment of linkedAssessments) {
        const pos = positions.find((p) => p.id === assessment.positionId);
        const sec = sectors.find((s) => s.id === assessment.sectorId);
        assessHtml += `
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:12px;page-break-inside:avoid;">
          <!-- Assessment header -->
          <div style="border-bottom:1px solid #f1f5f9;padding-bottom:8px;margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <p style="font-size:13px;font-weight:bold;color:#1e293b;margin:0;">${assessment.templateName}</p>
              <span style="font-size:10px;color:#94a3b8;">${new Date(assessment.createdAt).toLocaleDateString("pt-BR")}</span>
            </div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:3px;font-size:10px;color:#64748b;">
              <span>Setor: ${sec?.name || "-"}</span>
              <span>Cargo: ${pos?.name || "-"}</span>
              ${assessment.workstation ? `<span>Posto: ${assessment.workstation}</span>` : ""}
              ${assessment.observedWorker ? `<span>Trabalhador: ${assessment.observedWorker}</span>` : ""}
            </div>
          </div>
          <!-- Blocks -->
          ${(assessment.filledBlocks || []).map((block) => `
          <div style="margin-bottom:14px;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
              ${block.image ? `<img src="${block.image}" alt="${block.blockName}" style="width:52px;height:52px;border-radius:6px;object-fit:cover;border:1px solid #e2e8f0;" />` : ""}
              <p style="font-size:11px;font-weight:600;color:#374151;margin:0;">${block.blockName}</p>
            </div>
            <div style="margin-left:${block.image ? "62px" : "0"};">
              ${block.answers.map((ans) => {
                const isNC = ans.type === "marcacao" && ans.value?.toLowerCase().includes("não") && !ans.value?.toLowerCase().includes("não se aplica");
                return `<div style="padding:5px 8px;margin-bottom:3px;border-radius:5px;${isNC ? "background:#fef2f2;border:1px solid #fecaca;" : "background:#f8fafc;"}">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:10px;color:#374151;">${ans.questionText}</span>
                    <span style="font-size:9px;font-weight:600;padding:1px 6px;border-radius:3px;white-space:nowrap;margin-left:8px;${isNC ? "background:#fee2e2;color:#b91c1c;" : ans.type === "numerico" ? "background:#dbeafe;color:#1d4ed8;" : "background:#d1fae5;color:#065f46;"}">${ans.value}</span>
                  </div>
                  ${isNC && ans.evidence ? `<p style="font-size:9px;color:#b91c1c;margin:3px 0 0;"><strong>Evidência:</strong> ${ans.evidence}</p>` : ""}
                  ${isNC && ans.recommendation ? `<p style="font-size:9px;color:#b91c1c;margin:2px 0 0;"><strong>Recomendação:</strong> ${ans.recommendation}</p>` : ""}
                  ${(ans.photos || []).length > 0 ? `<div style="display:flex;gap:6px;margin-top:5px;flex-wrap:wrap;">
                    ${(ans.photos || []).map((ph: string) => `<img src="${ph}" style="width:60px;height:60px;border-radius:4px;object-fit:cover;border:1px solid #e2e8f0;" />`).join("")}
                  </div>` : ""}
                </div>`;
              }).join("")}
              ${block.blockRecommendation ? `<div style="margin-top:6px;padding:6px 8px;background:#fffbeb;border:1px solid #fde68a;border-radius:5px;">
                <p style="font-size:9px;font-weight:600;color:#92400e;">Recomendações do bloco:</p>
                <p style="font-size:9px;color:#78350f;margin:2px 0 0;white-space:pre-wrap;">${block.blockRecommendation}</p>
              </div>` : ""}
            </div>
          </div>`).join("")}
          ${assessment.generalNotes ? `<div style="padding:6px 8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;margin-top:6px;">
            <p style="font-size:9px;font-weight:600;color:#64748b;">Observações gerais:</p>
            <p style="font-size:9px;color:#64748b;margin:2px 0 0;white-space:pre-wrap;">${assessment.generalNotes}</p>
          </div>` : ""}
        </div>`;
      }
    }
    assessHtml += `</div>`;

    /* 6d: GSE conclusion */
    const conclusaoHtml = `
    <div style="padding:12px 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
      <p style="font-size:11px;font-weight:bold;color:#065f46;margin-bottom:6px;">Conclusão do GSE</p>
      <p style="font-size:11px;color:#14532d;white-space:pre-wrap;">${gse.conclusao || "<em style='color:#86efac;'>Não preenchida.</em>"}</p>
    </div>`;

    gseDetailHtml += `
    <div style="margin-bottom:36px;page-break-inside:avoid;">
      <div style="background:#065f46;color:white;padding:10px 16px;border-radius:8px 8px 0 0;margin-bottom:0;">
        <h3 style="font-size:14px;font-weight:bold;margin:0;">${gseLabel}</h3>
        <p style="font-size:10px;margin:2px 0 0;opacity:.8;">${gsePositions.map((p) => p.name).join(" · ") || "Sem cargos vinculados"}</p>
      </div>
      <div style="border:1px solid #d1fae5;border-top:none;border-radius:0 0 8px 8px;padding:16px;">
        ${risksHtml}
        ${painHtml}
        ${assessHtml}
        ${conclusaoHtml}
      </div>
    </div>`;
  }

  /* ── Section 9: Action plan ── */
  const actionNao = responses.filter((r) => r.resposta === "nao");
  const gseSpecificItems = companyGses.flatMap((gse) => {
    const items: { gseLabel: string; questionText: string; recommendation: string; priority: string }[] = [];
    gse.assessmentIds.forEach((aid) => {
      const a = fullAssessments.find((x) => x.id === aid);
      if (!a) return;
      (a.filledBlocks || []).forEach((fb) => {
        (fb.answers || []).forEach((ans) => {
          const isNC = ans.value?.toLowerCase().includes("não") && !ans.value?.toLowerCase().includes("não se aplica");
          if (isNC && ans.recommendation?.trim() && !gse.excludedActionIds.includes(`${aid}::${ans.questionId}`)) {
            items.push({ gseLabel: `GSE ${String(gse.numero).padStart(2, "0")}`, questionText: ans.questionText, recommendation: ans.recommendation, priority: "—" });
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
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Arial,sans-serif; font-size:12px; color:#1e293b; line-height:1.6; }
  h1 { font-size:22px; font-weight:bold; }
  h2 { font-size:15px; font-weight:bold; margin:0 0 12px; color:#1e293b; border-bottom:2px solid #059669; padding-bottom:5px; }
  h3 { font-size:13px; font-weight:bold; margin:12px 0 6px; }
  p { margin:5px 0; }
  ul { margin:5px 0 5px 18px; }
  li { margin:2px 0; }
  table { width:100%; border-collapse:collapse; margin:8px 0; }
  th { background:#059669; color:white; padding:8px; border:1px solid #ddd; text-align:left; font-size:10px; }
  td { vertical-align:top; }
  .page-break { page-break-before:always; }
  .section { padding:0 0 28px; }
  .cover { text-align:center; padding:80px 40px; min-height:90vh; display:flex; flex-direction:column; justify-content:center; }
  @media print {
    body { margin:12mm 18mm; }
    .cover { page-break-after:always; min-height:unset; }
    .no-print { display:none; }
    h2 { margin-top:4px; }
  }
</style>
</head>
<body>

<!-- 1. CAPA -->
<div class="cover">
  <p style="font-size:13px;text-transform:uppercase;letter-spacing:.1em;color:#059669;margin-bottom:8px;">Análise Ergonômica do Trabalho</p>
  <h1 style="font-size:26px;color:#1e293b;margin-bottom:6px;">${company.name}</h1>
  ${company.razaoSocial && company.razaoSocial !== company.name ? `<p style="color:#64748b;font-size:13px;">${company.razaoSocial}</p>` : ""}
  <p style="color:#64748b;font-size:12px;margin-top:4px;">CNPJ: ${company.cnpj || "—"} · ${company.city || "—"}</p>
  <p style="margin-top:20px;font-size:12px;color:#94a3b8;">${new Date().toLocaleDateString("pt-BR", { year: "numeric", month: "long", day: "numeric" })}</p>
  ${cover ? `<div style="margin-top:32px;font-size:12px;color:#475569;white-space:pre-wrap;">${cover}</div>` : ""}
</div>

<!-- 2. DADOS -->
<div class="page-break section">
  <h2>2. Dados da Empresa e Avaliadores</h2>
  <table>
    <tr><th style="width:28%;">Campo</th><th>Dados</th></tr>
    <tr><td style="padding:6px 8px;border:1px solid #ddd;font-weight:600;">Razão Social</td><td style="padding:6px 8px;border:1px solid #ddd;">${company.razaoSocial || company.name}</td></tr>
    <tr><td style="padding:6px 8px;border:1px solid #ddd;font-weight:600;">Nome Fantasia</td><td style="padding:6px 8px;border:1px solid #ddd;">${company.name}</td></tr>
    <tr><td style="padding:6px 8px;border:1px solid #ddd;font-weight:600;">CNPJ</td><td style="padding:6px 8px;border:1px solid #ddd;">${company.cnpj || "—"}</td></tr>
    <tr><td style="padding:6px 8px;border:1px solid #ddd;font-weight:600;">Cidade</td><td style="padding:6px 8px;border:1px solid #ddd;">${company.city || "—"}</td></tr>
    <tr><td style="padding:6px 8px;border:1px solid #ddd;font-weight:600;">Endereço</td><td style="padding:6px 8px;border:1px solid #ddd;">${company.endereco || "—"}</td></tr>
    <tr><td style="padding:6px 8px;border:1px solid #ddd;font-weight:600;">CNAE Principal</td><td style="padding:6px 8px;border:1px solid #ddd;">${company.cnaePrincipal || "—"}</td></tr>
    <tr><td style="padding:6px 8px;border:1px solid #ddd;font-weight:600;">Telefone</td><td style="padding:6px 8px;border:1px solid #ddd;">${company.telefone || "—"}</td></tr>
    <tr><td style="padding:6px 8px;border:1px solid #ddd;font-weight:600;">E-mail</td><td style="padding:6px 8px;border:1px solid #ddd;">${company.email || "—"}</td></tr>
  </table>
  <h3 style="margin-top:16px;">Avaliadores Responsáveis</h3>
  ${avaliadores.length === 0 ? `<p style="color:#94a3b8;">Nenhum avaliador cadastrado.</p>` : `
  <table>
    <tr><th>Nome</th><th>Formação</th><th>Registro Profissional</th><th>CPF</th></tr>
    ${avaliadores.map((a) => `<tr>
      <td style="padding:6px 8px;border:1px solid #ddd;">${a.nome}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;">${a.formacao || "—"}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;">${a.registroProfissional || "—"}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;">${a.cpf || "—"}</td>
    </tr>`).join("")}
  </table>`}
</div>

<!-- 3. CORPO INICIAL -->
${bodyInitial ? `<div class="page-break section"><h2>3. Introdução</h2><div style="font-size:12px;white-space:pre-wrap;color:#374151;">${bodyInitial}</div></div>` : ""}

<!-- 4. TABELA GSE -->
<div class="${bodyInitial ? "" : "page-break"} section">
  <h2>4. Divisão dos Grupos Similares de Exposição (GSE)</h2>
  ${companyGses.length === 0 ? `<p style="color:#94a3b8;">Nenhum GSE definido.</p>` : `
  <table>
    <colgroup>
      <col style="width:8%;" />
      <col style="width:18%;" />
      <col style="width:22%;" />
      <col style="width:52%;" />
    </colgroup>
    <thead><tr>
      <th>Nº GSE</th>
      <th>Setor</th>
      <th>Cargo / Função</th>
      <th>Descrição das Atividades</th>
    </tr></thead>
    <tbody>${gseTableBody}</tbody>
  </table>`}
</div>

<!-- 5. PERFIL POPULACIONAL -->
<div class="page-break section">
  <h2>5. Perfil Populacional da Empresa</h2>
  ${sectorProfileHtml || `<p style="color:#94a3b8;">Nenhum dado de questionário disponível.</p>`}
</div>

<!-- 6. RECONHECIMENTO DE RISCOS -->
<div class="page-break section">
  <h2>6. Reconhecimento de Riscos Ergonômicos por GSE</h2>
  ${gseDetailHtml || `<p style="color:#94a3b8;">Nenhum GSE definido.</p>`}
</div>

<!-- 7. CONCLUSÃO GERAL -->
<div class="page-break section">
  <h2>7. Conclusão Geral da AET</h2>
  <div style="font-size:12px;white-space:pre-wrap;color:#374151;padding:14px 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">${aet.conclusaoGeral || "<em style='color:#86efac;'>Conclusão não preenchida.</em>"}</div>
</div>

<!-- 8. CORPO FINAL + ASSINATURAS -->
<div class="page-break section">
  <h2>8. Considerações Finais</h2>
  ${bodyFinal ? `<div style="font-size:12px;white-space:pre-wrap;color:#374151;margin-bottom:24px;">${bodyFinal}</div>` : ""}
  <h3 style="margin-top:32px;margin-bottom:20px;">Assinaturas</h3>
  <div style="display:flex;gap:32px;flex-wrap:wrap;margin-top:8px;">
    ${avaliadores.map((a) => `
    <div style="text-align:center;min-width:180px;">
      <div style="width:180px;border-top:1px solid #1e293b;margin:0 auto;"></div>
      <p style="margin-top:6px;font-size:11px;font-weight:600;">${a.nome}</p>
      <p style="font-size:9px;color:#64748b;">${a.formacao || ""}${a.registroProfissional ? ` — ${a.registroProfissional}` : ""}</p>
    </div>`).join("")}
    <div style="text-align:center;min-width:180px;">
      <div style="width:180px;border-top:1px solid #1e293b;margin:0 auto;"></div>
      <p style="margin-top:6px;font-size:11px;font-weight:600;">Representante da Empresa</p>
      <p style="font-size:9px;color:#64748b;">${company.name}</p>
    </div>
  </div>
</div>

<!-- 9. PLANO DE AÇÃO -->
<div class="page-break section">
  <h2>9. Plano de Ação</h2>
  <h3 style="margin-top:8px;margin-bottom:8px;">9.1 Plano de Ação Geral</h3>
  ${actionNao.length === 0 ? `<p style="color:#94a3b8;font-style:italic;">Nenhuma ação identificada no plano geral.</p>` : `
  <table>
    <tr><th style="width:5%;">#</th><th>Ação Necessária</th><th style="width:15%;">Prioridade</th></tr>
    ${actionNao.map((r, i) => `<tr>
      <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;">${i + 1}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;">${r.questionText}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;font-weight:600;color:${r.priority === "urgente" ? "#b91c1c" : r.priority === "alta" ? "#c2410c" : r.priority === "media" ? "#92400e" : "#475569"};">${priorityLabel(r.priority)}</td>
    </tr>`).join("")}
  </table>`}

  <h3 style="margin-top:20px;margin-bottom:8px;">9.2 Plano de Ação Específico (por GSE)</h3>
  ${gseSpecificItems.length === 0 ? `<p style="color:#94a3b8;font-style:italic;">Nenhum item no plano específico.</p>` : `
  <table>
    <tr><th style="width:10%;">GSE</th><th style="width:35%;">Não Conformidade</th><th>Recomendação</th></tr>
    ${gseSpecificItems.map((item) => `<tr>
      <td style="padding:6px 8px;border:1px solid #ddd;font-weight:600;color:#065f46;">${item.gseLabel}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;">${item.questionText}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;color:#065f46;">${item.recommendation}</td>
    </tr>`).join("")}
  </table>`}
</div>

</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("Habilite popups para gerar o documento."); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 800);
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

  const loadResponses = useCallback(async () => {
    const { data } = await supabase.from("aet_action_responses").select("*").eq("aet_id", aetId).order("ordem");
    if (data) {
      setResponses(data.map((r: any) => ({
        id: r.id, questionText: r.question_text, priority: r.priority,
        resposta: r.resposta || null, isCustom: r.is_custom || false, ordem: r.ordem || 0,
      })));
    }
    setLoadingResp(false);
  }, [aetId]);

  useEffect(() => {
    loadResponses().then(async () => {
      const { data: existing } = await supabase.from("aet_action_responses").select("id").eq("aet_id", aetId).limit(1);
      if (!existing || existing.length === 0) {
        const sorted = [...actionPlanQuestions].sort((a, b) => a.ordem - b.ordem);
        if (sorted.length > 0) {
          await supabase.from("aet_action_responses").insert(
            sorted.map((q, i) => ({ aet_id: aetId, question_text: q.question, priority: q.priority, resposta: null, is_custom: false, ordem: i }))
          );
          await loadResponses();
        } else { setLoadingResp(false); }
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
      aet_id: aetId, question_text: newCustom.trim(), priority: "media",
      resposta: null, is_custom: true, ordem: maxOrdem + 1,
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

  const getGseNcItems = (gse: typeof companyGses[0]) => {
    const items: { id: string; questionText: string; recommendation: string; blockName: string; positionName: string }[] = [];
    gse.assessmentIds.forEach((assessmentId) => {
      const assessment = assessments.find((a) => a.id === assessmentId);
      if (!assessment) return;
      (assessment.filledBlocks || []).forEach((fb) => {
        (fb.answers || []).forEach((ans) => {
          const isNC = ans.value?.toLowerCase().includes("não") && !ans.value?.toLowerCase().includes("não se aplica");
          if (isNC && ans.recommendation?.trim()) {
            items.push({ id: `${assessmentId}::${ans.questionId}`, questionText: ans.questionText, recommendation: ans.recommendation, blockName: fb.blockName, positionName: positions.find((p) => p.id === assessment.positionId)?.name || "" });
          }
        });
      });
    });
    return items.filter((item) => !gse.excludedActionIds.includes(item.id));
  };

  const removeSpecificItem = async (gse: typeof companyGses[0], itemId: string) => {
    await updateGse(gse.id, { excludedActionIds: [...gse.excludedActionIds, itemId] });
    toast("Item removido.");
  };

  if (loadingResp) return <div className="py-8 text-center text-slate-400 text-sm">Carregando...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">Plano de Ação Geral</h3>
        <p className="text-sm text-slate-500 mb-4">Responda cada item. Respostas "Não" aparecerão no plano de ação da AET.</p>
        <form onSubmit={addCustomItem} className="flex gap-2 mb-4">
          <input value={newCustom} onChange={(e) => setNewCustom(e.target.value)} placeholder="Adicionar item personalizado..." className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
          <button type="submit" disabled={addingCustom} className="p-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"><FiPlus size={16} /></button>
        </form>
        {responses.length === 0 ? (
          <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl">
            <p className="text-sm">Nenhuma pergunta cadastrada.</p>
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
                    <button onClick={() => removeCustomItem(r.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"><FiX size={14} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">Plano de Ação Específico (por GSE)</h3>
        <p className="text-sm text-slate-500 mb-4">Não conformidades com recomendação. Remova itens que não se aplicam.</p>
        {companyGses.length === 0 ? (
          <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl"><p className="text-sm">Nenhum GSE definido.</p></div>
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
                            <p className="text-sm text-emerald-700 bg-emerald-50 rounded px-2 py-1 mt-1"><span className="font-medium">Recomendação:</span> {item.recommendation}</p>
                          </div>
                          <button onClick={() => removeSpecificItem(gse, item.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0" title="Remover do plano"><FiTrash2 size={13} /></button>
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

/* ─────────────── Main Page ─────────────────────────────────────────── */
export default function AetPipelinePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const {
    companies, avaliadores, gses, surveys, positions, sectors, documentTemplates,
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
  const [printing, setPrinting] = useState(false);

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

  const handlePrint = async () => {
    if (!company || !aet) return;
    setPrinting(true);
    try {
      // Fetch full assessments (with filledBlocks) for GSE-linked ones
      const gseAssessmentIds = [...new Set(companyGses.flatMap((g) => g.assessmentIds))];
      let fullAssessments: Assessment[] = [];
      if (gseAssessmentIds.length > 0) {
        const { data } = await supabase.from("assessments").select("*").in("id", gseAssessmentIds);
        fullAssessments = (data || []).map((r: any) => ({
          id: r.id, companyId: r.company_id, sectorId: r.sector_id, positionId: r.position_id,
          templateId: r.template_id, templateName: r.template_name, workstation: r.workstation,
          observedWorker: r.observed_worker, filledBlocks: r.filled_blocks || [],
          generalNotes: r.general_notes, createdAt: r.created_at,
        }));
      }
      // Fetch action responses
      const { data: respData } = await supabase.from("aet_action_responses").select("*").eq("aet_id", id).order("ordem");
      const responses: AetActionResponse[] = (respData || []).map((r: any) => ({
        id: r.id, questionText: r.question_text, priority: r.priority,
        resposta: r.resposta || null, isCustom: r.is_custom || false, ordem: r.ordem || 0,
      }));
      printAet({ company, avaliadores, companyGses, surveys, fullAssessments, positions, sectors, documentTemplates, aet: { conclusaoGeral: conclusao }, responses });
    } finally {
      setPrinting(false);
    }
  };

  if (!aet || !company) return <div className="p-8 text-slate-500">AET não encontrada.</div>;

  const steps = [
    { n: 1, label: "Definição dos GSEs" },
    { n: 2, label: "Conclusão Geral" },
    { n: 3, label: "Plano de Ação" },
  ];
  const isCompleted = !!aet.completedAt;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <button onClick={() => router.push("/aet")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-600 transition-colors mb-2">
          <FiArrowLeft size={14} /> Voltar às AETs
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{company.name}</h1>
            <p className="text-slate-500 text-sm mt-1">Análise Ergonômica do Trabalho{isCompleted && <span className="ml-2 text-emerald-600 font-medium">· Concluída</span>}</p>
          </div>
          <button
            onClick={handlePrint}
            disabled={printing}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors font-medium text-sm disabled:opacity-60"
          >
            <FiPrinter size={16} />
            {printing ? "Gerando..." : "Baixar / Imprimir AET"}
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
                step === s.n ? "bg-emerald-600 text-white"
                  : s.n < step || isCompleted ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {s.n < step || (isCompleted && s.n !== step) ? <FiCheckCircle size={14} /> : <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center text-xs">{s.n}</span>}
              {s.label}
            </button>
            {i < steps.length - 1 && <div className="w-6 h-0.5 bg-slate-200" />}
          </div>
        ))}
      </div>

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
              <button onClick={saveConclusao} disabled={savingConclusao} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50">
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

      <div className="flex items-center justify-between mt-6">
        <button onClick={() => goToStep(step - 1)} disabled={step === 1} className="flex items-center gap-2 px-5 py-2.5 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors text-sm disabled:opacity-40">
          <FiArrowLeft size={15} /> Etapa Anterior
        </button>
        {step < 3 ? (
          <button onClick={() => goToStep(step + 1)} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium">
            Próxima Etapa <FiArrowRight size={15} />
          </button>
        ) : (
          <button onClick={handleComplete} disabled={isCompleted} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50">
            <FiCheckCircle size={15} />
            {isCompleted ? "Concluída" : "Concluir AET"}
          </button>
        )}
      </div>
    </div>
  );
}
