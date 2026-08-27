/**
 * Implementación en memoria de `FacturacomClient`, fiel a los shapes
 * verificados en `facturacomTypes.ts` — para desarrollar/testear `timbrar`
 * (Sprint 3) sin credenciales reales de Factura.com. No hace red.
 *
 * Gatillos deterministas para simular casos de error documentados:
 * - RFC de receptor `"ERRCLI010101AAA"` -> `findOrCreateClient` falla.
 * - `Receptor.UID` que empieza con `"mock-client-errstamp"` -> `stampCfdi` falla
 *   (útil junto con el RFC anterior, o pasando ese UID directo en un test).
 */
import { randomUUID } from "node:crypto";
import { PacError } from "@/lib/utils/errors";
import type { FacturacomClient } from "@/lib/pac/facturacomClient";
import type {
  FacturacomClientPayload,
  FacturacomCreateCfdiPayload,
  FacturacomCreateCfdiSuccess,
} from "@/lib/pac/facturacomTypes";

export const MOCK_RFC_CLIENTE_INVALIDO = "ERRCLI010101AAA";
const STAMP_ERROR_UID_PREFIX = "mock-client-errstamp";

function clientUidFor(rfc: string): string {
  return `mock-client-${rfc.toLowerCase()}`;
}

export function createMockFacturacomClient(): FacturacomClient {
  const clientsByRfc = new Map<string, string>();

  return {
    async findOrCreateClient(payload: FacturacomClientPayload): Promise<string> {
      if (payload.rfc.toUpperCase() === MOCK_RFC_CLIENTE_INVALIDO) {
        throw new PacError(`No se pudo registrar al cliente ${payload.rfc} en Factura.com (mock)`, {
          raw: { status: "error", message: "RFC rechazado por el SAT (simulado)" },
        });
      }
      const existing = clientsByRfc.get(payload.rfc);
      if (existing) return existing;
      const uid = clientUidFor(payload.rfc);
      clientsByRfc.set(payload.rfc, uid);
      return uid;
    },

    async stampCfdi(payload: FacturacomCreateCfdiPayload): Promise<FacturacomCreateCfdiSuccess> {
      if (payload.Receptor.UID.startsWith(STAMP_ERROR_UID_PREFIX)) {
        throw new PacError("CFDI40009: El comprobante no pudo ser validado por el SAT (mock)", {
          pacCode: "CFDI40009",
          raw: {
            response: "error",
            message: { message: "CFDI40009: Datos inconsistentes", status: "error" },
          },
        });
      }

      const uuid = randomUUID();
      const uid = `mock-cfdi-${uuid.slice(0, 8)}`;
      return {
        response: "success",
        message: "Factura creada y enviada satisfactoriamente (mock)",
        UUID: uuid,
        uid,
        invoice_uid: uid,
        SAT: {
          UUID: uuid,
          FechaTimbrado: new Date().toISOString(),
          NoCertificadoSAT: "00001000000500003416",
          Version: "4.0",
          SelloSAT: "mock-sello-sat",
          SelloCFD: "mock-sello-cfd",
        },
      };
    },

    async downloadXml(cfdiUid: string): Promise<Buffer> {
      return Buffer.from(
        `<?xml version="1.0" encoding="UTF-8"?><MockCFDI uid="${cfdiUid}"/>`,
        "utf-8",
      );
    },

    async downloadPdf(cfdiUid: string): Promise<Buffer> {
      return Buffer.from(`%PDF-1.4\n% Mock PDF para ${cfdiUid}\n`, "utf-8");
    },
  };
}
