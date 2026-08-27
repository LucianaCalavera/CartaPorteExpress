/**
 * Cliente typed-fetch de Factura.com. Regla de Oro #1: nunca loguear el
 * payload completo (trae RFCs/domicilios) ni las credenciales — el caller
 * (Server Action) decide qué loguear de forma estructurada y sin secretos.
 *
 * `createFacturacomClient` implementa `FacturacomClient` contra la API real;
 * `createMockFacturacomClient` (`facturacomClient.mock.ts`) implementa la
 * misma interfaz para desarrollar/testear sin credenciales reales.
 */
import { PacError } from "@/lib/utils/errors";
import {
  isFacturacomSuccess,
  type FacturacomClientPayload,
  type FacturacomClientResponse,
  type FacturacomCreateCfdiPayload,
  type FacturacomCreateCfdiResponse,
  type FacturacomCreateCfdiSuccess,
  type FacturacomCredentials,
} from "@/lib/pac/facturacomTypes";

export interface FacturacomClient {
  /** Busca al receptor por RFC; si no existe, lo crea. Devuelve su `UID`. */
  findOrCreateClient(payload: FacturacomClientPayload): Promise<string>;
  /** Timbra un CFDI. Lanza `PacError` si el PAC responde error. */
  stampCfdi(payload: FacturacomCreateCfdiPayload): Promise<FacturacomCreateCfdiSuccess>;
  downloadXml(cfdiUid: string): Promise<Buffer>;
  downloadPdf(cfdiUid: string): Promise<Buffer>;
}

function authHeaders(creds: FacturacomCredentials): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "F-Api-Key": creds.apiKey,
    "F-Secret-Key": creds.secretKey,
    "F-PLUGIN": creds.plugin,
  };
}

function errorMessageOf(data: { message: { message: string } | string }): string {
  return typeof data.message === "string" ? data.message : data.message.message;
}

export function createFacturacomClient(creds: FacturacomCredentials): FacturacomClient {
  async function lookupClientUid(rfc: string): Promise<string | null> {
    const res = await fetch(`${creds.baseUrl}/v1/clients/${encodeURIComponent(rfc)}`, {
      headers: authHeaders(creds),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as FacturacomClientResponse;
    return data.status === "success" ? (data.Data?.UID ?? null) : null;
  }

  async function findOrCreateClient(payload: FacturacomClientPayload): Promise<string> {
    const existing = await lookupClientUid(payload.rfc);
    if (existing) return existing;

    const res = await fetch(`${creds.baseUrl}/v1/clients/create`, {
      method: "POST",
      headers: authHeaders(creds),
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as FacturacomClientResponse;
    if (!res.ok || data.status !== "success" || !data.Data?.UID) {
      throw new PacError(`No se pudo registrar al cliente ${payload.rfc} en Factura.com`, {
        raw: data,
      });
    }
    return data.Data.UID;
  }

  async function stampCfdi(
    payload: FacturacomCreateCfdiPayload,
  ): Promise<FacturacomCreateCfdiSuccess> {
    const res = await fetch(`${creds.baseUrl}/v4/cfdi40/create`, {
      method: "POST",
      headers: authHeaders(creds),
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as FacturacomCreateCfdiResponse;
    if (!isFacturacomSuccess(data)) {
      throw new PacError(errorMessageOf(data), { raw: data });
    }
    return data;
  }

  async function downloadFile(kind: "xml" | "pdf", cfdiUid: string): Promise<Buffer> {
    const res = await fetch(`${creds.baseUrl}/v4/cfdi40/${encodeURIComponent(cfdiUid)}/${kind}`, {
      headers: authHeaders(creds),
    });
    if (!res.ok) {
      throw new PacError(`No se pudo descargar el ${kind.toUpperCase()} del CFDI ${cfdiUid}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }

  return {
    findOrCreateClient,
    stampCfdi,
    downloadXml: (cfdiUid) => downloadFile("xml", cfdiUid),
    downloadPdf: (cfdiUid) => downloadFile("pdf", cfdiUid),
  };
}
