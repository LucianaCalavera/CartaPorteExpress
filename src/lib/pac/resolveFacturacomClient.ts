/**
 * Resuelve el `FacturacomClient` a usar para un emisor: real (credenciales de
 * Vault + `FACTURACOM_PLUGIN`) si están completas, o el mock si falta
 * cualquier pieza — típicamente porque todavía no existe la UI de
 * Configuración (Sprint 4) para que el usuario cargue sus llaves de Factura.com
 * a Vault (Regla de Oro #11). El caller decide qué hacer con `usingMock`
 * (p. ej. loguearlo, o avisar en la UI que el timbrado es simulado).
 */
import "server-only";
import { readSecret } from "@/lib/supabase/vault";
import { createFacturacomClient, type FacturacomClient } from "@/lib/pac/facturacomClient";
import { createMockFacturacomClient } from "@/lib/pac/facturacomClient.mock";

export interface FacturacomProfileCredentials {
  pac_api_key_secret_id: string | null;
  pac_api_secret_secret_id: string | null;
}

export interface ResolvedFacturacomClient {
  client: FacturacomClient;
  usingMock: boolean;
}

export async function resolveFacturacomClient(
  profile: FacturacomProfileCredentials,
): Promise<ResolvedFacturacomClient> {
  const mock = (): ResolvedFacturacomClient => ({
    client: createMockFacturacomClient(),
    usingMock: true,
  });

  if (!profile.pac_api_key_secret_id || !profile.pac_api_secret_secret_id) return mock();

  const plugin = process.env.FACTURACOM_PLUGIN;
  const baseUrl = process.env.FACTURACOM_BASE_URL;
  if (!plugin || !baseUrl) return mock();

  const [apiKey, secretKey] = await Promise.all([
    readSecret(profile.pac_api_key_secret_id),
    readSecret(profile.pac_api_secret_secret_id),
  ]);
  if (!apiKey || !secretKey) return mock();

  return {
    client: createFacturacomClient({ apiKey, secretKey, plugin, baseUrl }),
    usingMock: false,
  };
}
