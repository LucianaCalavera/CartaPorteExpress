-- Sprint 0: Wrappers RPC para Supabase Vault.
-- PostgREST no expone el schema `vault` directamente, así que se necesitan
-- funciones SECURITY DEFINER en `public`, invocables solo por `service_role`,
-- para que `lib/supabase/vault.ts` pueda crear/leer secretos (Regla de Oro #11).

create or replace function public.vault_create_secret(secret text, secret_name text)
returns uuid
language plpgsql
security definer
set search_path = vault, public
as $$
declare
  new_id uuid;
begin
  new_id := vault.create_secret(secret, secret_name);
  return new_id;
end;
$$;

create or replace function public.vault_read_secret(secret_id uuid)
returns text
language plpgsql
security definer
set search_path = vault, public
as $$
declare
  decrypted text;
begin
  select decrypted_secret into decrypted
  from vault.decrypted_secrets
  where id = secret_id;
  return decrypted;
end;
$$;

revoke execute on function public.vault_create_secret(text, text) from public, anon, authenticated;
revoke execute on function public.vault_read_secret(uuid) from public, anon, authenticated;
grant execute on function public.vault_create_secret(text, text) to service_role;
grant execute on function public.vault_read_secret(uuid) to service_role;
