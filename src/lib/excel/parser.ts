/**
 * Excel (.xlsx/.csv) -> filas crudas. Solo servidor (Regla de Oro #12):
 * - `cellFormula: false` — nunca se leen/evalúan fórmulas del archivo subido.
 * - Límite de tamaño y de filas antes de tocar `XLSX.read`.
 * - No persiste nada en disco; trabaja sobre el `Buffer` en memoria.
 */
import "server-only";
import * as XLSX from "xlsx";
import { APP_CONFIG } from "@/lib/constants/appConfig";
import type { RawExcelRow } from "@/types/cpe";

export class ExcelParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExcelParseError";
  }
}

export interface ParsedExcelRow {
  /** Fila tal como la ve el usuario en Excel (encabezado = fila 1). */
  rowNumber: number;
  data: RawExcelRow;
}

export interface ParseExcelResult {
  sheetName: string;
  headers: string[];
  rows: ParsedExcelRow[];
}

function isBlankRow(row: Record<string, unknown>): boolean {
  return Object.values(row).every((v) => v === "" || v === null || v === undefined);
}

/** Parsea un buffer de Excel/CSV a filas `{ rowNumber, data }`. Lanza `ExcelParseError`. */
export function parseExcelBuffer(buffer: Buffer): ParseExcelResult {
  const maxBytes = APP_CONFIG.MAX_EXCEL_FILE_SIZE_MB * 1024 * 1024;
  if (buffer.byteLength > maxBytes) {
    throw new ExcelParseError(
      `El archivo excede el tamaño máximo de ${APP_CONFIG.MAX_EXCEL_FILE_SIZE_MB} MB`,
    );
  }
  if (buffer.byteLength === 0) {
    throw new ExcelParseError("El archivo está vacío");
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, {
      type: "buffer",
      cellFormula: false,
      cellHTML: false,
      cellDates: false,
      raw: false,
    });
  } catch {
    throw new ExcelParseError(
      "No se pudo leer el archivo. Verifica que sea un .xlsx o .csv válido.",
    );
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new ExcelParseError("El archivo no tiene hojas.");
  const sheet = workbook.Sheets[sheetName];

  const headerRow = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false })[0] ?? [];
  const headers = headerRow.map((h) => String(h ?? "").trim()).filter((h) => h.length > 0);
  if (headers.length === 0) throw new ExcelParseError("El archivo no tiene encabezados.");

  const table = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: false,
    defval: "",
  });

  const rows: ParsedExcelRow[] = [];
  table.forEach((raw, i) => {
    if (isBlankRow(raw)) return;
    rows.push({ rowNumber: i + 2, data: raw as RawExcelRow });
  });

  if (rows.length === 0) {
    throw new ExcelParseError("El archivo no tiene filas con datos.");
  }
  if (rows.length > APP_CONFIG.MAX_ROWS_SYNC) {
    throw new ExcelParseError(
      `El archivo tiene ${rows.length} filas; el máximo soportado por carga es ${APP_CONFIG.MAX_ROWS_SYNC}.`,
    );
  }

  return { sheetName, headers, rows };
}
