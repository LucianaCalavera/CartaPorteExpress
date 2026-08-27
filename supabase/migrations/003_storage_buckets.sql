-- Sprint 0: Storage Buckets + Políticas (carpeta por usuario: user_id/...)
insert into storage.buckets (id, name, public)
values
  ('cfdi-xml', 'cfdi-xml', false),
  ('cfdi-pdf', 'cfdi-pdf', false),
  ('plantillas', 'plantillas', true)
on conflict (id) do nothing;

create policy "User reads own xml"
  on storage.objects for select
  using (bucket_id = 'cfdi-xml' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "User writes own xml"
  on storage.objects for insert
  with check (bucket_id = 'cfdi-xml' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "User reads own pdf"
  on storage.objects for select
  using (bucket_id = 'cfdi-pdf' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "User writes own pdf"
  on storage.objects for insert
  with check (bucket_id = 'cfdi-pdf' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Public reads plantillas"
  on storage.objects for select
  using (bucket_id = 'plantillas');
