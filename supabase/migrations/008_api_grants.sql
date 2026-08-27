-- Sprint 1: GRANTs explícitos para los roles de la Data API.
--
-- El default de Supabase Cloud ya NO auto-expone tablas nuevas del schema
-- `public` (ver supabase/config.toml > [api] > auto_expose_new_tables). Sin
-- estos GRANT, PostgREST / supabase-js reciben "permission denied" incluso con
-- la service_role key. La RLS (migraciones 002/004/006) sigue siendo la capa de
-- autorización real para anon/authenticated; service_role la bypassa.

-- Uso del schema.
grant usage on schema public to anon, authenticated, service_role;

-- profiles / procesos / filas_proceso: sólo el usuario dueño vía RLS.
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.procesos to authenticated;
grant select, insert, update, delete on public.filas_proceso to authenticated;
grant all on public.profiles to service_role;
grant all on public.procesos to service_role;
grant all on public.filas_proceso to service_role;

-- leads: el form público de la landing inserta como anon (RLS: insert-only).
grant insert on public.leads to anon, authenticated;
grant all on public.leads to service_role;

-- sat_catalogos: lectura pública (autocompletados UI), escritura sólo el script
-- de sync con service_role.
grant select on public.sat_catalogos to anon, authenticated;
grant all on public.sat_catalogos to service_role;
grant usage, select on sequence public.sat_catalogos_id_seq to service_role;

-- Wrappers de Vault: sólo service_role puede ejecutarlos (Regla de Oro #11).
grant execute on function public.vault_create_secret(text, text) to service_role;
grant execute on function public.vault_read_secret(uuid) to service_role;

-- Futuras tablas/secuencias creadas por el rol de migraciones quedan expuestas
-- de forma consistente (evita repetir GRANTs en cada migración).
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;
