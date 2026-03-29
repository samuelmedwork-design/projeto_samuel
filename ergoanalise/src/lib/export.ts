const DOCX_STYLES = `
  <style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1e293b; margin: 0; padding: 0; }
    h1 { font-size: 16pt; color: #1e293b; margin: 0 0 4pt 0; }
    h2 { font-size: 13pt; color: #1e293b; margin: 12pt 0 4pt 0; }
    h3 { font-size: 11pt; color: #334155; margin: 8pt 0 4pt 0; }
    p { margin: 2pt 0; }
    table { border-collapse: collapse; width: 100%; margin: 6pt 0; }
    td, th { padding: 4pt 6pt; vertical-align: top; font-size: 10pt; }
    .bordered td, .bordered th { border: 1px solid #cbd5e1; }
    .borderless td, .borderless th { border: none; }
    th { background-color: #f1f5f9; font-weight: bold; text-align: left; }
    .nc { background-color: #fef2f2; }
    .green { color: #065f46; }
    .red { color: #991b1b; }
    .blue { color: #1e40af; }
    .gray { color: #64748b; font-size: 9pt; }
    .bold { font-weight: bold; }
    .center { text-align: center; }
    .right { text-align: right; }
    .label { color: #64748b; font-size: 9pt; }
    .section-header { background-color: #f1f5f9; padding: 6pt 8pt; font-weight: bold; font-size: 11pt; }
    .badge-alta { background-color: #fecaca; color: #991b1b; padding: 2pt 6pt; font-weight: bold; font-size: 9pt; }
    .badge-media { background-color: #fef3c7; color: #92400e; padding: 2pt 6pt; font-weight: bold; font-size: 9pt; }
    .badge-baixa { background-color: #dbeafe; color: #1e40af; padding: 2pt 6pt; font-weight: bold; font-size: 9pt; }
    img { max-width: 250px; max-height: 250px; }
    .page-break { page-break-before: always; }
  </style>
`;

function wrapDocx(body: string): string {
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:w="urn:schemas-microsoft-com:office:word"
    xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8">${DOCX_STYLES}</head>
    <body>${body}</body></html>`;
}

// Converte URL de imagem para base64 data URL
async function toBase64(url: string): Promise<string> {
  if (!url) return "";
  // Já é base64
  if (url.startsWith("data:")) return url;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

// Converte todas as imagens referenciadas para base64
async function resolveImages(html: string): Promise<string> {
  const imgRegex = /src="(\/[^"]+)"/g;
  const matches = [...html.matchAll(imgRegex)];
  let result = html;
  for (const match of matches) {
    const b64 = await toBase64(match[1]);
    result = result.replace(match[0], `src="${b64}"`);
  }
  return result;
}

function downloadDoc(html: string, filename: string) {
  const blob = new Blob([html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

// Exportação genérica por element ID (fallback)
export async function exportToDocx(elementId: string, filename: string) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const html = await resolveImages(wrapDocx(el.innerHTML));
  downloadDoc(html, filename);
}

// ─── Exportação: Relatório de Checklists ───────────────────────────
export interface DocxChecklistData {
  companyName: string;
  companyCnpj: string;
  companyCity: string;
  date: string;
  logoUrl?: string;
  assessments: {
    templateName: string;
    sector: string;
    position: string;
    workstation: string;
    worker: string;
    date: string;
    blocks: {
      name: string;
      image?: string;
      answers: { question: string; value: string; type: string; evidence?: string; recommendation?: string; photos?: string[] }[];
      blockRecommendation?: string;
    }[];
    generalNotes?: string;
  }[];
}

export async function exportChecklistDocx(data: DocxChecklistData, filename: string) {
  let html = "";

  // Logo
  if (data.logoUrl) {
    const logoB64 = await toBase64(data.logoUrl);
    html += `<div class="center"><img src="${logoB64}" style="height:50pt;" /></div><br/>`;
  }

  // Cabeçalho
  html += `<h1>Relatório de Checklists Técnicos</h1>`;
  html += `<table class="borderless"><tr>
    <td><span class="label">Empresa:</span> <b>${data.companyName}</b></td>
    <td><span class="label">CNPJ:</span> ${data.companyCnpj}</td>
    <td><span class="label">Cidade:</span> ${data.companyCity}</td>
  </tr><tr>
    <td colspan="3"><span class="label">Gerado em:</span> ${data.date} | ${data.assessments.length} avaliação(ões)</td>
  </tr></table><hr/>`;

  for (const assessment of data.assessments) {
    // Info da avaliação
    html += `<h2>${assessment.templateName}</h2>`;
    html += `<table class="borderless"><tr>
      <td><span class="label">Setor:</span> ${assessment.sector}</td>
      <td><span class="label">Cargo:</span> ${assessment.position}</td>
      <td><span class="label">Data:</span> ${assessment.date}</td>
    </tr>`;
    if (assessment.workstation || assessment.worker) {
      html += `<tr>`;
      if (assessment.workstation) html += `<td><span class="label">Posto:</span> ${assessment.workstation}</td>`;
      if (assessment.worker) html += `<td><span class="label">Trabalhador:</span> ${assessment.worker}</td>`;
      html += `</tr>`;
    }
    html += `</table>`;

    // Blocos
    for (const block of assessment.blocks) {
      html += `<h3>${block.name}</h3>`;
      if (block.image) html += `<img src="${block.image}" style="height:60pt; margin-bottom:4pt;" /><br/>`;

      html += `<table class="bordered">`;
      html += `<tr><th style="width:60%">Pergunta</th><th style="width:15%">Resposta</th><th style="width:25%">Obs.</th></tr>`;
      for (const a of block.answers) {
        const isNC = a.type === "marcacao" && a.value.toLowerCase().includes("não") && !a.value.toLowerCase().includes("não se aplica");
        const rowClass = isNC ? ' class="nc"' : "";
        const valueClass = isNC ? ' class="red bold"' : a.type === "numerico" ? ' class="blue"' : ' class="green"';
        let obs = "";
        if (isNC && a.evidence) obs += `<b>Evidência:</b> ${a.evidence}<br/>`;
        if (isNC && a.recommendation) obs += `<b>Recomendação:</b> ${a.recommendation}`;
        html += `<tr${rowClass}><td>${a.question}</td><td${valueClass}>${a.value || "—"}</td><td>${obs || "—"}</td></tr>`;
      }
      html += `</table>`;

      if (block.blockRecommendation) {
        html += `<p><b>Recomendações do bloco:</b> ${block.blockRecommendation}</p>`;
      }
    }

    if (assessment.generalNotes) {
      html += `<p><b>Observações gerais:</b> ${assessment.generalNotes}</p>`;
    }
    html += `<hr/>`;
  }

  downloadDoc(wrapDocx(html), filename);
}

// ─── Exportação: Relatório de Queixas de Dores ─────────────────────
export interface DocxSurveyData {
  companyName: string;
  companyCnpj: string;
  companyCity: string;
  date: string;
  logoUrl?: string;
  surveys: {
    name: string;
    sector: string;
    position: string;
    height: number;
    date: string;
    risks: string[];
    manualLoad?: { performs: boolean; weightLevel?: string; timePercentage?: string; gripQuality?: string; workPace?: string; dailyDuration?: string };
    painAreas: { region: string; side: string; intensity: string; workRelation: string }[];
  }[];
}

const WORK_REL: Record<string, string> = {
  ja_inicia_com_dor: "Já inicio o trabalho com essa dor",
  piora_ao_longo: "A dor piora ao longo do trabalho",
  surge_ao_final: "A dor só surge na hora de ir embora",
  sem_relacao: "Não tem relação com o trabalho",
};

export async function exportSurveyDocx(data: DocxSurveyData, filename: string) {
  let html = "";

  if (data.logoUrl) {
    const logoB64 = await toBase64(data.logoUrl);
    html += `<div class="center"><img src="${logoB64}" style="height:50pt;" /></div><br/>`;
  }

  html += `<h1>Relatório de Queixas de Dores</h1>`;
  html += `<table class="borderless"><tr>
    <td><span class="label">Empresa:</span> <b>${data.companyName}</b></td>
    <td><span class="label">CNPJ:</span> ${data.companyCnpj}</td>
    <td><span class="label">Cidade:</span> ${data.companyCity}</td>
  </tr><tr>
    <td colspan="3"><span class="label">Gerado em:</span> ${data.date} | ${data.surveys.length} respostas coletadas</td>
  </tr></table><hr/>`;

  for (const s of data.surveys) {
    html += `<table class="bordered" style="margin-top:8pt;"><tr>`;

    // Coluna 1: Dados do funcionário
    let col1 = `<b style="font-size:11pt;">${s.name}</b><br/>`;
    col1 += `<span class="label">Setor:</span> ${s.sector}<br/>`;
    col1 += `<span class="label">Cargo:</span> ${s.position}<br/>`;
    col1 += `<span class="label">Altura:</span> ${s.height} cm<br/>`;
    col1 += `<span class="label">Data:</span> ${s.date}<br/>`;
    if (s.risks.length > 0) {
      col1 += `<br/><span class="label">Riscos Percebidos:</span><br/>`;
      s.risks.forEach((r) => { col1 += `• ${r}<br/>`; });
    }
    if (s.manualLoad?.performs) {
      col1 += `<br/><span class="label">Transporte Manual:</span><br/>`;
      if (s.manualLoad.weightLevel) col1 += `Peso: ${s.manualLoad.weightLevel}<br/>`;
      if (s.manualLoad.timePercentage) col1 += `Tempo: ${s.manualLoad.timePercentage}<br/>`;
      if (s.manualLoad.gripQuality) col1 += `Pega: ${s.manualLoad.gripQuality}<br/>`;
      if (s.manualLoad.workPace) col1 += `Ritmo: ${s.manualLoad.workPace}<br/>`;
      if (s.manualLoad.dailyDuration) col1 += `Duração: ${s.manualLoad.dailyDuration}<br/>`;
    }

    // Coluna 2: Ilustração (placeholder texto, SVG não renderiza em Word)
    let col2 = `<div class="center gray">Diagrama Corporal</div>`;

    // Coluna 3: Resumo das dores
    let col3 = "";
    if (s.painAreas.length === 0) {
      col3 = `<span class="gray">Nenhuma queixa registrada.</span>`;
    } else {
      col3 += `<b>${s.painAreas.length} queixa(s)</b><br/><br/>`;
      const sorted = [...s.painAreas].sort((a, b) => {
        const order: Record<string, number> = { alta: 0, media: 1, baixa: 2 };
        return (order[a.intensity] ?? 2) - (order[b.intensity] ?? 2);
      });
      for (const p of sorted) {
        const badge = p.intensity === "alta" ? "badge-alta" : p.intensity === "media" ? "badge-media" : "badge-baixa";
        const level = p.intensity === "alta" ? "ALTA" : p.intensity === "media" ? "MÉDIA" : "BAIXA";
        col3 += `<b>${p.region}</b>`;
        if (p.side && p.side !== "nsa") col3 += ` <span class="gray">(${p.side})</span>`;
        col3 += ` — <span class="${badge}">${level}</span><br/>`;
        col3 += `<span class="gray">${WORK_REL[p.workRelation] || p.workRelation}</span><br/><br/>`;
      }
    }

    html += `<td style="width:35%; vertical-align:top;">${col1}</td>`;
    html += `<td style="width:25%; vertical-align:top; text-align:center;">${col2}</td>`;
    html += `<td style="width:40%; vertical-align:top;">${col3}</td>`;
    html += `</tr></table>`;
  }

  downloadDoc(wrapDocx(html), filename);
}

// ─── Exportação: Relatório Antropométrico ──────────────────────────
export interface DocxAnthroData {
  companyName: string;
  date: string;
  logoUrl?: string;
  groups: {
    position: string;
    workers: {
      name: string;
      sector: string;
      position: string;
      height: number;
      rangeName?: string;
      rangeMin?: number;
      rangeMax?: number;
      rangeImage?: string;
    }[];
  }[];
}

export async function exportAnthroDocx(data: DocxAnthroData, filename: string) {
  let html = "";

  if (data.logoUrl) {
    const logoB64 = await toBase64(data.logoUrl);
    html += `<div class="center"><img src="${logoB64}" style="height:50pt;" /></div><br/>`;
  }

  html += `<h1>Relatório Antropométrico</h1>`;
  html += `<p><span class="label">Empresa:</span> <b>${data.companyName}</b> | <span class="label">Gerado em:</span> ${data.date}</p><hr/>`;

  for (const group of data.groups) {
    html += `<h2>Cargo: ${group.position}</h2>`;

    for (const w of group.workers) {
      html += `<table class="bordered"><tr>`;

      // Coluna 1: Dados
      let col1 = `<b style="font-size:11pt;">${w.name}</b><br/>`;
      col1 += `<span class="label">Altura:</span> <b style="font-size:13pt;">${w.height} cm</b><br/>`;
      col1 += `<span class="label">Setor:</span> ${w.sector}<br/>`;
      col1 += `<span class="label">Cargo:</span> ${w.position}<br/>`;
      if (w.rangeName || (w.rangeMin && w.rangeMax)) {
        col1 += `<br/><span class="green bold">Faixa: ${w.rangeMin} – ${w.rangeMax} cm`;
        if (w.rangeName) col1 += ` (${w.rangeName})`;
        col1 += `</span>`;
      } else {
        col1 += `<br/><span class="red">Sem faixa correspondente</span>`;
      }

      // Coluna 2: Imagem
      let col2 = "";
      if (w.rangeImage) {
        col2 = `<img src="${w.rangeImage}" style="max-width:300px; max-height:250px;" />`;
      } else {
        col2 = `<span class="gray">Sem imagem</span>`;
      }

      html += `<td style="width:35%; vertical-align:top;">${col1}</td>`;
      html += `<td style="width:65%; vertical-align:top; text-align:center;">${col2}</td>`;
      html += `</tr></table>`;
    }
  }

  downloadDoc(wrapDocx(html), filename);
}
