/**
 * Mapea filas crudas del Excel al objeto de entrada del CFDI de Ingreso +
 * Carta Porte 3.1 (`CfdiCartaPorteIngresoInput`), agrupando por `Folio`.
 *
 * No valida formato (eso lo hace `cartaPorte31Schema`) ni catálogos (eso lo hace
 * `validationEngine`). Sólo:
 *   1. Traduce encabezados -> `key` con tolerancia a variantes.
 *   2. Agrupa filas por folio.
 *   3. Verifica que las columnas `trip` sean idénticas en el folio.
 *   4. Ensambla la estructura anidada (una mercancía por fila) + defaults.
 */
import {
  HEADER_TO_KEY,
  PLANTILLA_COLUMNAS_MAP,
  PLANTILLA_DEFAULTS,
  normalizeHeader,
  type PlantillaColumn,
  type PlantillaKey,
} from "@/lib/validators/plantillaColumns";
import { issue, type ValidationIssue } from "@/lib/utils/errors";
import type { CfdiCartaPorteIngresoInput, FolioGroup, RawExcelRow } from "@/types/cpe";

type KeyedRow = Partial<Record<PlantillaKey, string>>;

const COLUMN_BY_KEY = new Map<PlantillaKey, PlantillaColumn>(
  PLANTILLA_COLUMNAS_MAP.map((c) => [c.key as PlantillaKey, c]),
);

const TRIP_KEYS = PLANTILLA_COLUMNAS_MAP.filter((c) => c.scope === "trip").map(
  (c) => c.key as PlantillaKey,
);

/** Valor de celda -> string recortado ('' si vacío/nulo). */
function cell(value: RawExcelRow[string]): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

/**
 * Traduce una fila cruda (encabezados arbitrarios) a `{ key: valor }`.
 * Encabezados desconocidos se ignoran.
 */
export function mapRowToSchema(row: RawExcelRow): KeyedRow {
  const keyed: KeyedRow = {};
  for (const [header, value] of Object.entries(row)) {
    const key = HEADER_TO_KEY.get(normalizeHeader(header));
    if (key) keyed[key] = cell(value);
  }
  return keyed;
}

/**
 * Escribe `value` bajo la key dada en una fila cruda, reusando el header
 * original de esa fila si ya lo tenía (tolera aliases); si no, usa el header
 * canónico de la plantilla. Contraparte de escritura de `mapRowToSchema`,
 * para que el editor de errores pueda corregir `raw_data` sin perder el resto
 * de las columnas ni duplicar headers.
 */
export function setPlantillaValue(row: RawExcelRow, key: PlantillaKey, value: string): RawExcelRow {
  const updated: RawExcelRow = { ...row };
  const existingHeader = Object.keys(row).find(
    (header) => HEADER_TO_KEY.get(normalizeHeader(header)) === key,
  );
  const targetHeader = existingHeader ?? COLUMN_BY_KEY.get(key)?.header ?? key;
  updated[targetHeader] = value;
  return updated;
}

/** Agrupa filas por `Folio`. Filas sin folio caen en el grupo `""`. */
export function groupByFolio(rows: { rowNumber: number; data: RawExcelRow }[]): FolioGroup[] {
  const groups = new Map<string, FolioGroup>();
  for (const { rowNumber, data } of rows) {
    const keyed = mapRowToSchema(data);
    const folio = keyed.folio ?? "";
    let group = groups.get(folio);
    if (!group) {
      group = { folio, rowNumbers: [], rows: [] };
      groups.set(folio, group);
    }
    group.rowNumbers.push(rowNumber);
    group.rows.push(data);
  }
  return [...groups.values()];
}

function undefIfEmpty(value: string | undefined): string | undefined {
  return value && value.length > 0 ? value : undefined;
}

/**
 * Verifica que cada columna `trip` tenga el mismo valor en todas las filas del
 * folio. Devuelve un issue por columna divergente.
 */
export function checkTripConsistency(keyedRows: KeyedRow[]): ValidationIssue[] {
  if (keyedRows.length < 2) return [];
  const issues: ValidationIssue[] = [];
  for (const key of TRIP_KEYS) {
    const values = new Set(keyedRows.map((r) => (r[key] ?? "").toUpperCase()));
    if (values.size > 1) {
      const col = COLUMN_BY_KEY.get(key);
      issues.push(
        issue(
          `columna.${key}`,
          "row_group_inconsistente",
          `La columna "${col?.header ?? key}" tiene valores distintos en las filas del folio; debe ser igual en todo el viaje`,
          [...values],
        ),
      );
    }
  }
  return issues;
}

/** Ensambla el objeto de entrada del CFDI a partir de un grupo de folio. */
export function assembleFolioGroup(group: FolioGroup): {
  input: CfdiCartaPorteIngresoInput;
  issues: ValidationIssue[];
} {
  const keyedRows = group.rows.map(mapRowToSchema);
  const issues = checkTripConsistency(keyedRows);
  const trip = keyedRows[0] ?? {};
  const g = (key: PlantillaKey): string | undefined => undefIfEmpty(trip[key]);

  const origenDomicilio = {
    calle: g("origenCalle"),
    colonia: g("origenColonia"),
    municipio: g("origenMunicipio"),
    estado: g("origenEstado") ?? "",
    pais: "MEX",
    codigoPostal: g("origenCp") ?? "",
  };
  const destinoDomicilio = {
    calle: g("destinoCalle"),
    colonia: g("destinoColonia"),
    municipio: g("destinoMunicipio"),
    estado: g("destinoEstado") ?? "",
    pais: "MEX",
    codigoPostal: g("destinoCp") ?? "",
  };

  const mercancia = keyedRows.map((r) => ({
    bienesTransp: undefIfEmpty(r.mercClaveProdServ) ?? "",
    descripcion: undefIfEmpty(r.mercDescripcion) ?? "",
    cantidad: undefIfEmpty(r.mercCantidad) ?? "",
    claveUnidad: undefIfEmpty(r.mercClaveUnidad) ?? "",
    pesoEnKg: undefIfEmpty(r.mercPesoKg) ?? "",
    valorMercancia: undefIfEmpty(r.mercValor),
    materialPeligroso: undefIfEmpty(r.mercMaterialPeligroso),
    cveMaterialPeligroso: undefIfEmpty(r.mercCveMaterialPeligroso),
    embalaje: undefIfEmpty(r.mercEmbalaje),
  }));

  const input: CfdiCartaPorteIngresoInput = {
    comprobante: {
      serie: g("serie"),
      folio: g("folio") ?? "",
      formaPago: g("formaPago") ?? "",
      metodoPago: (g("metodoPago") ??
        "") as CfdiCartaPorteIngresoInput["comprobante"]["metodoPago"],
      moneda: g("moneda") ?? "MXN",
      receptor: {
        rfc: g("receptorRfc") ?? "",
        nombre: g("receptorNombre") ?? "",
        email: g("receptorEmail") ?? "",
        domicilioFiscalReceptor: g("receptorCpFiscal") ?? "",
        regimenFiscalReceptor: g("receptorRegimen") ?? "",
        usoCFDI: g("usoCfdi") ?? "",
      },
      concepto: {
        claveProdServ: g("fleteClaveProdServ") ?? "",
        claveUnidad: g("fleteClaveUnidad") ?? "",
        descripcion: g("fleteDescripcion") ?? "",
        cantidad: PLANTILLA_DEFAULTS.conceptoCantidad,
        valorUnitario: g("fleteValor") ?? "",
        objetoImp: PLANTILLA_DEFAULTS.objetoImp,
      },
    },
    cartaPorte: {
      version: PLANTILLA_DEFAULTS.cartaPorteVersion,
      transpInternac: (g("transpInternac") ??
        "") as CfdiCartaPorteIngresoInput["cartaPorte"]["transpInternac"],
      totalDistRec: g("totalDistRec") ?? "",
      ubicaciones: [
        {
          tipoUbicacion: "Origen",
          rfcRemitenteDestinatario: g("origenRfc") ?? "",
          nombreRemitenteDestinatario: g("origenNombre"),
          fechaHoraSalidaLlegada: g("origenFechaHora") ?? "",
          domicilio: origenDomicilio,
        },
        {
          tipoUbicacion: "Destino",
          rfcRemitenteDestinatario: g("destinoRfc") ?? "",
          nombreRemitenteDestinatario: g("destinoNombre"),
          fechaHoraSalidaLlegada: g("destinoFechaHora") ?? "",
          distanciaRecorrida: g("destinoDistancia"),
          domicilio: destinoDomicilio,
        },
      ],
      mercancias: {
        pesoBrutoTotal: sumPeso(mercancia),
        unidadPeso: PLANTILLA_DEFAULTS.unidadPeso,
        numTotalMercancias: mercancia.length,
        mercancia,
      },
      autotransporte: {
        permSCT: g("permSct") ?? "",
        numPermisoSCT: g("numPermisoSct") ?? "",
        identificacionVehicular: {
          placaVM: g("placa") ?? "",
          anioModeloVM: g("anioModelo") ?? "",
          configVehicular: g("configVehicular") ?? "",
        },
        seguros: {
          aseguraRespCivil: g("aseguraRespCivil") ?? "",
          polizaRespCivil: g("polizaRespCivil") ?? "",
        },
      },
      figuras: [
        {
          tipoFigura: PLANTILLA_DEFAULTS.tipoFiguraOperador,
          rfcFigura: g("operadorRfc"),
          nombreFigura: g("operadorNombre"),
          numLicencia: g("operadorLicencia"),
        },
      ],
    },
  };

  return { input, issues };
}

/** Suma los pesos declarados por fila (los no numéricos cuentan como 0). */
function sumPeso(mercancia: { pesoEnKg: string }[]): number {
  return mercancia.reduce((acc, m) => {
    const n = Number(String(m.pesoEnKg).replace(/,/g, ""));
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
}
