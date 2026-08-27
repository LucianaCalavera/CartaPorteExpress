-- Datos iniciales para desarrollo local (supabase db reset)
-- Catálogos SAT reales se cargan con `npm run catalogs:sync` (Sprint 1).
-- Este seed solo deja un par de catálogos mínimos para poder probar el motor de
-- validación y el autocompletado sin depender de la sincronización completa.
insert into public.sat_catalogos (catalogo_type, version, code, description, valid_from) values
  ('cp', 'seed-local', '64000', 'Monterrey Centro, Monterrey, Nuevo León', '2024-01-01'),
  ('cp', 'seed-local', '44100', 'Guadalajara Centro, Guadalajara, Jalisco', '2024-01-01'),
  ('clave_prod_serv', 'seed-local', '78101800', 'Servicio de transporte de carga', '2024-01-01'),
  ('unidad', 'seed-local', 'H87', 'Pieza', '2024-01-01'),
  ('unidad', 'seed-local', 'KGM', 'Kilogramo', '2024-01-01'),
  ('regimen_fiscal', 'seed-local', '601', 'General de Ley Personas Morales', '2024-01-01'),
  ('regimen_fiscal', 'seed-local', '621', 'Incorporación Fiscal', '2024-01-01')
on conflict do nothing;
