"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

// ─── Types ───────────────────────────────────────────────────────────
export interface Company { id: string; name: string; cnpj: string; city: string; }
export interface Sector { id: string; companyId: string; name: string; }
export interface Position { id: string; sectorId: string; companyId: string; name: string; }

export type PainIntensity = "baixa" | "media" | "alta";
export type Laterality = "direito" | "esquerdo" | "ambos" | "nsa";
export type WorkRelation = "ja_inicia_com_dor" | "piora_ao_longo" | "surge_ao_final" | "sem_relacao";
export interface PainArea { region: string; side: Laterality; intensity: PainIntensity; workRelation: WorkRelation; }
export interface ManualLoadData { performs: boolean; weightLevel: string; timePercentage: string; effortFrequency: string; gripQuality: string; workPace: string; dailyDuration: string; }

export interface SurveyResponse {
  id: string; companyId: string; workerName: string; sector: string; position: string;
  height: number; weight?: number; sex?: string;
  ergonomicRisks?: string[];
  painAreas?: PainArea[];
  manualLoad?: ManualLoadData;
  signature?: string;
  createdAt: string;
}

export type QuestionType = "marcacao" | "numerico";
export interface QuestionOption { label: string; }
export interface BlockQuestion { id: string; text: string; type: QuestionType; unit?: string; options?: QuestionOption[]; order: number; }
export interface ChecklistBlock { id: string; name: string; image?: string; questions: BlockQuestion[]; }
export interface ChecklistTemplate { id: string; name: string; blockIds: string[]; }

export interface FilledAnswer { questionId: string; questionText: string; type: QuestionType; value: string; evidence?: string; recommendation?: string; photos?: string[]; }
export interface FilledBlock { blockId: string; blockName: string; image?: string; answers: FilledAnswer[]; blockRecommendation: string; }

export interface Assessment {
  id: string; companyId: string; sectorId: string; positionId: string;
  templateId: string; templateName: string; workstation: string; observedWorker: string;
  filledBlocks?: FilledBlock[]; generalNotes: string; createdAt: string;
}

export interface ActionItem {
  id: string; companyId: string; recommendation: string;
  priority: "alta" | "media" | "baixa"; responsible: string;
  status: "pendente" | "em_andamento" | "concluido"; deadline: string;
}

export interface AnthroRange { id: string; name: string; minHeight: number; maxHeight: number; image?: string; }

export interface AppUser { id: string; email: string; name: string; role: string; }

// ─── Constants ───────────────────────────────────────────────────────
export const BODY_REGIONS_NO_LATERAL = ["Olhos", "Cabeça", "Pescoço", "Trapézio", "Tórax", "Lombar", "Nádegas"];
export const BODY_REGIONS_WITH_LATERAL = ["Ombros", "Braços", "Cotovelos", "Antebraços", "Punhos", "Mãos e Dedos", "Coxas", "Joelhos", "Panturrilhas", "Tornozelos", "Pés e Dedos"];
export const ALL_BODY_REGIONS = [...BODY_REGIONS_NO_LATERAL, ...BODY_REGIONS_WITH_LATERAL];

export const ERGONOMIC_RISKS = [
  "Fico por longos períodos sentado",
  "Fico por longos períodos em pé",
  "Minha atividade exige muito deslocamento a pé durante o trabalho",
  "Tenho que fazer muito esforço físico intenso",
  "Preciso ficar carregando peso constantemente para executar meu trabalho",
  "Uso muito alavancas",
  "Uso muito pedais",
  "Tenho que digitar muito no teclado do computador durante o trabalho",
  "Tenho que trabalhar à noite frequentemente",
  "Meu trabalho é muito repetitivo",
  "Recebo por produtividade",
];
const ASSESSMENT_LIST_SELECT = "id,company_id,sector_id,position_id,template_id,template_name,workstation,observed_worker,general_notes,created_at";
const SURVEY_LIST_SELECT = "id,company_id,worker_name,sector,position,height,weight,sex,created_at,pain_areas,ergonomic_risks,manual_load";

// ─── Context ─────────────────────────────────────────────────────────
interface DataContextType {
  user: AppUser | null;
  companies: Company[];
  sectors: Sector[];
  positions: Position[];
  surveys: SurveyResponse[];
  assessments: Assessment[];
  actions: ActionItem[];
  blocks: ChecklistBlock[];
  templates: ChecklistTemplate[];
  anthroRanges: AnthroRange[];
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  getFullAssessment: (id: string) => Promise<Assessment | null>;
  getFullAssessmentsForCompany: (companyId: string) => Promise<Assessment[]>;
  getFullSurvey: (id: string) => Promise<SurveyResponse | null>;
  getFullSurveysForCompany: (companyId: string) => Promise<SurveyResponse[]>;
  addCompany: (c: Omit<Company, "id">) => Promise<Company>;
  updateCompany: (id: string, data: Partial<Company>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
  addSector: (s: Omit<Sector, "id">) => Promise<Sector>;
  deleteSector: (id: string) => Promise<void>;
  addPosition: (p: Omit<Position, "id">) => Promise<Position>;
  deletePosition: (id: string) => Promise<void>;
  addSurvey: (s: Omit<SurveyResponse, "id" | "createdAt">) => Promise<void>;
  updateSurvey: (id: string, data: Partial<SurveyResponse>) => Promise<void>;
  deleteSurvey: (id: string) => Promise<void>;
  addAssessment: (a: Omit<Assessment, "id" | "createdAt">) => Promise<void>;
  updateAssessment: (id: string, data: Partial<Assessment>) => Promise<void>;
  deleteAssessment: (id: string) => Promise<void>;
  addAction: (a: Omit<ActionItem, "id">) => Promise<void>;
  updateAction: (id: string, data: Partial<ActionItem>) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;
  addBlock: (b: Omit<ChecklistBlock, "id">) => Promise<ChecklistBlock>;
  updateBlock: (id: string, data: Partial<ChecklistBlock>) => Promise<void>;
  deleteBlock: (id: string) => Promise<void>;
  addTemplate: (t: Omit<ChecklistTemplate, "id">) => Promise<ChecklistTemplate>;
  updateTemplate: (id: string, data: Partial<ChecklistTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  addAnthroRange: (r: Omit<AnthroRange, "id">) => Promise<AnthroRange>;
  updateAnthroRange: (id: string, data: Partial<AnthroRange>) => Promise<void>;
  deleteAnthroRange: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be inside DataProvider");
  return ctx;
}

// ─── Helper: map DB row to app type ─────────────────────────────────
function mapCompany(r: any): Company { return { id: r.id, name: r.name, cnpj: r.cnpj, city: r.city }; }
function mapSector(r: any): Sector { return { id: r.id, companyId: r.company_id, name: r.name }; }
function mapPosition(r: any): Position { return { id: r.id, sectorId: r.sector_id, companyId: r.company_id, name: r.name }; }
function mapSurvey(r: any): SurveyResponse {
  return {
    id: r.id, companyId: r.company_id, workerName: r.worker_name, sector: r.sector,
    position: r.position, height: r.height, weight: r.weight, sex: r.sex,
    ...(r.ergonomic_risks !== undefined && { ergonomicRisks: r.ergonomic_risks || [] }),
    ...(r.pain_areas !== undefined && { painAreas: r.pain_areas || [] }),
    ...(r.manual_load !== undefined && { manualLoad: r.manual_load }),
    ...(r.signature !== undefined && { signature: r.signature }),
    createdAt: r.created_at,
  };
}
function mapAssessment(r: any): Assessment {
  return {
    id: r.id, companyId: r.company_id, sectorId: r.sector_id, positionId: r.position_id,
    templateId: r.template_id, templateName: r.template_name, workstation: r.workstation,
    observedWorker: r.observed_worker,
    ...(r.filled_blocks !== undefined && { filledBlocks: r.filled_blocks || [] }),
    generalNotes: r.general_notes, createdAt: r.created_at,
  };
}
function mapAction(r: any): ActionItem {
  return { id: r.id, companyId: r.company_id, recommendation: r.recommendation, priority: r.priority, responsible: r.responsible, status: r.status, deadline: r.deadline };
}
function mapBlock(r: any): ChecklistBlock { return { id: r.id, name: r.name, image: r.image, questions: r.questions || [] }; }
function mapTemplate(r: any): ChecklistTemplate { return { id: r.id, name: r.name, blockIds: r.block_ids || [] }; }
function mapAnthro(r: any): AnthroRange { return { id: r.id, name: r.name, minHeight: r.min_height, maxHeight: r.max_height, image: r.image }; }

// ─── Provider ────────────────────────────────────────────────────────
export function DataProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [surveys, setSurveys] = useState<SurveyResponse[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [blocks, setBlocks] = useState<ChecklistBlock[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [anthroRanges, setAnthroRanges] = useState<AnthroRange[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAllData = async () => {
    try {
      const [c, s, p] = await Promise.all([
        supabase.from("companies").select("*"),
        supabase.from("sectors").select("*"),
        supabase.from("positions").select("*"),
      ]);
      setCompanies((c.data || []).map(mapCompany));
      setSectors((s.data || []).map(mapSector));
      setPositions((p.data || []).map(mapPosition));

      const [sv, a, ac] = await Promise.all([
        supabase.from("surveys").select(SURVEY_LIST_SELECT).order("created_at", { ascending: false }),
        supabase.from("assessments").select(ASSESSMENT_LIST_SELECT).order("created_at", { ascending: false }),
        supabase.from("actions").select("*"),
      ]);
      setSurveys((sv.data || []).map(mapSurvey));
      setAssessments((a.data || []).map(mapAssessment));
      setActions((ac.data || []).map(mapAction));

      const [b, t, ar] = await Promise.all([
        supabase.from("blocks").select("*"),
        supabase.from("templates").select("*"),
        supabase.from("anthro_ranges").select("*"),
      ]);
      setBlocks((b.data || []).map(mapBlock));
      setTemplates((t.data || []).map(mapTemplate));
      setAnthroRanges((ar.data || []).map(mapAnthro));
    } catch (e) {
      console.error("loadData error:", e);
    }
  };

  const getFullAssessment = useCallback(async (id: string): Promise<Assessment | null> => {
    const { data, error } = await supabase.from("assessments").select("*").eq("id", id).single();
    if (error || !data) return null;
    return mapAssessment(data);
  }, []);

  const getFullAssessmentsForCompany = useCallback(async (companyId: string): Promise<Assessment[]> => {
    const { data } = await supabase.from("assessments").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
    return (data || []).map(mapAssessment);
  }, []);

  const getFullSurvey = useCallback(async (id: string): Promise<SurveyResponse | null> => {
    const { data, error } = await supabase.from("surveys").select("*").eq("id", id).single();
    if (error || !data) return null;
    return mapSurvey(data);
  }, []);

  const getFullSurveysForCompany = useCallback(async (companyId: string): Promise<SurveyResponse[]> => {
    const { data } = await supabase.from("surveys").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
    return (data || []).map(mapSurvey);
  }, []);
  const loadData = loadAllData;

  // ── Set user from Supabase auth user ──
  const handleUser = async (supabaseUser: { id: string; email?: string } | null) => {
    if (!supabaseUser) {
      setUser(null);
      setCompanies([]); setSectors([]); setPositions([]); setSurveys([]);
      setAssessments([]); setActions([]); setBlocks([]); setTemplates([]); setAnthroRanges([]);
      return;
    }
    // Set user first (even without profile) so UI unblocks
    setUser({
      id: supabaseUser.id,
      email: supabaseUser.email || "",
      name: supabaseUser.email || "",
      role: "consultor",
    });
    // Then load profile and data in background
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", supabaseUser.id).single();
    if (profile) {
      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email || "",
        name: profile.full_name || supabaseUser.email || "",
        role: profile.role || "consultor",
      });
    }
    await loadAllData();
  };

  // ── Init: check session once ──
  useEffect(() => {
    // Timeout de segurança: se loading não terminar em 8s, força
    const safetyTimeout = setTimeout(() => setLoading(false), 8000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleUser(session.user).finally(() => { clearTimeout(safetyTimeout); setLoading(false); });
      } else {
        clearTimeout(safetyTimeout);
        setLoading(false);
      }
    }).catch(() => { clearTimeout(safetyTimeout); setLoading(false); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        handleUser(session.user).finally(() => setLoading(false));
      } else if (event === "SIGNED_OUT") {
        handleUser(null);
        setLoading(false);
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        // Silently refresh - data already loaded
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auth ──
  const login = async (email: string, password: string) => {
    const timeout = new Promise<{ error: { message: string } }>((resolve) =>
      setTimeout(() => resolve({ error: { message: "Tempo limite excedido" } }), 15000)
    );
    const attempt = supabase.auth.signInWithPassword({ email, password });
    const result = await Promise.race([attempt, timeout]);
    return !result.error;
  };

  const register = async (name: string, email: string, password: string) => {
    const timeout = new Promise<{ data: { user: null }; error: { message: string } }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null }, error: { message: "Tempo limite" } }), 15000)
    );
    const attempt = supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
    const { data, error } = await Promise.race([attempt, timeout]);
    if (error || !data.user) return false;
    await supabase.from("profiles").upsert({ id: data.user.id, full_name: name });
    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  // ── Companies ──
  const addCompany = async (c: Omit<Company, "id">) => {
    const { data, error } = await supabase.from("companies").insert({ name: c.name, cnpj: c.cnpj, city: c.city, user_id: user?.id }).select().single();
    if (error || !data) { console.error("addCompany error:", error); throw new Error(error?.message || "Erro ao criar empresa"); }
    const company = mapCompany(data);
    setCompanies((prev) => [...prev, company]);
    return company;
  };

  const updateCompany = async (id: string, d: Partial<Company>) => {
    await supabase.from("companies").update({ name: d.name, cnpj: d.cnpj, city: d.city }).eq("id", id);
    setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...d } : c)));
  };

  const deleteCompany = async (id: string) => {
    await supabase.from("companies").delete().eq("id", id);
    setCompanies((prev) => prev.filter((c) => c.id !== id));
    setSectors((prev) => prev.filter((s) => s.companyId !== id));
    setPositions((prev) => prev.filter((p) => p.companyId !== id));
    setSurveys((prev) => prev.filter((s) => s.companyId !== id));
    setAssessments((prev) => prev.filter((a) => a.companyId !== id));
    setActions((prev) => prev.filter((a) => a.companyId !== id));
  };

  // ── Sectors ──
  const addSector = async (s: Omit<Sector, "id">) => {
    const { data, error } = await supabase.from("sectors").insert({ company_id: s.companyId, name: s.name }).select().single();
    if (error || !data) { console.error("addSector error:", error); throw new Error(error?.message || "Erro ao criar setor"); }
    const sector = mapSector(data);
    setSectors((prev) => [...prev, sector]);
    return sector;
  };

  const deleteSector = async (id: string) => {
    await supabase.from("sectors").delete().eq("id", id);
    setSectors((prev) => prev.filter((s) => s.id !== id));
    setPositions((prev) => prev.filter((p) => p.sectorId !== id));
  };

  // ── Positions ──
  const addPosition = async (p: Omit<Position, "id">) => {
    const { data, error } = await supabase.from("positions").insert({ sector_id: p.sectorId, company_id: p.companyId, name: p.name }).select().single();
    if (error || !data) { console.error("addPosition error:", error); throw new Error(error?.message || "Erro ao criar cargo"); }
    const pos = mapPosition(data);
    setPositions((prev) => [...prev, pos]);
    return pos;
  };

  const deletePosition = async (id: string) => {
    await supabase.from("positions").delete().eq("id", id);
    setPositions((prev) => prev.filter((p) => p.id !== id));
  };

  // ── Surveys ──
  const addSurvey = async (s: Omit<SurveyResponse, "id" | "createdAt">) => {
    const { data } = await supabase.from("surveys").insert({
      company_id: s.companyId, worker_name: s.workerName, sector: s.sector,
      position: s.position, height: s.height, ergonomic_risks: s.ergonomicRisks,
      pain_areas: s.painAreas, manual_load: s.manualLoad, signature: s.signature,
    }).select().single();
    if (data) setSurveys((prev) => [mapSurvey(data), ...prev]);
  };

  const updateSurvey = async (id: string, d: Partial<SurveyResponse>) => {
    const update: any = {};
    if (d.workerName !== undefined) update.worker_name = d.workerName;
    if (d.sector !== undefined) update.sector = d.sector;
    if (d.position !== undefined) update.position = d.position;
    if (d.height !== undefined) update.height = d.height;
    if (d.ergonomicRisks !== undefined) update.ergonomic_risks = d.ergonomicRisks;
    if (d.painAreas !== undefined) update.pain_areas = d.painAreas;
    if (d.manualLoad !== undefined) update.manual_load = d.manualLoad;
    await supabase.from("surveys").update(update).eq("id", id);
    setSurveys((prev) => prev.map((s) => (s.id === id ? { ...s, ...d } : s)));
  };

  const deleteSurvey = async (id: string) => {
    await supabase.from("surveys").delete().eq("id", id);
    setSurveys((prev) => prev.filter((s) => s.id !== id));
  };

  // ── Assessments ──
  const addAssessment = async (a: Omit<Assessment, "id" | "createdAt">) => {
    const { data } = await supabase.from("assessments").insert({
      company_id: a.companyId, sector_id: a.sectorId, position_id: a.positionId,
      template_id: a.templateId, template_name: a.templateName, workstation: a.workstation,
      observed_worker: a.observedWorker, filled_blocks: a.filledBlocks, general_notes: a.generalNotes,
    }).select().single();
    if (data) setAssessments((prev) => [mapAssessment(data), ...prev]);
  };

  const updateAssessment = async (id: string, d: Partial<Assessment>) => {
    const update: any = {};
    if (d.filledBlocks !== undefined) update.filled_blocks = d.filledBlocks;
    if (d.generalNotes !== undefined) update.general_notes = d.generalNotes;
    if (d.workstation !== undefined) update.workstation = d.workstation;
    if (d.observedWorker !== undefined) update.observed_worker = d.observedWorker;
    const { error } = await supabase.from("assessments").update(update).eq("id", id);
    if (error) console.error("updateAssessment error:", error);
    setAssessments((prev) => prev.map((a) => (a.id === id ? { ...a, ...d } : a)));
  };

  const deleteAssessment = async (id: string) => {
    const { error } = await supabase.from("assessments").delete().eq("id", id);
    if (error) console.error("deleteAssessment error:", error);
    setAssessments((prev) => prev.filter((a) => a.id !== id));
  };

  // ── Actions ──
  const addAction = async (a: Omit<ActionItem, "id">) => {
    const { data } = await supabase.from("actions").insert({
      company_id: a.companyId, recommendation: a.recommendation, priority: a.priority,
      responsible: a.responsible, status: a.status, deadline: a.deadline,
    }).select().single();
    if (data) setActions((prev) => [...prev, mapAction(data)]);
  };

  const updateAction = async (id: string, d: Partial<ActionItem>) => {
    const update: any = {};
    if (d.recommendation !== undefined) update.recommendation = d.recommendation;
    if (d.priority !== undefined) update.priority = d.priority;
    if (d.responsible !== undefined) update.responsible = d.responsible;
    if (d.status !== undefined) update.status = d.status;
    if (d.deadline !== undefined) update.deadline = d.deadline;
    await supabase.from("actions").update(update).eq("id", id);
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, ...d } : a)));
  };

  const deleteAction = async (id: string) => {
    await supabase.from("actions").delete().eq("id", id);
    setActions((prev) => prev.filter((a) => a.id !== id));
  };

  // ── Blocks ──
  const addBlock = async (b: Omit<ChecklistBlock, "id">) => {
    const { data, error } = await supabase.from("blocks").insert({ name: b.name, image: b.image || null, questions: b.questions, user_id: user?.id }).select().single();
    if (error || !data) { console.error("addBlock error:", error); throw new Error(error?.message || "Erro ao criar bloco"); }
    const block = mapBlock(data);
    setBlocks((prev) => [...prev, block]);
    return block;
  };

  const updateBlock = async (id: string, d: Partial<ChecklistBlock>) => {
    const update: any = {};
    if (d.name !== undefined) update.name = d.name;
    if (d.image !== undefined) update.image = d.image;
    if (d.questions !== undefined) update.questions = d.questions;
    const { error } = await supabase.from("blocks").update(update).eq("id", id);
    if (error) console.error("updateBlock error:", error);
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...d } : b)));
  };

  const deleteBlock = async (id: string) => {
    const { error } = await supabase.from("blocks").delete().eq("id", id);
    if (error) console.error("deleteBlock error:", error);
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  // ── Templates ──
  const addTemplate = async (t: Omit<ChecklistTemplate, "id">) => {
    const { data, error } = await supabase.from("templates").insert({ name: t.name, block_ids: t.blockIds, user_id: user?.id }).select().single();
    if (error || !data) { console.error("addTemplate error:", error); throw new Error(error?.message || "Erro ao criar template"); }
    const template = mapTemplate(data);
    setTemplates((prev) => [...prev, template]);
    return template;
  };

  const updateTemplate = async (id: string, d: Partial<ChecklistTemplate>) => {
    const update: any = {};
    if (d.name !== undefined) update.name = d.name;
    if (d.blockIds !== undefined) update.block_ids = d.blockIds;
    const { error } = await supabase.from("templates").update(update).eq("id", id);
    if (error) console.error("updateTemplate error:", error);
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...d } : t)));
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from("templates").delete().eq("id", id);
    if (error) console.error("deleteTemplate error:", error);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  // ── Anthro Ranges ──
  const addAnthroRange = async (r: Omit<AnthroRange, "id">) => {
    const { data, error } = await supabase.from("anthro_ranges").insert({ name: r.name, min_height: r.minHeight, max_height: r.maxHeight, image: r.image || null, user_id: user?.id }).select().single();
    if (error || !data) { console.error("addAnthroRange error:", error); throw new Error(error?.message || "Erro ao criar faixa"); }
    const range = mapAnthro(data);
    setAnthroRanges((prev) => [...prev, range]);
    return range;
  };

  const updateAnthroRange = async (id: string, d: Partial<AnthroRange>) => {
    const update: any = {};
    if (d.name !== undefined) update.name = d.name;
    if (d.minHeight !== undefined) update.min_height = d.minHeight;
    if (d.maxHeight !== undefined) update.max_height = d.maxHeight;
    if (d.image !== undefined) update.image = d.image;
    const { error } = await supabase.from("anthro_ranges").update(update).eq("id", id);
    if (error) console.error("updateAnthroRange error:", error);
    setAnthroRanges((prev) => prev.map((r) => (r.id === id ? { ...r, ...d } : r)));
  };

  const deleteAnthroRange = async (id: string) => {
    const { error } = await supabase.from("anthro_ranges").delete().eq("id", id);
    if (error) console.error("deleteAnthroRange error:", error);
    setAnthroRanges((prev) => prev.filter((r) => r.id !== id));
  };

  const refreshData = loadData;

  return (
    <DataContext.Provider
      value={{
        user, companies, sectors, positions, surveys, assessments, actions, blocks, templates, anthroRanges, loading,
        login, register, logout,
        getFullAssessment, getFullAssessmentsForCompany, getFullSurvey, getFullSurveysForCompany,
        addCompany, updateCompany, deleteCompany, addSector, deleteSector, addPosition, deletePosition,
        addSurvey, updateSurvey, deleteSurvey, addAssessment, updateAssessment, deleteAssessment, addAction, updateAction, deleteAction,
        addBlock, updateBlock, deleteBlock, addTemplate, updateTemplate, deleteTemplate,
        addAnthroRange, updateAnthroRange, deleteAnthroRange, refreshData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
