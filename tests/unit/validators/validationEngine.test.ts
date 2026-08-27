import { describe, expect, it } from "vitest";
import { validateBatch } from "@/lib/validators/validationEngine";
import { groupByFolio } from "@/lib/validators/excelRowToCpeSchema";
import type { EmisorProfile, RawExcelRow } from "@/types/cpe";
import { testCatalogs } from "../../fixtures/catalogos";
import { makeRow, withRowNumbers, NOW } from "../../fixtures/excelRows";

const profile: EmisorProfile = {
  rfcEmisor: "MOR190101AB1",
  regimenFiscalId: "601",
  cpEmisor: "44100",
};

/** Corre el motor sobre un solo folio compuesto por `rows` (overrides por fila). */
function run(rows: Partial<RawExcelRow>[]) {
  const groups = groupByFolio(withRowNumbers(rows.map((o) => makeRow(o))));
  return validateBatch(groups, { profile, catalogs: testCatalogs, now: NOW });
}

/** Todos los códigos de issue del primer folio inválido. */
function firstInvalidCodes(res: ReturnType<typeof validateBatch>): string[] {
  return res.invalid[0]?.issues.map((i) => i.code) ?? [];
}

describe("validateBatch — camino feliz", () => {
  it("clasifica un folio completo y correcto como válido", () => {
    const res = run([{}]);
    expect(res.invalid).toHaveLength(0);
    expect(res.valid).toHaveLength(1);
    expect(res.valid[0].data.cartaPorte.version).toBe("3.1");
  });

  it("acepta varias mercancías en el mismo folio", () => {
    const res = run([
      { "Descripcion Mercancia": "Madera", "Peso Kg Mercancia": "1000" },
      { "Descripcion Mercancia": "Clavos", "Peso Kg Mercancia": "200" },
    ]);
    expect(res.valid).toHaveLength(1);
    expect(res.valid[0].data.cartaPorte.mercancias.mercancia).toHaveLength(2);
  });
});

describe("validateBatch — catálogos SAT", () => {
  it("detecta código postal inexistente en el catálogo", () => {
    const res = run([{ "CP Destino": "99999" }]);
    expect(firstInvalidCodes(res)).toContain("cp_not_found");
  });

  it("detecta que el estado no corresponde al código postal", () => {
    const res = run([{ "Estado Origen": "NLE" }]); // CP 44100 es JAL
    expect(firstInvalidCodes(res)).toContain("estado_no_coincide_cp");
  });

  it("detecta clave de producto/servicio de mercancía inexistente", () => {
    const res = run([{ "Clave Producto Servicio Mercancia": "99999999" }]);
    expect(firstInvalidCodes(res)).toContain("clave_prod_serv_not_found");
  });

  it("detecta clave de producto/servicio del flete inexistente", () => {
    const res = run([{ "Clave Producto Servicio Flete": "99999999" }]);
    expect(firstInvalidCodes(res)).toContain("clave_prod_serv_not_found");
  });

  it("detecta clave de unidad inexistente", () => {
    const res = run([{ "Clave Unidad Mercancia": "ZZZ" }]);
    expect(firstInvalidCodes(res)).toContain("clave_unidad_not_found");
  });

  it("detecta régimen fiscal del receptor inexistente", () => {
    const res = run([{ "Regimen Fiscal Cliente": "999" }]);
    expect(firstInvalidCodes(res)).toContain("regimen_fiscal_not_found");
  });

  it("detecta uso de CFDI inexistente", () => {
    const res = run([{ "Uso CFDI": "ZZZ" }]);
    expect(firstInvalidCodes(res)).toContain("uso_cfdi_not_found");
  });

  it("detecta moneda inexistente", () => {
    const res = run([{ Moneda: "GBP" }]);
    expect(firstInvalidCodes(res)).toContain("moneda_not_found");
  });
});

describe("validateBatch — reglas de negocio", () => {
  it("rechaza origen y destino con el mismo código postal", () => {
    const res = run([{ "CP Destino": "44100", "Estado Destino": "JAL" }]);
    expect(firstInvalidCodes(res)).toContain("cp_origen_igual_destino");
  });

  it("rechaza fecha de salida demasiado en el pasado", () => {
    const res = run([
      { "Fecha Hora Salida": "2026-08-01T08:00:00", "Fecha Hora Llegada": "2026-08-02T08:00:00" },
    ]);
    expect(firstInvalidCodes(res)).toContain("fecha_fuera_de_ventana");
  });

  it("rechaza fecha de salida a más de 30 días", () => {
    const res = run([
      { "Fecha Hora Salida": "2026-11-01T08:00:00", "Fecha Hora Llegada": "2026-11-02T08:00:00" },
    ]);
    expect(firstInvalidCodes(res)).toContain("fecha_fuera_de_ventana");
  });

  it("rechaza llegada anterior a la salida", () => {
    const res = run([
      { "Fecha Hora Salida": "2026-08-26T18:00:00", "Fecha Hora Llegada": "2026-08-26T08:00:00" },
    ]);
    expect(firstInvalidCodes(res)).toContain("fecha_llegada_antes_de_salida");
  });

  it("rechaza el transporte de combustibles (requiere Complemento Hidrocarburos)", () => {
    const res = run([{ "Clave Producto Servicio Mercancia": "15101514" }]);
    expect(firstInvalidCodes(res)).toContain("combustible_no_soportado");
  });

  it('exige Material Peligroso = "Sí" cuando la clave siempre es peligrosa', () => {
    const res = run([
      { "Clave Producto Servicio Mercancia": "12141901", "Material Peligroso": "No" },
    ]);
    expect(firstInvalidCodes(res)).toContain("material_peligroso_requerido");
  });
});

describe("validateBatch — formato (Zod) y cortocircuito", () => {
  it("marca RFC del cliente con formato inválido", () => {
    const res = run([{ "RFC Cliente": "NO-RFC" }]);
    expect(firstInvalidCodes(res)).toContain("invalid_format");
  });

  it("marca peso 0 y NO ejecuta reglas de catálogo (Regla de Oro #2)", () => {
    const res = run([{ "Peso Kg Mercancia": "0", "Clave Unidad Mercancia": "ZZZ" }]);
    const codes = firstInvalidCodes(res);
    expect(codes).toContain("out_of_range");
    // Zod falló -> no se llega a la verificación de catálogo de unidad.
    expect(codes).not.toContain("clave_unidad_not_found");
  });

  it("marca placa con formato inválido", () => {
    const res = run([{ Placa: "A1" }]);
    expect(firstInvalidCodes(res)).toContain("invalid_format");
  });

  it("marca número de permiso SCT con caracteres inválidos", () => {
    const res = run([{ "Num Permiso SCT": "01@SCT#2024" }]);
    expect(firstInvalidCodes(res)).toContain("invalid_format");
  });
});

describe("validateBatch — lote e inconsistencias entre filas", () => {
  it("reporta columnas de viaje divergentes dentro del folio", () => {
    const res = run([{}, { "CP Destino": "06000", "Estado Destino": "CMX" }]);
    expect(firstInvalidCodes(res)).toContain("row_group_inconsistente");
  });

  it("acumula el resumen de errores por código a lo largo del lote", () => {
    const groups = groupByFolio(
      withRowNumbers([
        makeRow({ Folio: "F1", "CP Destino": "99999" }),
        makeRow({ Folio: "F2", "CP Origen": "88888" }),
      ]),
    );
    const res = validateBatch(groups, { profile, catalogs: testCatalogs, now: NOW });
    expect(res.invalid).toHaveLength(2);
    expect(res.errorSummary.cp_not_found).toBeGreaterThanOrEqual(2);
  });

  it("separa folios válidos e inválidos en el mismo lote", () => {
    const groups = groupByFolio(
      withRowNumbers([makeRow({ Folio: "OK" }), makeRow({ Folio: "MAL", "CP Destino": "99999" })]),
    );
    const res = validateBatch(groups, { profile, catalogs: testCatalogs, now: NOW });
    expect(res.valid.map((v) => v.folio)).toEqual(["OK"]);
    expect(res.invalid.map((v) => v.folio)).toEqual(["MAL"]);
  });
});
