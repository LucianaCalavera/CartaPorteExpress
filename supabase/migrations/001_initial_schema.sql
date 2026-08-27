-- Sprint 0: Esquema inicial (perfiles, procesos, filas_proceso)
-- Extensiones requeridas por el proyecto (ver CLAUDE.md > Esquema de Base de Datos)
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";
create extension if not exists "pgcrypto";
create extension if not exists "supabase_vault";

-- 1. Perfiles (Extiende Auth) — V1: 1 RFC Emisor por Usuario (Regla de Oro #10)
create table public.profiles (
    id uuid primary key references auth.users on delete cascade,
    full_name text,
    company_name text, -- Razón Social
    rfc_emisor text unique not null, -- RFC Emisor Principal
    regimen_fiscal_id text, -- Clave SAT
    cp_emisor text, -- Código Postal Emisor
    pac_provider text default 'facturacom', -- 'facturacom' | 'sapien' | 'multifacturas'
    pac_api_key_secret_id uuid, -- Referencia a Supabase Vault, NO texto plano (Regla de Oro #11)
    pac_api_secret_secret_id uuid, -- Referencia a Supabase Vault
    whatsapp_business_account_id text,
    whatsapp_phone_number_id text,
    whatsapp_access_token_secret_id uuid, -- Referencia a Supabase Vault
    wa_template_cfdi_listo text default 'cfdi_listo',
    wa_template_error_validacion text default 'error_validacion',
    plan_status text default 'trial', -- 'trial' | 'active' | 'past_due' | 'cancelled'
    trial_ends_at timestamptz default (now() + interval '30 days'),
    privacy_notice_accepted_at timestamptz, -- Aviso de Privacidad (LFPDPPP)
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 2. Procesos de Carga (Batch)
create table public.procesos (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users on delete cascade,
    original_filename text,
    total_rows int default 0,
    valid_rows int default 0,
    error_rows int default 0,
    stamped_rows int default 0,
    failed_rows int default 0,
    status text default 'uploaded', -- 'uploaded'|'validating'|'validated'|'stamping'|'completed'|'failed'
    error_summary jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
create index idx_procesos_user_created on public.procesos (user_id, created_at desc);

-- 3. Filas Individuales (el grano fino)
create table public.filas_proceso (
    id uuid primary key default uuid_generate_v4(),
    proceso_id uuid not null references public.procesos on delete cascade,
    row_number int not null,
    raw_data jsonb not null,
    validated_data jsonb,
    validation_errors jsonb,
    status text default 'pending', -- 'pending'|'valid'|'invalid'|'stamping'|'stamped'|'failed'|'cancelled'
    idempotency_key uuid default uuid_generate_v4(), -- Previene doble-timbrado (Regla de Oro #3)
    uuid_timbre text,
    xml_url text,
    pdf_url text,
    sat_status text, -- 'vigente'|'cancelado'|'no_encontrado'
    last_pac_response jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
create unique index idx_filas_proceso_idempotency on public.filas_proceso (idempotency_key);
create index idx_filas_proceso_status on public.filas_proceso (proceso_id, status);

-- Leads capturados en Landing (lead magnet)
create table public.leads (
    id uuid primary key default uuid_generate_v4(),
    email text not null,
    source text default 'landing',
    created_at timestamptz default now()
);
create unique index idx_leads_email on public.leads (lower(email));

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.procesos
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.filas_proceso
  for each row execute function public.set_updated_at();
