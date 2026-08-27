-- Sprint 0: Catálogos SAT (versionados, búsqueda con pg_trgm/tsvector)
-- Poblados por scripts/sync-catalogs-sat.ts (Sprint 1)
create table public.sat_catalogos (
    id bigserial primary key,
    catalogo_type text not null, -- 'cp'|'clave_prod_serv'|'unidad'|'aduanas'|'monedas'|'regimen_fiscal'
    version text not null, -- '2024-01-15'
    code text not null,
    description text not null,
    parent_code text,
    valid_from date not null,
    valid_to date, -- NULL = vigente
    search_vector tsvector generated always as (to_tsvector('spanish', code || ' ' || description)) stored
);
create index idx_sat_catalogos_type_version on public.sat_catalogos (catalogo_type, version);
create index idx_sat_catalogos_search on public.sat_catalogos using gin (search_vector);

-- Lectura pública (autocompletados UI vía anon key), escritura solo Service Role (script de sync)
alter table public.sat_catalogos enable row level security;

create policy "Public read sat_catalogos"
  on public.sat_catalogos for select
  using (true);
