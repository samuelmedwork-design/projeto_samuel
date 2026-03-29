"use client";
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  PainArea, PainIntensity, Laterality, WorkRelation, ManualLoadData,
  BODY_REGIONS_NO_LATERAL, BODY_REGIONS_WITH_LATERAL, ERGONOMIC_RISKS,
} from "@/contexts/DataContext";
import BodyMap, { BodyMapLegend } from "@/components/BodyMap";
import { supabase } from "@/lib/supabase";

interface EmbeddedPosition { id: string; name: string }
interface EmbeddedSector { id: string; name: string; positions: EmbeddedPosition[] }
interface EmbeddedCompany { id: string; name: string; sectors: EmbeddedSector[] }

const WORK_RELATION_LABELS: Record<WorkRelation, string> = {
  ja_inicia_com_dor: "Já inicio o trabalho com essa dor",
  piora_ao_longo: "A dor piora ao longo do trabalho",
  surge_ao_final: "A dor só surge na hora de ir embora",
  sem_relacao: "Não tem relação com o trabalho",
};

const WEIGHT_LEVELS = ["Leve", "Moderado", "Pesado", "Muito pesado", "Extremamente pesado"];
const TIME_PERCENTAGES = ["Menos de 10%", "10% a 25%", "25% a 50%", "50% a 75%", "Mais de 75%"];
const EFFORT_FREQUENCIES = ["Menos de 2/min", "2 a 5/min", "5 a 10/min", "10 a 15/min", "Mais de 15/min"];
const GRIP_QUALITIES = ["Muito boa", "Boa", "Razoável", "Ruim", "Muito ruim"];
const WORK_PACES = ["Muito lento", "Lento", "Moderado", "Rápido", "Muito rápido"];
const DAILY_DURATIONS = ["Menos de 1h", "1 a 2h", "2 a 4h", "4 a 6h", "Mais de 6h"];

const emptyManualLoad: ManualLoadData = {
  performs: false, weightLevel: "", timePercentage: "",
  effortFrequency: "", gripQuality: "", workPace: "", dailyDuration: "",
};

// Tipo local que permite campos vazios no formulário
interface PainAreaForm {
  region: string;
  side: Laterality | "";
  intensity: PainIntensity | "";
  workRelation: WorkRelation | "";
}

export default function SurveyPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const searchParams = useSearchParams();

  // Estado para dados carregados via RPC
  const [companyData, setCompanyData] = useState<EmbeddedCompany | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Tenta carregar dados embarcados no link legado (parâmetro ?d=)
  const embedded = useMemo<EmbeddedCompany | null>(() => {
    try {
      const param = searchParams.get("d");
      if (!param) return null;
      const json = decodeURIComponent(escape(atob(param)));
      return JSON.parse(json) as EmbeddedCompany;
    } catch {
      return null;
    }
  }, [searchParams]);

  // Busca dados da empresa via RPC do Supabase (link curto)
  useEffect(() => {
    if (embedded) {
      setCompanyData(embedded);
      setLoadingData(false);
      return;
    }
    supabase.rpc("get_survey_data", { company_uuid: companyId }).then(({ data, error }) => {
      if (error || !data) {
        setLoadError(true);
      } else {
        setCompanyData(data as EmbeddedCompany);
      }
      setLoadingData(false);
    });
  }, [companyId, embedded]);

  const companyName = companyData?.name;
  const companySectorsData = companyData?.sectors || [];
  const getPositionsForSector = (sectorId: string) => {
    const sec = companySectorsData.find((s) => s.id === sectorId);
    return sec ? sec.positions : [];
  };

  const [step, setStep] = useState(0);
  // Bloco 1 — Identificação
  const [workerName, setWorkerName] = useState("");
  const [sector, setSector] = useState("");
  const [position, setPosition] = useState("");
  const [height, setHeight] = useState("");
  const [sex, setSex] = useState("");
  const [weight, setWeight] = useState("");
  // Bloco 2 — Riscos ergonômicos
  const [risks, setRisks] = useState<string[]>([]);
  // Bloco 3 — Dor e desconforto
  const [painAreas, setPainAreas] = useState<PainAreaForm[]>([]);
  // Bloco 4 — Transporte manual de cargas
  const [manualLoad, setManualLoad] = useState<ManualLoadData>(emptyManualLoad);

  // Validação de erros
  const [stepErrors, setStepErrors] = useState<string[]>([]);

  // Assinatura
  const [signature, setSignature] = useState<string | undefined>(undefined);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  useEffect(() => {
    if (step === 4) {
      const t = setTimeout(initCanvas, 50);
      return () => clearTimeout(t);
    }
  }, [step, initCanvas]);

  const getCanvasPoint = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    isDrawingRef.current = true;
    const pt = getCanvasPoint(canvas, clientX, clientY);
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
  };

  const draw = (clientX: number, clientY: number) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pt = getCanvasPoint(canvas, clientX, clientY);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      setSignature(canvas.toDataURL("image/png"));
    }
  };

  const clearSignature = () => {
    setSignature(undefined);
    initCanvas();
  };

  const [submitted, setSubmitted] = useState(false);

  const sectorPositions = getPositionsForSector(sector);

  // ── Helpers riscos ──
  const toggleRisk = (risk: string) => {
    setRisks((prev) => prev.includes(risk) ? prev.filter((r) => r !== risk) : [...prev, risk]);
  };

  // ── Helpers dor ──
  const togglePainRegion = (region: string) => {
    if (painAreas.find((p) => p.region === region)) {
      setPainAreas(painAreas.filter((p) => p.region !== region));
    } else {
      const hasLateral = BODY_REGIONS_WITH_LATERAL.includes(region);
      setPainAreas([...painAreas, {
        region,
        side: hasLateral ? "" : "nsa",
        intensity: "",
        workRelation: "",
      }]);
    }
  };

  const updatePain = (region: string, data: Partial<PainAreaForm>) => {
    setPainAreas(painAreas.map((p) => (p.region === region ? { ...p, ...data } : p)));
  };

  // ── Validações por etapa ──
  const validateStep0 = (): boolean => {
    const errors: string[] = [];
    if (!workerName.trim()) errors.push("Nome completo é obrigatório");
    if (!sector) errors.push("Setor é obrigatório");
    if (!position) errors.push("Cargo é obrigatório");
    if (!sex) errors.push("Sexo é obrigatório");
    if (!height) errors.push("Altura é obrigatória");
    if (!weight) errors.push("Peso é obrigatório");
    setStepErrors(errors);
    return errors.length === 0;
  };

  const validateStep2 = (): boolean => {
    const errors: string[] = [];
    for (const p of painAreas) {
      if (!p.intensity) errors.push(`Selecione a intensidade da dor para "${p.region}"`);
      if (!p.workRelation) errors.push(`Selecione a relação com a jornada para "${p.region}"`);
      if (BODY_REGIONS_WITH_LATERAL.includes(p.region) && !p.side) {
        errors.push(`Selecione a lateralidade para "${p.region}"`);
      }
    }
    setStepErrors(errors);
    return errors.length === 0;
  };

  const validateStep3 = (): boolean => {
    const errors: string[] = [];
    if (manualLoad.performs) {
      if (!manualLoad.weightLevel) errors.push("Nível de peso é obrigatório");
      if (!manualLoad.timePercentage) errors.push("Tempo da jornada é obrigatório");
      if (!manualLoad.effortFrequency) errors.push("Frequência de esforço é obrigatória");
      if (!manualLoad.gripQuality) errors.push("Qualidade da pega é obrigatória");
      if (!manualLoad.workPace) errors.push("Ritmo de trabalho é obrigatório");
      if (!manualLoad.dailyDuration) errors.push("Duração diária é obrigatória");
    }
    setStepErrors(errors);
    return errors.length === 0;
  };

  // ── Submit (insere direto no Supabase sem auth) ──
  const handleSubmit = async () => {
    // Converte painAreas do form para o tipo final
    const finalPainAreas: PainArea[] = painAreas.map((p) => ({
      region: p.region,
      side: (p.side || "nsa") as Laterality,
      intensity: (p.intensity || "baixa") as PainIntensity,
      workRelation: (p.workRelation || "sem_relacao") as WorkRelation,
    }));

    await supabase.from("surveys").insert({
      company_id: companyData?.id || companyId,
      worker_name: workerName,
      sector: companySectorsData.find((s) => s.id === sector)?.name || sector,
      position: sectorPositions.find((p: { id: string; name: string }) => p.id === position)?.name || position,
      height: Number(height),
      weight: Number(weight),
      sex,
      ergonomic_risks: risks,
      pain_areas: finalPainAreas,
      manual_load: manualLoad,
      signature,
    });
    setSubmitted(true);
  };

  // Loading state
  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Carregando questionário...</p>
        </div>
      </div>
    );
  }

  if (!companyName || loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md mx-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Link inválido</h2>
          <p className="text-slate-500 text-sm">Este link não contém os dados da empresa. Solicite um novo link ao responsável pela empresa.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">Questionário Enviado!</h1>
            <p className="text-slate-500">Obrigado por responder, {workerName}.</p>
          </div>

          {/* Relatório resumido */}
          {painAreas.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 text-center mb-4">Resultado</h2>
              <BodyMapLegend />
              <div className="flex justify-center mt-4">
                <BodyMap painAreas={painAreas.map((p) => ({
                  region: p.region,
                  side: (p.side || "nsa") as Laterality,
                  intensity: (p.intensity || "baixa") as PainIntensity,
                  workRelation: (p.workRelation || "sem_relacao") as WorkRelation,
                }))} size="md" />
              </div>
              <div className="mt-4 space-y-2 max-w-md mx-auto">
                {painAreas.map((p) => {
                  const colorClass = p.intensity === "baixa" ? "bg-blue-50 border-blue-200 text-blue-700" : p.intensity === "media" ? "bg-yellow-50 border-yellow-200 text-yellow-700" : "bg-red-50 border-red-200 text-red-700";
                  return (
                    <div key={p.region} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${colorClass}`}>
                      <span className="text-sm font-medium">{p.region}</span>
                      <div className="flex gap-2 text-xs">
                        {p.side !== "nsa" && p.side && <span className="capitalize">{p.side}</span>}
                        <span className="font-bold capitalize">{p.intensity}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const totalSteps = 5;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Logo horizontal no cabeçalho */}
        <div className="flex justify-center mb-4">
          <img src="/logo-horizontal.png" alt="ErgoAnálise" className="h-16 w-auto" />
        </div>
        <p className="text-slate-500 text-center text-sm mb-6">Questionário Ergonômico — {companyName}</p>

        {/* Barra de progresso */}
        <div className="flex gap-1.5 mb-6">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${step >= i ? "bg-emerald-500" : "bg-slate-200"}`} />
          ))}
        </div>
        <p className="text-xs text-slate-400 text-center mb-6">Etapa {step + 1} de {totalSteps}</p>

        {/* Erros de validação */}
        {stepErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="text-sm font-medium text-red-700 mb-1">Preencha os campos obrigatórios:</p>
            <ul className="text-sm text-red-600 list-disc list-inside space-y-0.5">
              {stepErrors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">

          {/* ════════ ETAPA 0: IDENTIFICAÇÃO ════════ */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 mb-2">Identificação</h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo <span className="text-red-500">*</span></label>
                <input required value={workerName} onChange={(e) => setWorkerName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Setor <span className="text-red-500">*</span></label>
                  <select value={sector} onChange={(e) => { setSector(e.target.value); setPosition(""); }}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                    <option value="">Selecione</option>
                    {companySectorsData.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cargo <span className="text-red-500">*</span></label>
                  <select value={position} onChange={(e) => setPosition(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                    <option value="">Selecione</option>
                    {sectorPositions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sexo <span className="text-red-500">*</span></label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setSex("Masculino")}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${sex === "Masculino" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"}`}>
                    Masculino
                  </button>
                  <button type="button" onClick={() => setSex("Feminino")}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${sex === "Feminino" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"}`}>
                    Feminino
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Altura (cm) <span className="text-red-500">*</span></label>
                  <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="Ex: 170"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Peso (kg) <span className="text-red-500">*</span></label>
                  <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Ex: 70"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
              </div>
              <button
                onClick={() => { if (validateStep0()) { setStepErrors([]); setStep(1); } }}
                className="w-full mt-4 bg-emerald-600 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors">
                Próximo
              </button>
            </div>
          )}

          {/* ════════ ETAPA 1: RISCOS ERGONÔMICOS ════════ */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 mb-1">Riscos Ergonômicos Percebidos</h2>
              <p className="text-sm text-slate-500 mb-4">Selecione todas as situações que se aplicam ao seu trabalho (opcional):</p>

              <div className="grid grid-cols-1 gap-2">
                {ERGONOMIC_RISKS.map((risk) => {
                  const active = risks.includes(risk);
                  return (
                    <button
                      key={risk}
                      type="button"
                      onClick={() => toggleRisk(risk)}
                      className={`text-left px-3 py-2.5 rounded-lg text-sm transition-colors border ${
                        active
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-medium"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <span className="mr-2">{active ? "\u2611" : "\u2610"}</span>
                      {risk}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => { setStepErrors([]); setStep(0); }}
                  className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
                  Voltar
                </button>
                <button onClick={() => { setStepErrors([]); setStep(2); }}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors">
                  Próximo
                </button>
              </div>
            </div>
          )}

          {/* ════════ ETAPA 2: DOR E DESCONFORTO ════════ */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 mb-1">Dor e Desconforto</h2>
              <p className="text-sm text-slate-500 mb-4">Selecione os segmentos corporais onde sente dor ou desconforto:</p>

              {/* Segmentos SEM lateralidade */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Segmentos centrais</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BODY_REGIONS_NO_LATERAL.map((region) => {
                    const active = painAreas.find((p) => p.region === region);
                    return (
                      <button key={region} type="button" onClick={() => togglePainRegion(region)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                          active ? "bg-red-50 border-red-300 text-red-700" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}>
                        {region}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Segmentos COM lateralidade */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-4">Segmentos com lateralidade</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {BODY_REGIONS_WITH_LATERAL.map((region) => {
                    const active = painAreas.find((p) => p.region === region);
                    return (
                      <button key={region} type="button" onClick={() => togglePainRegion(region)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                          active ? "bg-red-50 border-red-300 text-red-700" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}>
                        {region}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detalhamento de cada dor */}
              {painAreas.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700">Detalhamento das queixas <span className="text-red-500">*</span></h3>
                  {painAreas.map((p) => {
                    const hasLateral = BODY_REGIONS_WITH_LATERAL.includes(p.region);
                    return (
                      <div key={p.region} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                        <p className="font-semibold text-slate-800">{p.region}</p>

                        {/* Lateralidade */}
                        {hasLateral && (
                          <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">Lateralidade <span className="text-red-500">*</span></label>
                            <div className="flex gap-2 flex-wrap">
                              {(["direito", "esquerdo", "ambos", "nsa"] as Laterality[]).map((side) => (
                                <button key={side} type="button" onClick={() => updatePain(p.region, { side })}
                                  className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                                    p.side === side ? "bg-slate-800 text-white border-slate-800" : "bg-white border-slate-300 text-slate-600"
                                  }`}>
                                  {side === "nsa" ? "N/A" : side.charAt(0).toUpperCase() + side.slice(1)}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Intensidade */}
                        <div>
                          <label className="text-xs font-medium text-slate-500 mb-1 block">Intensidade da dor <span className="text-red-500">*</span></label>
                          <div className="flex gap-2">
                            {(["baixa", "media", "alta"] as PainIntensity[]).map((int) => {
                              const cls = int === "baixa" ? "bg-blue-500 border-blue-500" : int === "media" ? "bg-yellow-500 border-yellow-500" : "bg-red-500 border-red-500";
                              return (
                                <button key={int} type="button" onClick={() => updatePain(p.region, { intensity: int })}
                                  className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                                    p.intensity === int ? `${cls} text-white` : "bg-white border-slate-300 text-slate-600"
                                  }`}>
                                  {int.charAt(0).toUpperCase() + int.slice(1)}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Relação com jornada */}
                        <div>
                          <label className="text-xs font-medium text-slate-500 mb-1 block">Relação com a jornada <span className="text-red-500">*</span></label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {(Object.keys(WORK_RELATION_LABELS) as WorkRelation[]).map((wr) => (
                              <button key={wr} type="button" onClick={() => updatePain(p.region, { workRelation: wr })}
                                className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors text-left ${
                                  p.workRelation === wr ? "bg-slate-800 text-white border-slate-800" : "bg-white border-slate-300 text-slate-600"
                                }`}>
                                {WORK_RELATION_LABELS[wr]}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button onClick={() => { setStepErrors([]); setStep(1); }}
                  className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
                  Voltar
                </button>
                <button onClick={() => { if (validateStep2()) { setStepErrors([]); setStep(3); } }}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors">
                  Próximo
                </button>
              </div>
            </div>
          )}

          {/* ════════ ETAPA 3: TRANSPORTE MANUAL DE CARGAS ════════ */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 mb-1">Transporte Manual de Cargas</h2>

              <div className="flex gap-4 items-center">
                <p className="text-sm text-slate-700">Você realiza transporte manual de cargas? <span className="text-red-500">*</span></p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setManualLoad({ ...manualLoad, performs: true })}
                    className={`px-4 py-1.5 rounded text-sm font-medium border transition-colors ${manualLoad.performs ? "bg-emerald-600 text-white border-emerald-600" : "bg-white border-slate-300 text-slate-600"}`}>
                    Sim
                  </button>
                  <button type="button" onClick={() => setManualLoad({ ...emptyManualLoad, performs: false })}
                    className={`px-4 py-1.5 rounded text-sm font-medium border transition-colors ${!manualLoad.performs ? "bg-slate-800 text-white border-slate-800" : "bg-white border-slate-300 text-slate-600"}`}>
                    Não
                  </button>
                </div>
              </div>

              {manualLoad.performs && (
                <div className="space-y-4 mt-4 border-t border-slate-200 pt-4">
                  {/* Nível de peso */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Nível de peso transportado <span className="text-red-500">*</span></label>
                    <div className="flex flex-wrap gap-2">
                      {WEIGHT_LEVELS.map((w) => (
                        <button key={w} type="button" onClick={() => setManualLoad({ ...manualLoad, weightLevel: w })}
                          className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${manualLoad.weightLevel === w ? "bg-emerald-600 text-white border-emerald-600" : "bg-white border-slate-300 text-slate-600"}`}>
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tempo da jornada */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Tempo da jornada dedicado <span className="text-red-500">*</span></label>
                    <div className="flex flex-wrap gap-2">
                      {TIME_PERCENTAGES.map((t) => (
                        <button key={t} type="button" onClick={() => setManualLoad({ ...manualLoad, timePercentage: t })}
                          className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${manualLoad.timePercentage === t ? "bg-emerald-600 text-white border-emerald-600" : "bg-white border-slate-300 text-slate-600"}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Frequência de esforço */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Frequência de esforço físico por minuto <span className="text-red-500">*</span></label>
                    <div className="flex flex-wrap gap-2">
                      {EFFORT_FREQUENCIES.map((f) => (
                        <button key={f} type="button" onClick={() => setManualLoad({ ...manualLoad, effortFrequency: f })}
                          className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${manualLoad.effortFrequency === f ? "bg-emerald-600 text-white border-emerald-600" : "bg-white border-slate-300 text-slate-600"}`}>
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Qualidade da pega */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Qualidade da pega <span className="text-red-500">*</span></label>
                    <div className="flex flex-wrap gap-2">
                      {GRIP_QUALITIES.map((g) => (
                        <button key={g} type="button" onClick={() => setManualLoad({ ...manualLoad, gripQuality: g })}
                          className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${manualLoad.gripQuality === g ? "bg-emerald-600 text-white border-emerald-600" : "bg-white border-slate-300 text-slate-600"}`}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ritmo de trabalho */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Ritmo de trabalho <span className="text-red-500">*</span></label>
                    <div className="flex flex-wrap gap-2">
                      {WORK_PACES.map((wp) => (
                        <button key={wp} type="button" onClick={() => setManualLoad({ ...manualLoad, workPace: wp })}
                          className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${manualLoad.workPace === wp ? "bg-emerald-600 text-white border-emerald-600" : "bg-white border-slate-300 text-slate-600"}`}>
                          {wp}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duração diária */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Duração diária dessa atividade <span className="text-red-500">*</span></label>
                    <div className="flex flex-wrap gap-2">
                      {DAILY_DURATIONS.map((d) => (
                        <button key={d} type="button" onClick={() => setManualLoad({ ...manualLoad, dailyDuration: d })}
                          className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${manualLoad.dailyDuration === d ? "bg-emerald-600 text-white border-emerald-600" : "bg-white border-slate-300 text-slate-600"}`}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button onClick={() => { setStepErrors([]); setStep(2); }}
                  className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
                  Voltar
                </button>
                <button onClick={() => { if (validateStep3()) { setStepErrors([]); setStep(4); } }}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors">
                  Próximo
                </button>
              </div>
            </div>
          )}

          {/* ════════ ETAPA 4: ASSINATURA ════════ */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 mb-1">Assinatura</h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Assinatura do trabalhador</label>
                <div className="border border-slate-300 rounded-lg overflow-hidden bg-white" style={{ touchAction: "none" }}>
                  <canvas
                    ref={canvasRef}
                    width={300}
                    height={150}
                    className="w-full cursor-crosshair"
                    style={{ maxWidth: "100%", height: "auto" }}
                    onMouseDown={(e) => startDrawing(e.clientX, e.clientY)}
                    onMouseMove={(e) => draw(e.clientX, e.clientY)}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      const t = e.touches[0];
                      startDrawing(t.clientX, t.clientY);
                    }}
                    onTouchMove={(e) => {
                      e.preventDefault();
                      const t = e.touches[0];
                      draw(t.clientX, t.clientY);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      stopDrawing();
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="mt-2 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Limpar
                </button>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(3)}
                  className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
                  Voltar
                </button>
                <button onClick={handleSubmit}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors">
                  Finalizar Questionário
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
