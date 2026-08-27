import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { ExcelParseError, parseExcelBuffer } from "@/lib/excel/parser";
import { APP_CONFIG } from "@/lib/constants/appConfig";
import { VALID_ROW } from "../../fixtures/excelRows";

function bufferFromRows(rows: Record<string, unknown>[]): Buffer {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Hoja1");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("parseExcelBuffer", () => {
  it("parsea filas con rowNumber 1-based contando el encabezado como fila 1", () => {
    const buffer = bufferFromRows([VALID_ROW, { ...VALID_ROW, Folio: "V-1002" }]);

    const result = parseExcelBuffer(buffer);

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].rowNumber).toBe(2);
    expect(result.rows[1].rowNumber).toBe(3);
    expect(result.rows[0].data.Folio).toBe("V-1001");
    expect(result.headers).toContain("Folio");
  });

  it("ignora filas completamente vacías intercaladas", () => {
    const emptyRow = Object.fromEntries(Object.keys(VALID_ROW).map((k) => [k, ""]));
    const buffer = bufferFromRows([VALID_ROW, emptyRow, { ...VALID_ROW, Folio: "V-1003" }]);

    const result = parseExcelBuffer(buffer);

    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((r) => r.data.Folio)).toEqual(["V-1001", "V-1003"]);
  });

  it("rechaza un buffer vacío", () => {
    expect(() => parseExcelBuffer(Buffer.alloc(0))).toThrow(ExcelParseError);
  });

  it("rechaza un archivo que excede el tamaño máximo", () => {
    const oversized = Buffer.alloc(APP_CONFIG.MAX_EXCEL_FILE_SIZE_MB * 1024 * 1024 + 1);
    expect(() => parseExcelBuffer(oversized)).toThrow(/tamaño máximo/);
  });

  it("rechaza contenido que no es un workbook válido", () => {
    const garbage = Buffer.from("esto no es un excel");
    expect(() => parseExcelBuffer(garbage)).toThrow(ExcelParseError);
  });

  it("rechaza un lote con más filas que MAX_ROWS_SYNC", () => {
    const rows = Array.from({ length: APP_CONFIG.MAX_ROWS_SYNC + 1 }, (_, i) => ({
      ...VALID_ROW,
      Folio: `V-${i}`,
    }));
    const buffer = bufferFromRows(rows);

    expect(() => parseExcelBuffer(buffer)).toThrow(/máximo soportado/);
  });

  it("no lee fórmulas: usa el valor cacheado, no re-evalúa", () => {
    const sheet = XLSX.utils.json_to_sheet([VALID_ROW]);
    // Simula una celda con fórmula: valor cacheado '999', fórmula maliciosa/costosa ignorada.
    sheet["A2"] = { t: "n", v: 999, f: "RAND()*999999" };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Hoja1");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

    const result = parseExcelBuffer(buffer);

    expect(result.rows[0].data.Folio).toBe("999");
  });
});
