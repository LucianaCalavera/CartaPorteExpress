import { describe, expect, it } from "vitest";
import {
  createMockFacturacomClient,
  MOCK_RFC_CLIENTE_INVALIDO,
} from "@/lib/pac/facturacomClient.mock";
import { PacError } from "@/lib/utils/errors";
import type {
  FacturacomClientPayload,
  FacturacomCreateCfdiPayload,
} from "@/lib/pac/facturacomTypes";

const clientPayload: FacturacomClientPayload = {
  rfc: "MOR190101AB1",
  razons: "Cliente Demo SA de CV",
  codpos: "64000",
  email: "cliente@demo.mx",
  regimen: "601",
  pais: "MEX",
};

function minimalCfdiPayload(receptorUid: string): FacturacomCreateCfdiPayload {
  return {
    Receptor: { UID: receptorUid },
    TipoDocumento: "carta_porte_ingreso",
    Conceptos: [],
    UsoCFDI: "G03",
    FormaPago: "03",
    MetodoPago: "PUE",
    Moneda: "MXN",
    CartaPorte: {
      Version: "3.1",
      TranspInternac: "No",
      TotalDistRec: 820,
      Ubicaciones: { Ubicacion: [] },
      Mercancias: {
        PesoBrutoTotal: 0,
        UnidadPeso: "KGM",
        NumTotalMercancias: 0,
        Mercancia: [],
        Autotransporte: {
          PermSCT: "TPAF01",
          NumPermisoSCT: "01",
          IdentificacionVehicular: {
            ConfigVehicular: "C2",
            PlacaVM: "AB123CD",
            AnioModeloVM: 2019,
          },
          Seguros: { AseguraRespCivil: "Qualitas", PolizaRespCivil: "POL-1" },
        },
      },
      FiguraTransporte: { TiposFigura: [] },
    },
  };
}

describe("createMockFacturacomClient", () => {
  it("findOrCreateClient devuelve un UID estable para el mismo RFC", async () => {
    const client = createMockFacturacomClient();
    const uid1 = await client.findOrCreateClient(clientPayload);
    const uid2 = await client.findOrCreateClient(clientPayload);
    expect(uid1).toBe(uid2);
  });

  it("findOrCreateClient lanza PacError para el RFC gatillo de error", async () => {
    const client = createMockFacturacomClient();
    await expect(
      client.findOrCreateClient({ ...clientPayload, rfc: MOCK_RFC_CLIENTE_INVALIDO }),
    ).rejects.toThrow(PacError);
  });

  it("stampCfdi devuelve una respuesta con la forma documentada de Factura.com", async () => {
    const client = createMockFacturacomClient();
    const uid = await client.findOrCreateClient(clientPayload);
    const result = await client.stampCfdi(minimalCfdiPayload(uid));

    expect(result.response).toBe("success");
    expect(result.UUID).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.SAT.Version).toBe("4.0");
  });

  it("stampCfdi lanza PacError para el UID gatillo de error", async () => {
    const client = createMockFacturacomClient();
    await expect(client.stampCfdi(minimalCfdiPayload("mock-client-errstamp"))).rejects.toThrow(
      PacError,
    );
  });

  it("downloadXml/downloadPdf devuelven Buffers no vacíos", async () => {
    const client = createMockFacturacomClient();
    const xml = await client.downloadXml("mock-cfdi-abc123");
    const pdf = await client.downloadPdf("mock-cfdi-abc123");
    expect(xml.length).toBeGreaterThan(0);
    expect(pdf.length).toBeGreaterThan(0);
  });
});
