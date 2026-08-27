-- Sprint 0: Hardening según Supabase database linter (`supabase db advisors`).
-- Corrige 3 hallazgos (0 errores, todos WARN) detectados tras aplicar 001-005:
--   1. auth_rls_initplan  (PERF) - auth.uid() se re-evalúa por fila en 3 políticas.
--   2. function_search_path_mutable (SEC) - public.set_updated_at sin search_path fijo.
--   3. extension_in_public (SEC) - pg_trgm instalada en el schema public.

-- 1. RLS: envolver auth.uid() en (select ...) para que el planner lo evalúe una sola vez.
--    Se recrean las mismas políticas de 002/004 sin cambiar su semántica.
drop policy if exists "User manages own profile" on public.profiles;
create policy "User manages own profile"
  on public.profiles for all
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "User owns procesos" on public.procesos;
create policy "User owns procesos"
  on public.procesos for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "User owns filas via proceso" on public.filas_proceso;
create policy "User owns filas via proceso"
  on public.filas_proceso for all
  using (
    exists (
      select 1 from public.procesos p
      where p.id = filas_proceso.proceso_id and p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.procesos p
      where p.id = filas_proceso.proceso_id and p.user_id = (select auth.uid())
    )
  );

-- 2. Fijar search_path del trigger de updated_at (solo usa now() y NEW -> search_path vacío basta).
alter function public.set_updated_at() set search_path = '';

-- 3. Mover pg_trgm fuera de public (schema `extensions` ya existe en Supabase).
--    Sin objetos dependientes todavía (la búsqueda trigram se usa en Sprint 1).
alter extension pg_trgm set schema extensions;
