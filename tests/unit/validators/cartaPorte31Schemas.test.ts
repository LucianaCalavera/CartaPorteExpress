import { describe, expect, it } from "vitest";
import {
  cartaPorte31Schema,
  mercanciaSchema,
  ubicacionSchema,
  comprobanteIngresoSchema,
  zodErrorToValidationIssues,
} from "@/lib/validators/cartaPorte31Schemas";

const validMercancia = {
  bienesTransp: "11121600",
  descripcion: "Tarimas de madera",
  cantidad: "20",
  claveUnidad: "H87",
  pesoEnKg: "1200",
};

const validUbicacionOrigen = {
  tipoUbicacion: "Origen",
  rfcRemitenteDestinatario: "MOR190101AB1",
  fechaHoraSalidaLlegada: "2026-08-26T08:00:00",
  domicilio: { estado: "JAL", pais: "MEX", codigoPostal: "44100" },
};

const validUbicacionDestino = {
  tipoUbicacion: "Destino",
  rfcRemitenteDestinatario: "XAXX010101000",
  fechaHoraSalidaLlegada: "2026-08-27T18:00:00",
  distanciaRecorrida: "820",
  domicilio: { estado: "NLE", pais: "MEX", codigoPostal: "64000" },
};

const validCartaPorte = {
  version: "3.1",
  transpInternac: "No",
  totalDistRec: "820",
  ubicaciones: [validUbicacionOrigen, validUbicacionDestino],
  mercancias: {
    pesoBrutoTotal: "1200",
    unidadPeso: "KGM",
    numTotalMercancias: "1",
    mercancia: [validMercancia],
  },
  autotransporte: {
    permSCT: "TPAF01",
    numPermisoSCT: "01/SCT/2024",
    identificacionVehicular: { placaVM: "AB123CD", anioModeloVM: "2019", configVehicular: "C2" },
    seguros: { aseguraRespCivil: "Qualitas", polizaRespCivil: "POL-9987" },
  },
  figuras: [{ tipoFigura: "01", rfcFigura: "PEGJ850101PL9", numLicencia: "LIC-778899" }],
};

/** Códigos de los issues tras `zodErrorToValidationIssues`. */
function codes(result: ReturnType<typeof mercanciaSchema.safeParse>): string[] {
  if (result.success) return [];
  return zodErrorToValidationIssues(result.error).map((i) => i.code);
}

describe("mercanciaSchema", () => {
  it("acepta una mercancía válida y normaliza números con separadores", () => {
    const r = mercanciaSchema.safeParse({ ...validMercancia, pesoEnKg: "1,250.50" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.pesoEnKg).toBe(1250.5);
  });

  it("rechaza peso en kg = 0", () => {
    expect(codes(mercanciaSchema.safeParse({ ...validMercancia, pesoEnKg: "0" }))).toContain(
      "out_of_range",
    );
  });

  it("rechaza cantidad negativa", () => {
    expect(codes(mercanciaSchema.safeParse({ ...validMercancia, cantidad: "-3" }))).toContain(
      "out_of_range",
    );
  });

  it("rechaza clave de producto/servicio que no tiene 8 dígitos", () => {
    expect(
      codes(mercanciaSchema.safeParse({ ...validMercancia, bienesTransp: "1112160" })),
    ).toContain("invalid_format");
  });

  it("rechaza clave de unidad con formato inválido", () => {
    expect(codes(mercanciaSchema.safeParse({ ...validMercancia, claveUnidad: "PIEZA" }))).toContain(
      "invalid_format",
    );
  });

  it('exige clave y embalaje cuando Material Peligroso = "Sí"', () => {
    const c = codes(mercanciaSchema.safeParse({ ...validMercancia, materialPeligroso: "Sí" }));
    expect(c.filter((x) => x === "material_peligroso_requerido")).toHaveLength(2);
  });

  it('marca inconsistencia si hay clave de material peligroso sin Material Peligroso = "Sí"', () => {
    expect(
      codes(mercanciaSchema.safeParse({ ...validMercancia, cveMaterialPeligroso: "1170" })),
    ).toContain("material_peligroso_no_aplica");
  });
});

describe("ubicacionSchema", () => {
  it("acepta RFC genérico XAXX010101000", () => {
    const r = ubicacionSchema.safeParse({
      ...validUbicacionOrigen,
      rfcRemitenteDestinatario: "XAXX010101000",
    });
    expect(r.success).toBe(true);
  });

  it("rechaza RFC con formato inválido", () => {
    const r = ubicacionSchema.safeParse({
      ...validUbicacionOrigen,
      rfcRemitenteDestinatario: "NO-ES-RFC",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza código postal que no tiene 5 dígitos", () => {
    const r = ubicacionSchema.safeParse({
      ...validUbicacionOrigen,
      domicilio: { ...validUbicacionOrigen.domicilio, codigoPostal: "4410" },
    });
    expect(r.success).toBe(false);
  });

  it("exige distancia recorrida en el Destino", () => {
    const { distanciaRecorrida, ...sinDistancia } = validUbicacionDestino;
    void distanciaRecorrida;
    const r = ubicacionSchema.safeParse(sinDistancia);
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        zodErrorToValidationIssues(r.error).some((i) => i.field === "distanciaRecorrida"),
      ).toBe(true);
    }
  });

  it("rechaza fecha con formato inválido", () => {
    const r = ubicacionSchema.safeParse({
      ...validUbicacionOrigen,
      fechaHoraSalidaLlegada: "26/08/2026 08:00",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza una fecha que no existe en el calendario", () => {
    const r = ubicacionSchema.safeParse({
      ...validUbicacionOrigen,
      fechaHoraSalidaLlegada: "2026-02-30T08:00:00",
    });
    expect(r.success).toBe(false);
  });
});

describe("autotransporte / placa / permiso", () => {
  it("normaliza placa con guiones y espacios", () => {
    const r = cartaPorte31Schema.safeParse({
      ...validCartaPorte,
      autotransporte: {
        ...validCartaPorte.autotransporte,
        identificacionVehicular: {
          ...validCartaPorte.autotransporte.identificacionVehicular,
          placaVM: "AB-123 CD",
        },
      },
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.autotransporte.identificacionVehicular.placaVM).toBe("AB123CD");
  });

  it("rechaza placa demasiado corta", () => {
    const r = cartaPorte31Schema.safeParse({
      ...validCartaPorte,
      autotransporte: {
        ...validCartaPorte.autotransporte,
        identificacionVehicular: {
          ...validCartaPorte.autotransporte.identificacionVehicular,
          placaVM: "AB1",
        },
      },
    });
    expect(r.success).toBe(false);
  });

  it("rechaza año modelo fuera de rango", () => {
    const r = cartaPorte31Schema.safeParse({
      ...validCartaPorte,
      autotransporte: {
        ...validCartaPorte.autotransporte,
        identificacionVehicular: {
          ...validCartaPorte.autotransporte.identificacionVehicular,
          anioModeloVM: "1900",
        },
      },
    });
    expect(r.success).toBe(false);
  });

  it("rechaza número de permiso SCT con caracteres inválidos", () => {
    const r = cartaPorte31Schema.safeParse({
      ...validCartaPorte,
      autotransporte: { ...validCartaPorte.autotransporte, numPermisoSCT: "01#SCT@2024" },
    });
    expect(r.success).toBe(false);
  });
});

describe("cartaPorte31Schema (estructura)", () => {
  it("acepta un complemento válido", () => {
    expect(cartaPorte31Schema.safeParse(validCartaPorte).success).toBe(true);
  });

  it("exige al menos dos ubicaciones", () => {
    const r = cartaPorte31Schema.safeParse({
      ...validCartaPorte,
      ubicaciones: [validUbicacionOrigen],
    });
    expect(r.success).toBe(false);
  });

  it("exige numTotalMercancias entero", () => {
    const r = cartaPorte31Schema.safeParse({
      ...validCartaPorte,
      mercancias: { ...validCartaPorte.mercancias, numTotalMercancias: "1.5" },
    });
    expect(r.success).toBe(false);
  });

  it("exige país de origen/destino cuando el transporte es internacional", () => {
    const r = cartaPorte31Schema.safeParse({ ...validCartaPorte, transpInternac: "Sí" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(zodErrorToValidationIssues(r.error).some((i) => i.field === "paisOrigenDestino")).toBe(
        true,
      );
    }
  });
});

describe("comprobanteIngresoSchema", () => {
  const validComprobante = {
    folio: "V-1001",
    formaPago: "03",
    metodoPago: "PUE",
    moneda: "MXN",
    receptor: {
      rfc: "MOR190101AB1",
      nombre: "Cliente Demo",
      email: "cliente@demo.mx",
      domicilioFiscalReceptor: "64000",
      regimenFiscalReceptor: "601",
      usoCFDI: "G03",
    },
    concepto: {
      claveProdServ: "78101802",
      claveUnidad: "E48",
      descripcion: "Flete",
      valorUnitario: "8500",
      objetoImp: "02",
    },
  };

  it("acepta un comprobante de ingreso válido", () => {
    expect(comprobanteIngresoSchema.safeParse(validComprobante).success).toBe(true);
  });

  it("rechaza método de pago fuera de PUE/PPD", () => {
    const r = comprobanteIngresoSchema.safeParse({ ...validComprobante, metodoPago: "XYZ" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(zodErrorToValidationIssues(r.error).map((i) => i.code)).toContain("invalid_enum");
    }
  });

  it("rechaza valor de flete = 0", () => {
    const r = comprobanteIngresoSchema.safeParse({
      ...validComprobante,
      concepto: { ...validComprobante.concepto, valorUnitario: "0" },
    });
    expect(r.success).toBe(false);
  });
});

describe("zodErrorToValidationIssues", () => {
  it("produce field en notación de puntos y un código estable", () => {
    const r = cartaPorte31Schema.safeParse({
      ...validCartaPorte,
      mercancias: {
        ...validCartaPorte.mercancias,
        mercancia: [{ ...validMercancia, pesoEnKg: "0" }],
      },
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issues = zodErrorToValidationIssues(r.error);
      const peso = issues.find((i) => i.field === "mercancias.mercancia.0.pesoEnKg");
      expect(peso?.code).toBe("out_of_range");
    }
  });
});
