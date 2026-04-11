-- ============================================================
-- MIGRAÇÃO GSE — ErgoAnálise
-- Execute este SQL no Supabase SQL Editor
-- ============================================================

-- Tabela principal do GSE
CREATE TABLE IF NOT EXISTS gse (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  numero        INT NOT NULL,
  conclusao     TEXT,
  user_id       UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, numero)
);

-- Cargos vinculados a um GSE (cada cargo em no máximo 1 GSE)
CREATE TABLE IF NOT EXISTS gse_positions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gse_id      UUID NOT NULL REFERENCES gse(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  UNIQUE(position_id)
);

-- Riscos ergonômicos selecionados por GSE
CREATE TABLE IF NOT EXISTS gse_risks (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gse_id  UUID NOT NULL REFERENCES gse(id) ON DELETE CASCADE,
  risco   TEXT NOT NULL,
  UNIQUE(gse_id, risco)
);

-- Avaliações vinculadas a um GSE
CREATE TABLE IF NOT EXISTS gse_assessments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gse_id        UUID NOT NULL REFERENCES gse(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  UNIQUE(gse_id, assessment_id)
);

-- RLS
ALTER TABLE gse ENABLE ROW LEVEL SECURITY;
ALTER TABLE gse_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gse_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE gse_assessments ENABLE ROW LEVEL SECURITY;

-- Políticas: usuário autenticado acessa apenas seus próprios dados
CREATE POLICY "gse_select" ON gse FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "gse_insert" ON gse FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gse_update" ON gse FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "gse_delete" ON gse FOR DELETE USING (auth.uid() = user_id);

-- gse_positions, gse_risks, gse_assessments: acesso via join com gse
CREATE POLICY "gse_positions_select" ON gse_positions FOR SELECT USING (
  EXISTS (SELECT 1 FROM gse WHERE gse.id = gse_id AND gse.user_id = auth.uid())
);
CREATE POLICY "gse_positions_insert" ON gse_positions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM gse WHERE gse.id = gse_id AND gse.user_id = auth.uid())
);
CREATE POLICY "gse_positions_delete" ON gse_positions FOR DELETE USING (
  EXISTS (SELECT 1 FROM gse WHERE gse.id = gse_id AND gse.user_id = auth.uid())
);

CREATE POLICY "gse_risks_select" ON gse_risks FOR SELECT USING (
  EXISTS (SELECT 1 FROM gse WHERE gse.id = gse_id AND gse.user_id = auth.uid())
);
CREATE POLICY "gse_risks_insert" ON gse_risks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM gse WHERE gse.id = gse_id AND gse.user_id = auth.uid())
);
CREATE POLICY "gse_risks_delete" ON gse_risks FOR DELETE USING (
  EXISTS (SELECT 1 FROM gse WHERE gse.id = gse_id AND gse.user_id = auth.uid())
);

CREATE POLICY "gse_assessments_select" ON gse_assessments FOR SELECT USING (
  EXISTS (SELECT 1 FROM gse WHERE gse.id = gse_id AND gse.user_id = auth.uid())
);
CREATE POLICY "gse_assessments_insert" ON gse_assessments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM gse WHERE gse.id = gse_id AND gse.user_id = auth.uid())
);
CREATE POLICY "gse_assessments_delete" ON gse_assessments FOR DELETE USING (
  EXISTS (SELECT 1 FROM gse WHERE gse.id = gse_id AND gse.user_id = auth.uid())
);

-- ============================================================
-- PLANO DE AÇÃO GERAL (checklist por empresa)
-- ============================================================

CREATE TABLE IF NOT EXISTS action_checklist_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item        TEXT NOT NULL,
  resposta    TEXT CHECK (resposta IN ('sim', 'nao', 'nao_se_aplica')) DEFAULT NULL,
  ordem       INT DEFAULT 0,
  user_id     UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE action_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "action_checklist_select" ON action_checklist_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "action_checklist_insert" ON action_checklist_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "action_checklist_update" ON action_checklist_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "action_checklist_delete" ON action_checklist_items FOR DELETE USING (auth.uid() = user_id);

-- Plano de ação específico por GSE (itens removíveis manualmente)
-- Reutiliza a tabela gse com campo json para itens excluídos
ALTER TABLE gse ADD COLUMN IF NOT EXISTS excluded_action_ids TEXT[] DEFAULT '{}';
