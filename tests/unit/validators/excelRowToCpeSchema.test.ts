import { describe, expect, it } from "vitest";
import {
  assembleFolioGroup,
  checkTripConsistency,
  groupByFolio,
  mapRowToSchema,
} from "@/lib/validators/excelRowToCpeSchema";
import { makeRow, withRowNumbers } from "../../fixtures/excelRows";

describe("mapRowToSchema", () => {
  it("traduce encabezados exactos y alias a keys", () => {
    const keyed = mapRowToSchema({ "RFC Cliente": "MOR190101AB1", "Forma Pago": "03" });
    expect(keyed.receptorRfc).toBe("MOR190101AB1");
    expect(keyed.formaPago).toBe("03"); // "Forma Pago" es alias de "Forma de Pago"
  });

  it("ignora encabezados desconocidos y recorta espacios", () => {
    const keyed = mapRowToSchema({ "Columna Rara": "x", Folio: "  V-9  " });
    expect(keyed.folio).toBe("V-9");
    expect(Object.values(keyed)).not.toContain("x");
  });

  it("es tolerante a acentos y mayúsculas en el encabezado", () => {
    expect(mapRowToSchema({ "descripción flete": "Flete X" }).fleteDescripcion).toBe("Flete X");
  });
});

describe("groupByFolio", () => {
  it("agrupa filas por folio y preserva los números de fila", () => {
    const groups = groupByFolio(
      withRowNumbers([makeRow({ Folio: "A" }), makeRow({ Folio: "B" }), makeRow({ Folio: "A" })]),
    );
    expect(groups).toHaveLength(2);
    const a = groups.find((g) => g.folio === "A");
    expect(a?.rowNumbers).toEqual([2, 4]);
  });
});

describe("checkTripConsistency", () => {
  it("no reporta nada si las columnas de viaje coinciden", () => {
    const rows = [makeRow(), makeRow({ "Descripcion Mercancia": "Otra cosa" })].map(mapRowToSchema);
    expect(checkTripConsistency(rows)).toHaveLength(0);
  });

  it("reporta la columna de viaje divergente entre filas del folio", () => {
    const rows = [makeRow(), makeRow({ Placa: "ZZ999ZZ" })].map(mapRowToSchema);
    const issues = checkTripConsistency(rows);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("row_group_inconsistente");
    expect(issues[0].field).toBe("columna.placa");
  });
});

describe("assembleFolioGroup", () => {
  it("ensambla una mercancía por fila y calcula totales", () => {
    const group = groupByFolio(
      withRowNumbers([
        makeRow({ "Peso Kg Mercancia": "1200", "Descripcion Mercancia": "Madera" }),
        makeRow({ "Peso Kg Mercancia": "300", "Descripcion Mercancia": "Tornillos" }),
      ]),
    )[0];
    const { input, issues } = assembleFolioGroup(group);
    expect(issues).toHaveLength(0);
    expect(input.cartaPorte.mercancias.mercancia).toHaveLength(2);
    expect(input.cartaPorte.mercancias.numTotalMercancias).toBe(2);
    expect(input.cartaPorte.mercancias.pesoBrutoTotal).toBe(1500);
  });

  it("coloca origen y destino como ubicaciones tipadas", () => {
    const group = groupByFolio(withRowNumbers([makeRow()]))[0];
    const { input } = assembleFolioGroup(group);
    expect(input.cartaPorte.ubicaciones[0].tipoUbicacion).toBe("Origen");
    expect(input.cartaPorte.ubicaciones[1].tipoUbicacion).toBe("Destino");
    expect(input.cartaPorte.ubicaciones[0].domicilio.codigoPostal).toBe("44100");
  });

  it("fija los valores por defecto que la plantilla no pide", () => {
    const { input } = assembleFolioGroup(groupByFolio(withRowNumbers([makeRow()]))[0]);
    expect(input.cartaPorte.version).toBe("3.1");
    expect(input.cartaPorte.figuras[0].tipoFigura).toBe("01");
    expect(input.comprobante.concepto.objetoImp).toBe("02");
  });
});
