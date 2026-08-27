-- Sprint 0: RLS obligatorio en TODAS las tablas (Regla de Oro #1)
alter table public.profiles enable row level security;
alter table public.procesos enable row level security;
alter table public.filas_proceso enable row level security;
alter table public.leads enable row level security;

create policy "User manages own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "User owns procesos"
  on public.procesos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "User owns filas via proceso"
  on public.filas_proceso for all
  using (
    exists (
      select 1 from public.procesos p
      where p.id = filas_proceso.proceso_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.procesos p
      where p.id = filas_proceso.proceso_id and p.user_id = auth.uid()
    )
  );

-- Leads: cualquiera puede insertar (form público de landing), nadie puede leer/editar via anon/authenticated
create policy "Anyone can submit a lead"
  on public.leads for insert
  with check (true);
