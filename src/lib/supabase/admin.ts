import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Cliente Supabase con `service_role`. Bypasa RLS por completo.
 *
 * Regla de Oro #1: SOLO usar dentro de Server Actions o Route Handlers de webhooks
 * (nunca en Client Components, nunca exponer el resultado crudo al cliente).
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
