-- Sprint 1: soporte de upsert versionado para `sat_catalogos`.
-- El script `scripts/sync-catalogs-sat.ts` inserta un snapshot por `version`
-- (fecha de publicación del catálogo SAT) y necesita:
--   1. Una clave única para `on conflict` al re-correr el sync.
--   2. Un lugar para atributos por fila que no encajan en columnas fijas
--      (p. ej. flag `material_peligroso` de c_ClaveProdServCP, aplicabilidad
--      física/moral de regímenes y usos de CFDI).

alter table public.sat_catalogos
  add column if not exists attributes jsonb not null default '{}'::jsonb;

-- Un mismo code puede repetirse entre versiones (histórico), pero es único
-- dentro de (tipo, versión).
create unique index if not exists idx_sat_catalogos_type_version_code
  on public.sat_catalogos (catalogo_type, version, code);
