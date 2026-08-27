/**
 * Constructores de filas de Excel para tests. `makeRow` devuelve una fila con
 * todas las columnas obligatorias llenas con valores válidos; los overrides
 * permiten introducir un error puntual por caso de prueba.
 */
import type { RawExcelRow } from "@/types/cpe";

/** Fila base válida (transporte nacional Guadalajara -> Monterrey). */
export const VALID_ROW: Readonly<RawExcelRow> = {
  Folio: "V-1001",
  "Forma de Pago": "03",
  "Metodo de Pago": "PUE",
  Moneda: "MXN",
  "RFC Cliente": "MOR190101AB1",
  "Nombre Cliente": "Cliente Demo SA de CV",
  "CP Fiscal Cliente": "64000",
  "Regimen Fiscal Cliente": "601",
  "Uso CFDI": "G03",
  "Clave Producto Servicio Flete": "78101802",
  "Clave Unidad Flete": "E48",
  "Descripcion Flete": "Servicio de flete terrestre",
  "Valor Flete": "8500.00",
  "Transporte Internacional": "No",
  "Distancia Total KM": "820",
  "RFC Origen": "MOR190101AB1",
  "Nombre Origen": "Bodega Guadalajara",
  "Fecha Hora Salida": "2026-08-26T08:00:00",
  "CP Origen": "44100",
  "Estado Origen": "JAL",
  "RFC Destino": "XAXX010101000",
  "Nombre Destino": "Centro Distribucion MTY",
  "Fecha Hora Llegada": "2026-08-27T18:00:00",
  "Distancia Recorrida KM": "820",
  "CP Destino": "64000",
  "Estado Destino": "NLE",
  "Permiso SCT": "TPAF01",
  "Num Permiso SCT": "01/SCT/2024",
  Placa: "AB123CD",
  "Anio Modelo": "2019",
  "Config Vehicular": "C2",
  "Aseguradora Resp Civil": "Qualitas",
  "Poliza Resp Civil": "POL-9987",
  "RFC Operador": "PEGJ850101PL9",
  "Nombre Operador": "Juan Perez Gomez",
  "Num Licencia": "LIC-778899",
  "Clave Producto Servicio Mercancia": "11121600",
  "Descripcion Mercancia": "Tarimas de madera",
  "Cantidad Mercancia": "20",
  "Clave Unidad Mercancia": "H87",
  "Peso Kg Mercancia": "1200",
};

/** Fila válida con overrides; `undefined` elimina esa columna. */
export function makeRow(overrides: Partial<RawExcelRow> = {}): RawExcelRow {
  const row: RawExcelRow = { ...VALID_ROW };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete row[key];
    else row[key] = value;
  }
  return row;
}

/** Lote de filas con `rowNumber` consecutivo empezando en 2 (fila 1 = encabezados). */
export function withRowNumbers(rows: RawExcelRow[]): { rowNumber: number; data: RawExcelRow }[] {
  return rows.map((data, i) => ({ rowNumber: i + 2, data }));
}

/** Fecha de referencia fija para tests deterministas de ventana de fecha. */
export const NOW = new Date("2026-08-25T12:00:00");
