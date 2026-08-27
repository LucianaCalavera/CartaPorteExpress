import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Único punto de acceso a Supabase Vault (Regla de Oro #11).
 * Nunca leer/escribir `pac_api_key`, `pac_api_secret` o `whatsapp_access_token`
 * en texto plano fuera de este módulo.
 */

export async function createSecret(secret: string, name: string): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("vault_create_secret", {
    secret,
    secret_name: name,
  });

  if (error) {
    throw new Error(`No se pudo crear el secreto en Vault: ${error.message}`);
  }

  return data as string;
}

export async function readSecret(secretId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("vault_read_secret", {
    secret_id: secretId,
  });

  if (error) {
    throw new Error(`No se pudo leer el secreto de Vault: ${error.message}`);
  }

  return data as string | null;
}
