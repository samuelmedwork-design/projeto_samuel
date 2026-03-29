-- ============================================================
-- ErgoAnálise - Setup Supabase
-- Cole este SQL no Supabase: Dashboard > SQL Editor > New Query
-- ============================================================

-- Perfis de usuário (vinculado ao Supabase Auth)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text default 'consultor',
  created_at timestamptz default now()
);

-- Trigger para criar perfil automaticamente no signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Empresas
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  name text not null,
  cnpj text not null,
  city text not null,
  created_at timestamptz default now()
);

-- Setores
create table if not exists sectors (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies on delete cascade,
  name text not null
);

-- Cargos
create table if not exists positions (
  id uuid primary key default gen_random_uuid(),
  sector_id uuid references sectors on delete cascade,
  company_id uuid references companies on delete cascade,
  name text not null
);

-- Questionários dos trabalhadores
create table if not exists surveys (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies on delete cascade,
  worker_name text,
  sector text,
  position text,
  height numeric,
  ergonomic_risks jsonb default '[]',
  pain_areas jsonb default '[]',
  manual_load jsonb default '{}',
  signature text,
  created_at timestamptz default now()
);

-- Avaliações (checklists preenchidos)
create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies on delete cascade,
  sector_id uuid,
  position_id uuid,
  template_id text,
  template_name text,
  workstation text,
  observed_worker text,
  filled_blocks jsonb default '[]',
  general_notes text,
  created_at timestamptz default now()
);

-- Plano de ação
create table if not exists actions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies on delete cascade,
  recommendation text,
  priority text,
  responsible text,
  status text default 'pendente',
  deadline text
);

-- Blocos de checklist
create table if not exists blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  name text not null,
  image text,
  questions jsonb default '[]'
);

-- Templates de checklist
create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  name text not null,
  block_ids jsonb default '[]'
);

-- Faixas antropométricas
create table if not exists anthro_ranges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  name text,
  min_height numeric,
  max_height numeric,
  image text
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

alter table profiles enable row level security;
alter table companies enable row level security;
alter table sectors enable row level security;
alter table positions enable row level security;
alter table surveys enable row level security;
alter table assessments enable row level security;
alter table actions enable row level security;
alter table blocks enable row level security;
alter table templates enable row level security;
alter table anthro_ranges enable row level security;

-- Perfis: usuário vê apenas o seu
create policy "Users read own profile" on profiles for select using (auth.uid() = id);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);

-- Empresas: usuário vê apenas as suas
create policy "Users manage own companies" on companies for all using (auth.uid() = user_id);
create policy "Users insert companies" on companies for insert with check (auth.uid() = user_id);

-- Setores: acesso via empresa do usuário
create policy "Users manage sectors" on sectors for all
  using (company_id in (select id from companies where user_id = auth.uid()));
create policy "Users insert sectors" on sectors for insert
  with check (company_id in (select id from companies where user_id = auth.uid()));

-- Cargos: acesso via empresa do usuário
create policy "Users manage positions" on positions for all
  using (company_id in (select id from companies where user_id = auth.uid()));
create policy "Users insert positions" on positions for insert
  with check (company_id in (select id from companies where user_id = auth.uid()));

-- Questionários: qualquer pessoa pode inserir (trabalhadores), usuário autenticado lê/edita/exclui
create policy "Anyone can insert surveys" on surveys for insert with check (true);
create policy "Users read surveys" on surveys for select
  using (company_id in (select id from companies where user_id = auth.uid()));
create policy "Users update surveys" on surveys for update
  using (company_id in (select id from companies where user_id = auth.uid()));
create policy "Users delete surveys" on surveys for delete
  using (company_id in (select id from companies where user_id = auth.uid()));

-- Avaliações: acesso via empresa do usuário
create policy "Users manage assessments" on assessments for all
  using (company_id in (select id from companies where user_id = auth.uid()));
create policy "Users insert assessments" on assessments for insert
  with check (company_id in (select id from companies where user_id = auth.uid()));

-- Ações: acesso via empresa do usuário
create policy "Users manage actions" on actions for all
  using (company_id in (select id from companies where user_id = auth.uid()));
create policy "Users insert actions" on actions for insert
  with check (company_id in (select id from companies where user_id = auth.uid()));

-- Blocos: usuário vê apenas os seus
create policy "Users manage own blocks" on blocks for all using (auth.uid() = user_id);
create policy "Users insert blocks" on blocks for insert with check (auth.uid() = user_id);

-- Templates: usuário vê apenas os seus
create policy "Users manage own templates" on templates for all using (auth.uid() = user_id);
create policy "Users insert templates" on templates for insert with check (auth.uid() = user_id);

-- Faixas antropométricas: usuário vê apenas as suas
create policy "Users manage own anthro" on anthro_ranges for all using (auth.uid() = user_id);
create policy "Users insert anthro" on anthro_ranges for insert with check (auth.uid() = user_id);

-- Colunas adicionais para questionários (sexo e peso)
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS sex text;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS weight numeric;

-- ============================================================
-- Função pública para o questionário (permite acesso anônimo)
-- ============================================================
create or replace function get_survey_data(company_uuid uuid)
returns jsonb as $$
  select jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'sectors', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'name', s.name,
          'positions', coalesce((
            select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name))
            from positions p where p.sector_id = s.id
          ), '[]'::jsonb)
        )
      )
      from sectors s where s.company_id = c.id
    ), '[]'::jsonb)
  )
  from companies c
  where c.id = company_uuid;
$$ language sql security definer;
