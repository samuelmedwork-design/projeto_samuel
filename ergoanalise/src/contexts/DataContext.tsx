"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

// ─── Types ───────────────────────────────────────────────────────────
export interface Company {
  id: string; name: string; cnpj: string; city: string;
  razaoSocial?: string; endereco?: string; cnaePrincipal?: string;
  telefone?: string; email?: string; logoUrl?: string; conclusaoAet?: string;
}
export interface Sector { id: string; companyId: string; name: string; }
export interface Position { id: string; sectorId: string; companyId: string; name: string; descricao?: string; }
export interface Avaliador { id: string; nome: string; cpf?: string; formacao?: string; registroProfissional?: string; }

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

export interface ActionPlanQuestion {
  id: string; question: string; priority: 'baixa' | 'media' | 'alta' | 'urgente'; ordem: number;
}
export interface DocumentTemplate {
  id: string; type: 'cover' | 'body_initial' | 'body_final'; content: string;
}
export interface Aet {
  id: string; companyId: string; currentStep: number; conclusaoGeral: string;
  createdAt: string; completedAt?: string;
}

export interface Gse {
  id: string;
  companyId: string;
  numero: number;
  conclusao: string;
  positionIds: string[];   // derivado de gse_positions
  assessmentIds: string[]; // derivado de gse_assessments
  risks: string[];         // derivado de gse_risks
  excludedActionIds: string[]; // IDs de itens do plano específico removidos manualmente
}

export interface ActionChecklistItem {
  id: string;
  companyId: string;
  item: string;
  resposta: "sim" | "nao" | "nao_se_aplica" | null;
  ordem: number;
}

// Lista oficial de riscos ergonômicos do GSE (imutável)
export const GSE_RISKS = [
  "Cadência do trabalho imposta por um equipamento",
  "Compressão de partes do corpo por superfícies rígidas ou com quinas",
  "Desequilíbrio entre tempo de trabalho e tempo de repouso",
  "Exigência de elevação frequente de membros superiores",
  "Exigência de flexões de coluna vertebral frequentes",
  "Exigência de uso frequente de força, pressão, preensão, flexão, extensão ou torção dos segmentos corporais",
  "Frequente ação de puxar/empurrar cargas ou volumes",
  "Frequente deslocamento a pé durante a jornada de trabalho",
  "Frequente execução de movimentos repetitivos",
  "Insuficiência de capacitação para execução da tarefa",
  "Levantamento e transporte manual de cargas ou volumes",
  "Manuseio de ferramentas e/ou objetos pesados por longos períodos",
  "Manuseio ou movimentação de cargas e volumes sem pega ou com \"pega pobre\"",
  "Monotonia",
  "Necessidade de manter ritmos intensos de trabalho",
  "Postura de pé por longos períodos",
  "Postura sentada por longos períodos",
  "Trabalho com esforço físico intenso",
  "Trabalho com necessidade de variação de turnos",
  "Trabalho com utilização rigorosa de metas de produção",
  "Trabalho em posturas incômodas ou pouco confortáveis por longos períodos",
  "Trabalho intensivo com teclado ou outros dispositivos de entrada de dados",
  "Trabalho noturno",
  "Trabalho realizado sem pausas pré-definidas para descanso",
  "Trabalho remunerado por produção",
  "Uso frequente de alavancas",
  "Uso frequente de escadas",
  "Uso frequente de pedais",
] as const;

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
  avaliadores: Avaliador[];
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
  updatePosition: (id: string, data: Partial<Omit<Position, "id">>) => Promise<void>;
  deletePosition: (id: string) => Promise<void>;
  addAvaliador: (a: Omit<Avaliador, "id">) => Promise<Avaliador>;
  updateAvaliador: (id: string, data: Partial<Avaliador>) => Promise<void>;
  deleteAvaliador: (id: string) => Promise<void>;
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
  // GSE
  gses: Gse[];
  addGse: (companyId: string) => Promise<Gse>;
  updateGse: (id: string, data: { conclusao?: string; excludedActionIds?: string[] }) => Promise<void>;
  deleteGse: (id: string) => Promise<void>;
  addGsePosition: (gseId: string, positionId: string) => Promise<void>;
  removeGsePosition: (gseId: string, positionId: string) => Promise<void>;
  addGseRisk: (gseId: string, risco: string) => Promise<void>;
  removeGseRisk: (gseId: string, risco: string) => Promise<void>;
  addGseAssessment: (gseId: string, assessmentId: string) => Promise<void>;
  removeGseAssessment: (gseId: string, assessmentId: string) => Promise<void>;
  // Action Checklist (Plano Geral) — legacy, mantido para compatibilidade
  actionChecklist: ActionChecklistItem[];
  addActionChecklistItem: (companyId: string, item: string) => Promise<void>;
  updateActionChecklistItem: (id: string, d: Partial<Pick<ActionChecklistItem, "resposta" | "item">>) => Promise<void>;
  deleteActionChecklistItem: (id: string) => Promise<void>;
  // Action Plan Questions (Cadastros)
  actionPlanQuestions: ActionPlanQuestion[];
  addActionPlanQuestion: (q: Omit<ActionPlanQuestion, "id">) => Promise<ActionPlanQuestion>;
  updateActionPlanQuestion: (id: string, d: Partial<ActionPlanQuestion>) => Promise<void>;
  deleteActionPlanQuestion: (id: string) => Promise<void>;
  // Document Templates (Cadastros)
  documentTemplates: DocumentTemplate[];
  saveDocumentTemplate: (type: DocumentTemplate["type"], content: string) => Promise<void>;
  // AETs
  aets: Aet[];
  addAet: (companyId: string) => Promise<Aet>;
  updateAet: (id: string, d: Partial<Pick<Aet, "currentStep" | "conclusaoGeral" | "completedAt">>) => Promise<void>;
  deleteAet: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be inside DataProvider");
  return ctx;
}

// ─── Helper: map DB row to app type ─────────────────────────────────
function mapCompany(r: any): Company {
  return {
    id: r.id, name: r.nome_fantasia || r.name, cnpj: r.cnpj, city: r.city || '',
    razaoSocial: r.razao_social || '', endereco: r.endereco || '',
    cnaePrincipal: r.cnae_principal || '', telefone: r.telefone || '',
    email: r.email || '', logoUrl: r.logo_url || '', conclusaoAet: r.conclusao_aet || '',
  };
}
function mapSector(r: any): Sector { return { id: r.id, companyId: r.company_id, name: r.name }; }
function mapPosition(r: any): Position { return { id: r.id, sectorId: r.sector_id, companyId: r.company_id, name: r.name, descricao: r.descricao || '' }; }
function mapAvaliador(r: any): Avaliador { return { id: r.id, nome: r.nome, cpf: r.cpf || '', formacao: r.formacao || '', registroProfissional: r.registro_profissional || '' }; }
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

function buildGse(row: any, positions: string[], assessments: string[], risks: string[]): Gse {
  return { id: row.id, companyId: row.company_id, numero: row.numero, conclusao: row.conclusao || '', positionIds: positions, assessmentIds: assessments, risks, excludedActionIds: row.excluded_action_ids || [] };
}
function mapActionChecklist(r: any): ActionChecklistItem {
  return { id: r.id, companyId: r.company_id, item: r.item, resposta: r.resposta || null, ordem: r.ordem || 0 };
}
function mapActionPlanQuestion(r: any): ActionPlanQuestion {
  return { id: r.id, question: r.question, priority: r.priority, ordem: r.ordem || 0 };
}
function mapDocumentTemplate(r: any): DocumentTemplate {
  return { id: r.id, type: r.type, content: r.content || '' };
}
function mapAet(r: any): Aet {
  return { id: r.id, companyId: r.company_id, currentStep: r.current_step || 1, conclusaoGeral: r.conclusao_geral || '', createdAt: r.created_at, completedAt: r.completed_at || undefined };
}

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
  const [avaliadores, setAvaliadores] = useState<Avaliador[]>([]);
  const [gses, setGses] = useState<Gse[]>([]);
  const [actionChecklist, setActionChecklist] = useState<ActionChecklistItem[]>([]);
  const [actionPlanQuestions, setActionPlanQuestions] = useState<ActionPlanQuestion[]>([]);
  const [documentTemplates, setDocumentTemplates] = useState<DocumentTemplate[]>([]);
  const [aets, setAets] = useState<Aet[]>([]);
  const [loading, setLoading] = useState(true);

  // Busca todos os registros de uma tabela ignorando o limite padrão de 1000 linhas do PostgREST
  const fetchAll = async (table: string, columns = "*") => {
    const PAGE = 1000;
    let offset = 0;
    let all: any[] = [];
    while (true) {
      const { data, error } = await (supabase.from(table) as any)
        .select(columns)
        .range(offset, offset + PAGE - 1);
      if (error || !data || data.length === 0) break;
      all = all.concat(data);
      if (data.length < PAGE) break;
      offset += PAGE;
    }
    return all;
  };

  const loadAllData = async () => {
    try {
      const [c, s] = await Promise.all([
        supabase.from("companies").select("*"),
        supabase.from("sectors").select("*"),
      ]);
      const allPositions = await fetchAll("positions");
      setCompanies((c.data || []).map(mapCompany));
      setSectors((s.data || []).map(mapSector));
      setPositions(allPositions.map(mapPosition));

      const [sv, a, ac] = await Promise.all([
        supabase.from("surveys").select(SURVEY_LIST_SELECT).order("created_at", { ascending: false }),
        supabase.from("assessments").select(ASSESSMENT_LIST_SELECT).order("created_at", { ascending: false }),
        supabase.from("actions").select("*"),
      ]);
      setSurveys((sv.data || []).map(mapSurvey));
      setAssessments((a.data || []).map(mapAssessment));
      setActions((ac.data || []).map(mapAction));

      const [b, t, ar, av] = await Promise.all([
        supabase.from("blocks").select("*"),
        supabase.from("templates").select("*"),
        supabase.from("anthro_ranges").select("*"),
        supabase.from("avaliadores").select("*"),
      ]);
      setBlocks((b.data || []).map(mapBlock));
      setTemplates((t.data || []).map(mapTemplate));
      setAnthroRanges((ar.data || []).map(mapAnthro));
      setAvaliadores((av.data || []).map(mapAvaliador));

      // Load action checklist items
      const { data: acData } = await supabase.from("action_checklist_items").select("*").order("ordem");
      setActionChecklist((acData || []).map(mapActionChecklist));

      // Load GSEs with related data
      const [gseRows, gsePos, gseRisk, gseAss] = await Promise.all([
        supabase.from("gse").select("*").order("numero"),
        supabase.from("gse_positions").select("*"),
        supabase.from("gse_risks").select("*"),
        supabase.from("gse_assessments").select("*"),
      ]);
      const gsePosData = gsePos.data || [];
      const gseRiskData = gseRisk.data || [];
      const gseAssData = gseAss.data || [];
      setGses((gseRows.data || []).map((row: any) =>
        buildGse(
          row,
          gsePosData.filter((p: any) => p.gse_id === row.id).map((p: any) => p.position_id),
          gseAssData.filter((a: any) => a.gse_id === row.id).map((a: any) => a.assessment_id),
          gseRiskData.filter((r: any) => r.gse_id === row.id).map((r: any) => r.risco),
        )
      ));

      // Load action plan questions, document templates, AETs
      const [apqRes, dtRes, aetRes] = await Promise.all([
        supabase.from("action_plan_questions").select("*").order("ordem"),
        supabase.from("document_templates").select("*"),
        supabase.from("aets").select("*").order("created_at", { ascending: false }),
      ]);
      setActionPlanQuestions((apqRes.data || []).map(mapActionPlanQuestion));
      setDocumentTemplates((dtRes.data || []).map(mapDocumentTemplate));
      setAets((aetRes.data || []).map(mapAet));
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
      setAssessments([]); setActions([]); setBlocks([]); setTemplates([]); setAnthroRanges([]); setAvaliadores([]); setGses([]); setActionChecklist([]);
      setActionPlanQuestions([]); setDocumentTemplates([]); setAets([]);
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
    const { data, error } = await supabase.from("companies").insert({
      name: c.name, nome_fantasia: c.name, cnpj: c.cnpj, city: c.city,
      razao_social: c.razaoSocial, endereco: c.endereco, cnae_principal: c.cnaePrincipal,
      telefone: c.telefone, email: c.email, logo_url: c.logoUrl, conclusao_aet: c.conclusaoAet,
      user_id: user?.id,
    }).select().single();
    if (error || !data) { console.error("addCompany error:", error); throw new Error(error?.message || "Erro ao criar empresa"); }
    const company = mapCompany(data);
    setCompanies((prev) => [...prev, company]);
    return company;
  };

  const updateCompany = async (id: string, d: Partial<Company>) => {
    await supabase.from("companies").update({
      ...(d.name !== undefined && { name: d.name, nome_fantasia: d.name }),
      ...(d.cnpj !== undefined && { cnpj: d.cnpj }),
      ...(d.city !== undefined && { city: d.city }),
      ...(d.razaoSocial !== undefined && { razao_social: d.razaoSocial }),
      ...(d.endereco !== undefined && { endereco: d.endereco }),
      ...(d.cnaePrincipal !== undefined && { cnae_principal: d.cnaePrincipal }),
      ...(d.telefone !== undefined && { telefone: d.telefone }),
      ...(d.email !== undefined && { email: d.email }),
      ...(d.logoUrl !== undefined && { logo_url: d.logoUrl }),
      ...(d.conclusaoAet !== undefined && { conclusao_aet: d.conclusaoAet }),
    }).eq("id", id);
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
    const duplicate = positions.find(
      (pos) => pos.sectorId === p.sectorId && pos.name.trim().toLowerCase() === p.name.trim().toLowerCase()
    );
    if (duplicate) throw new Error(`Já existe um cargo com o nome "${p.name}" neste setor.`);
    const { data, error } = await supabase.from("positions").insert({ sector_id: p.sectorId, company_id: p.companyId, name: p.name, descricao: p.descricao || null }).select().single();
    if (error || !data) { console.error("addPosition error:", error); throw new Error(error?.message || "Erro ao criar cargo"); }
    const pos = mapPosition(data);
    setPositions((prev) => [...prev, pos]);
    return pos;
  };

  const updatePosition = async (id: string, data: Partial<Omit<Position, "id">>) => {
    const update: any = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.descricao !== undefined) update.descricao = data.descricao;
    const { error } = await supabase.from("positions").update(update).eq("id", id);
    if (error) console.error("updatePosition error:", error);
    setPositions((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
  };

  const deletePosition = async (id: string) => {
    await supabase.from("positions").delete().eq("id", id);
    setPositions((prev) => prev.filter((p) => p.id !== id));
  };

  // ── Avaliadores ──
  const addAvaliador = async (a: Omit<Avaliador, "id">) => {
    const { data, error } = await supabase.from("avaliadores").insert({ user_id: user?.id, nome: a.nome, cpf: a.cpf, formacao: a.formacao, registro_profissional: a.registroProfissional }).select().single();
    if (error || !data) { console.error("addAvaliador error:", error); throw new Error(error?.message || "Erro ao criar avaliador"); }
    const av = mapAvaliador(data);
    setAvaliadores((prev) => [...prev, av]);
    return av;
  };

  const updateAvaliador = async (id: string, d: Partial<Avaliador>) => {
    const update: any = {};
    if (d.nome !== undefined) update.nome = d.nome;
    if (d.cpf !== undefined) update.cpf = d.cpf;
    if (d.formacao !== undefined) update.formacao = d.formacao;
    if (d.registroProfissional !== undefined) update.registro_profissional = d.registroProfissional;
    await supabase.from("avaliadores").update(update).eq("id", id);
    setAvaliadores((prev) => prev.map((a) => (a.id === id ? { ...a, ...d } : a)));
  };

  const deleteAvaliador = async (id: string) => {
    await supabase.from("avaliadores").delete().eq("id", id);
    setAvaliadores((prev) => prev.filter((a) => a.id !== id));
  };

  // ── Surveys ──
  const addSurvey = async (s: Omit<SurveyResponse, "id" | "createdAt">) => {
    const { data, error } = await supabase.from("surveys").insert({
      company_id: s.companyId, worker_name: s.workerName, sector: s.sector,
      position: s.position, height: s.height, ergonomic_risks: s.ergonomicRisks,
      pain_areas: s.painAreas, manual_load: s.manualLoad, signature: s.signature,
    }).select().single();
    if (error || !data) { console.error("addSurvey error:", error); throw new Error(error?.message || "Erro ao salvar questionário"); }
    setSurveys((prev) => [mapSurvey(data), ...prev]);
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
    const { data, error } = await supabase.from("assessments").insert({
      company_id: a.companyId, sector_id: a.sectorId, position_id: a.positionId,
      template_id: a.templateId, template_name: a.templateName, workstation: a.workstation,
      observed_worker: a.observedWorker, filled_blocks: a.filledBlocks, general_notes: a.generalNotes,
    }).select().single();
    if (error || !data) { console.error("addAssessment error:", error); throw new Error(error?.message || "Erro ao salvar avaliação"); }
    setAssessments((prev) => [mapAssessment(data), ...prev]);
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
    const { data, error } = await supabase.from("actions").insert({
      company_id: a.companyId, recommendation: a.recommendation, priority: a.priority,
      responsible: a.responsible, status: a.status, deadline: a.deadline,
    }).select().single();
    if (error || !data) { console.error("addAction error:", error); throw new Error(error?.message || "Erro ao salvar ação"); }
    setActions((prev) => [...prev, mapAction(data)]);
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

  // ── GSE ──
  const addGse = async (companyId: string): Promise<Gse> => {
    const companyGses = gses.filter((g) => g.companyId === companyId);
    const nextNumero = companyGses.length > 0 ? Math.max(...companyGses.map((g) => g.numero)) + 1 : 1;
    const { data, error } = await supabase.from("gse").insert({ company_id: companyId, numero: nextNumero, user_id: user?.id }).select().single();
    if (error || !data) throw new Error(error?.message || "Erro ao criar GSE");
    const gse = buildGse(data, [], [], []);
    setGses((prev) => [...prev, gse]);
    return gse;
  };

  const updateGse = async (id: string, d: { conclusao?: string; excludedActionIds?: string[] }) => {
    const update: any = {};
    if (d.conclusao !== undefined) update.conclusao = d.conclusao;
    if (d.excludedActionIds !== undefined) update.excluded_action_ids = d.excludedActionIds;
    const { error } = await supabase.from("gse").update(update).eq("id", id);
    if (error) console.error("updateGse error:", error);
    setGses((prev) => prev.map((g) => (g.id === id ? { ...g, ...d } : g)));
  };

  const deleteGse = async (id: string) => {
    await supabase.from("gse").delete().eq("id", id);
    // Re-numerar os restantes da mesma empresa
    const gse = gses.find((g) => g.id === id);
    if (gse) {
      const remaining = gses.filter((g) => g.companyId === gse.companyId && g.id !== id).sort((a, b) => a.numero - b.numero);
      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].numero !== i + 1) {
          await supabase.from("gse").update({ numero: i + 1 }).eq("id", remaining[i].id);
        }
      }
      setGses((prev) => {
        const rest = prev.filter((g) => g.companyId === gse.companyId && g.id !== id).sort((a, b) => a.numero - b.numero);
        const renumbered = rest.map((g, i) => ({ ...g, numero: i + 1 }));
        return [...prev.filter((g) => g.companyId !== gse.companyId), ...renumbered];
      });
    }
  };

  const addGsePosition = async (gseId: string, positionId: string) => {
    const { error } = await supabase.from("gse_positions").insert({ gse_id: gseId, position_id: positionId });
    if (error) throw new Error(error.message);
    setGses((prev) => prev.map((g) => g.id === gseId ? { ...g, positionIds: [...g.positionIds, positionId] } : g));
  };

  const removeGsePosition = async (gseId: string, positionId: string) => {
    await supabase.from("gse_positions").delete().eq("gse_id", gseId).eq("position_id", positionId);
    setGses((prev) => prev.map((g) => g.id === gseId ? { ...g, positionIds: g.positionIds.filter((p) => p !== positionId) } : g));
  };

  const addGseRisk = async (gseId: string, risco: string) => {
    const { error } = await supabase.from("gse_risks").insert({ gse_id: gseId, risco });
    if (error) throw new Error(error.message);
    setGses((prev) => prev.map((g) => g.id === gseId ? { ...g, risks: [...g.risks, risco] } : g));
  };

  const removeGseRisk = async (gseId: string, risco: string) => {
    await supabase.from("gse_risks").delete().eq("gse_id", gseId).eq("risco", risco);
    setGses((prev) => prev.map((g) => g.id === gseId ? { ...g, risks: g.risks.filter((r) => r !== risco) } : g));
  };

  const addGseAssessment = async (gseId: string, assessmentId: string) => {
    const { error } = await supabase.from("gse_assessments").insert({ gse_id: gseId, assessment_id: assessmentId });
    if (error) throw new Error(error.message);
    setGses((prev) => prev.map((g) => g.id === gseId ? { ...g, assessmentIds: [...g.assessmentIds, assessmentId] } : g));
  };

  const removeGseAssessment = async (gseId: string, assessmentId: string) => {
    await supabase.from("gse_assessments").delete().eq("gse_id", gseId).eq("assessment_id", assessmentId);
    setGses((prev) => prev.map((g) => g.id === gseId ? { ...g, assessmentIds: g.assessmentIds.filter((a) => a !== assessmentId) } : g));
  };

  // ── Action Checklist (Plano Geral) ──
  const addActionChecklistItem = async (companyId: string, item: string) => {
    const maxOrdem = actionChecklist.filter((a) => a.companyId === companyId).reduce((m, a) => Math.max(m, a.ordem), 0);
    const { data, error } = await supabase.from("action_checklist_items").insert({ company_id: companyId, item, ordem: maxOrdem + 1, user_id: user?.id }).select().single();
    if (error || !data) throw new Error(error?.message || "Erro ao criar item");
    setActionChecklist((prev) => [...prev, mapActionChecklist(data)]);
  };

  const updateActionChecklistItem = async (id: string, d: Partial<Pick<ActionChecklistItem, "resposta" | "item">>) => {
    const update: any = {};
    if (d.resposta !== undefined) update.resposta = d.resposta;
    if (d.item !== undefined) update.item = d.item;
    await supabase.from("action_checklist_items").update(update).eq("id", id);
    setActionChecklist((prev) => prev.map((a) => (a.id === id ? { ...a, ...d } : a)));
  };

  const deleteActionChecklistItem = async (id: string) => {
    await supabase.from("action_checklist_items").delete().eq("id", id);
    setActionChecklist((prev) => prev.filter((a) => a.id !== id));
  };

  // ── Action Plan Questions ──
  const addActionPlanQuestion = async (q: Omit<ActionPlanQuestion, "id">): Promise<ActionPlanQuestion> => {
    const maxOrdem = actionPlanQuestions.reduce((m, a) => Math.max(m, a.ordem), 0);
    const { data, error } = await supabase.from("action_plan_questions").insert({ question: q.question, priority: q.priority, ordem: maxOrdem + 1, user_id: user?.id }).select().single();
    if (error || !data) throw new Error(error?.message || "Erro ao criar pergunta");
    const item = mapActionPlanQuestion(data);
    setActionPlanQuestions((prev) => [...prev, item]);
    return item;
  };

  const updateActionPlanQuestion = async (id: string, d: Partial<ActionPlanQuestion>) => {
    const update: any = {};
    if (d.question !== undefined) update.question = d.question;
    if (d.priority !== undefined) update.priority = d.priority;
    if (d.ordem !== undefined) update.ordem = d.ordem;
    await supabase.from("action_plan_questions").update(update).eq("id", id);
    setActionPlanQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...d } : q)));
  };

  const deleteActionPlanQuestion = async (id: string) => {
    await supabase.from("action_plan_questions").delete().eq("id", id);
    setActionPlanQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  // ── Document Templates ──
  const saveDocumentTemplate = async (type: DocumentTemplate["type"], content: string) => {
    const existing = documentTemplates.find((t) => t.type === type);
    if (existing) {
      await supabase.from("document_templates").update({ content }).eq("id", existing.id);
      setDocumentTemplates((prev) => prev.map((t) => (t.id === existing.id ? { ...t, content } : t)));
    } else {
      const { data, error } = await supabase.from("document_templates").insert({ type, content, user_id: user?.id }).select().single();
      if (error || !data) throw new Error(error?.message || "Erro ao salvar modelo");
      setDocumentTemplates((prev) => [...prev, mapDocumentTemplate(data)]);
    }
  };

  // ── AETs ──
  const addAet = async (companyId: string): Promise<Aet> => {
    const { data, error } = await supabase.from("aets").insert({ company_id: companyId, current_step: 1, conclusao_geral: '', user_id: user?.id }).select().single();
    if (error || !data) throw new Error(error?.message || "Erro ao criar AET");
    const aet = mapAet(data);
    setAets((prev) => [aet, ...prev]);
    return aet;
  };

  const updateAet = async (id: string, d: Partial<Pick<Aet, "currentStep" | "conclusaoGeral" | "completedAt">>) => {
    const update: any = {};
    if (d.currentStep !== undefined) update.current_step = d.currentStep;
    if (d.conclusaoGeral !== undefined) update.conclusao_geral = d.conclusaoGeral;
    if (d.completedAt !== undefined) update.completed_at = d.completedAt;
    await supabase.from("aets").update(update).eq("id", id);
    setAets((prev) => prev.map((a) => (a.id === id ? { ...a, ...d } : a)));
  };

  const deleteAet = async (id: string) => {
    await supabase.from("aets").delete().eq("id", id);
    setAets((prev) => prev.filter((a) => a.id !== id));
  };

  const refreshData = loadData;

  return (
    <DataContext.Provider
      value={{
        user, companies, sectors, positions, surveys, assessments, actions, blocks, templates, anthroRanges, avaliadores, loading,
        login, register, logout,
        getFullAssessment, getFullAssessmentsForCompany, getFullSurvey, getFullSurveysForCompany,
        addCompany, updateCompany, deleteCompany, addSector, deleteSector, addPosition, updatePosition, deletePosition,
        addAvaliador, updateAvaliador, deleteAvaliador,
        addSurvey, updateSurvey, deleteSurvey, addAssessment, updateAssessment, deleteAssessment, addAction, updateAction, deleteAction,
        addBlock, updateBlock, deleteBlock, addTemplate, updateTemplate, deleteTemplate,
        addAnthroRange, updateAnthroRange, deleteAnthroRange,
        gses, addGse, updateGse, deleteGse, addGsePosition, removeGsePosition, addGseRisk, removeGseRisk, addGseAssessment, removeGseAssessment,
        actionChecklist, addActionChecklistItem, updateActionChecklistItem, deleteActionChecklistItem,
        actionPlanQuestions, addActionPlanQuestion, updateActionPlanQuestion, deleteActionPlanQuestion,
        documentTemplates, saveDocumentTemplate,
        aets, addAet, updateAet, deleteAet,
        refreshData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
