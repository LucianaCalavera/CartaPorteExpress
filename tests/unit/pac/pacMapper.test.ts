import { describe, expect, it } from "vitest";
import { validateBatch } from "@/lib/validators/validationEngine";
import { groupByFolio } from "@/lib/validators/excelRowToCpeSchema";
import { buildFacturacomCfdiPayload, buildFacturacomClientPayload } from "@/lib/pac/pacMapper";
import type { EmisorProfile } from "@/types/cpe";
import type { CfdiCartaPorteIngreso } from "@/lib/validators/cartaPorte31Schemas";
import { testCatalogs } from "../../fixtures/catalogos";
import { makeRow, withRowNumbers, NOW, VALID_ROW } from "../../fixtures/excelRows";

const profile: EmisorProfile = {
  rfcEmisor: "MOR190101AB1",
  regimenFiscalId: "601",
  cpEmisor: "44100",
};

/** CFDI validado real (mismo camino que produce `validationEngine` en producción). */
function validCfdi(overrides: Partial<typeof VALID_ROW> = {}): CfdiCartaPorteIngreso {
  const groups = groupByFolio(withRowNumbers([makeRow(overrides)]));
  const res = validateBatch(groups, { profile, catalogs: testCatalogs, now: NOW });
  if (res.valid.length === 0) {
    throw new Error(`Fixture inválido para el test: ${JSON.stringify(res.invalid[0]?.issues)}`);
  }
  return res.valid[0].data;
}

describe("buildFacturacomCfdiPayload", () => {
  it("mapea los campos raíz del comprobante", () => {
    const payload = buildFacturacomCfdiPayload(validCfdi(), {
      receptorUid: "uid-123",
      emisorProfile: profile,
      catalogs: testCatalogs,
    });

    expect(payload.Receptor).toEqual({ UID: "uid-123" });
    expect(payload.TipoDocumento).toBe("carta_porte_ingreso");
    expect(payload.UsoCFDI).toBe("G03");
    expect(payload.FormaPago).toBe("03");
    expect(payload.MetodoPago).toBe("PUE");
    expect(payload.Moneda).toBe("MXN");
    expect(payload.RegimenFiscal).toBe("601");
    expect(payload.LugarExpedicion).toBe("44100");
  });

  it("resuelve la descripción de Unidad desde el catálogo y calcula IVA 16%", () => {
    const payload = buildFacturacomCfdiPayload(validCfdi(), {
      receptorUid: "uid-123",
      emisorProfile: profile,
      catalogs: testCatalogs,
    });
    const concepto = payload.Conceptos[0];

    expect(concepto.ClaveUnidad).toBe("E48");
    expect(concepto.Unidad).toBe("Unidad de servicio");
    expect(concepto.ValorUnitario).toBe(8500);
    expect(concepto.ObjetoImp).toBe("02");
    expect(concepto.Impuestos?.Traslados).toEqual([
      { Base: 8500, Impuesto: "002", TipoFactor: "Tasa", TasaOCuota: "0.160000", Importe: 1360 },
    ]);
  });

  it("anida Autotransporte dentro de Mercancias (como el XSD del SAT, no como sibling de CartaPorte)", () => {
    const payload = buildFacturacomCfdiPayload(validCfdi(), {
      receptorUid: "uid-123",
      emisorProfile: profile,
      catalogs: testCatalogs,
    });

    expect(payload.CartaPorte.Mercancias.Autotransporte.PermSCT).toBe("TPAF01");
    expect(payload.CartaPorte.Mercancias.Autotransporte.IdentificacionVehicular.PlacaVM).toBe(
      "AB123CD",
    );
    expect(
      (payload.CartaPorte as unknown as Record<string, unknown>).Autotransporte,
    ).toBeUndefined();
  });

  it("envuelve Ubicaciones/Mercancia/Figuras en sus arrays y genera IDUbicacion determinístico", () => {
    const payload = buildFacturacomCfdiPayload(validCfdi(), {
      receptorUid: "uid-123",
      emisorProfile: profile,
      catalogs: testCatalogs,
    });

    const ubicaciones = payload.CartaPorte.Ubicaciones.Ubicacion;
    expect(ubicaciones).toHaveLength(2);
    expect(ubicaciones.find((u) => u.TipoUbicacion === "Origen")?.IDUbicacion).toBe("OR000001");
    expect(ubicaciones.find((u) => u.TipoUbicacion === "Destino")?.IDUbicacion).toBe("DE000001");

    expect(payload.CartaPorte.Mercancias.Mercancia).toHaveLength(1);
    expect(payload.CartaPorte.Mercancias.Mercancia[0].BienesTransp).toBe("11121600");

    expect(payload.CartaPorte.FiguraTransporte.TiposFigura).toHaveLength(1);
    expect(payload.CartaPorte.FiguraTransporte.TiposFigura[0].TipoFigura).toBe("01");
  });

  it("no manda Impuestos cuando ObjetoImp no es 02", () => {
    const cfdi = validCfdi();
    const noObjetoImp: CfdiCartaPorteIngreso = {
      ...cfdi,
      comprobante: {
        ...cfdi.comprobante,
        concepto: { ...cfdi.comprobante.concepto, objetoImp: "01" },
      },
    };
    const payload = buildFacturacomCfdiPayload(noObjetoImp, {
      receptorUid: "uid-123",
      emisorProfile: profile,
      catalogs: testCatalogs,
    });

    expect(payload.Conceptos[0].Impuestos).toBeUndefined();
  });
});

describe("buildFacturacomClientPayload", () => {
  it("mapea el receptor (incluyendo su email) a payload de cliente", () => {
    const cfdi = validCfdi();
    const payload = buildFacturacomClientPayload(cfdi.comprobante.receptor);

    expect(payload).toEqual({
      rfc: "MOR190101AB1",
      razons: "Cliente Demo SA de CV",
      codpos: "64000",
      email: "cliente@demo.mx",
      regimen: "601",
      pais: "MEX",
      usocfdi: "G03",
    });
  });
});
