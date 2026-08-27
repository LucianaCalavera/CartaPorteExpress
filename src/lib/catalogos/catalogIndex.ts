/**
 * Índice de catálogos SAT en memoria para el motor de validación.
 *
 * `buildCatalogIndex` es puro. `loadCatalogIndex` hace I/O (Supabase) y vive
 * fuera del engine para mantenerlo determinista y 100% testeable: el caller
 * (Server Action de Sprint 2) carga el índice y se lo pasa a `validateBatch`.
 *
 * Los catálogos grandes (`cp`, `clave_prod_serv`) se cargan **sólo** para las
 * claves referidas en el lote; los chicos se cargan completos.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { assembleFolioGroup } from "@/lib/validators/excelRowToCpeSchema";
import type { FolioGroup } from "@/types/cpe";

export interface CatalogEntry {
  description: string;
  attributes: Record<string, unknown>;
}

export type CatalogMap = ReadonlyMap<string, CatalogEntry>;

export type CatalogType =
  | "cp"
  | "clave_prod_serv"
  | "clave_prod_serv_cp"
  | "unidad"
  | "regimen_fiscal"
  | "uso_cfdi"
  | "moneda"
  | "aduana";

export type CatalogIndex = Readonly<Record<CatalogType, CatalogMap>>;

/** Catálogos chicos que siempre se cargan completos. */
const FULL_LOAD_TYPES: readonly CatalogType[] = [
  "unidad",
  "regimen_fiscal",
  "uso_cfdi",
  "moneda",
  "aduana",
];

type SatCatalogoRow = Pick<
  Database["public"]["Tables"]["sat_catalogos"]["Row"],
  "catalogo_type" | "code" | "description" | "attributes"
>;

/** Construye el índice a partir de filas crudas de `sat_catalogos` (puro). */
export function buildCatalogIndex(rows: SatCatalogoRow[]): CatalogIndex {
  const empty = (): Map<string, CatalogEntry> => new Map();
  const index: Record<CatalogType, Map<string, CatalogEntry>> = {
    cp: empty(),
    clave_prod_serv: empty(),
    clave_prod_serv_cp: empty(),
    unidad: empty(),
    regimen_fiscal: empty(),
    uso_cfdi: empty(),
    moneda: empty(),
    aduana: empty(),
  };
  for (const row of rows) {
    const bucket = index[row.catalogo_type as CatalogType];
    if (!bucket) continue;
    bucket.set(row.code, {
      description: row.description,
      attributes: (row.attributes ?? {}) as Record<string, unknown>,
    });
  }
  return index;
}

/** Claves referidas por un lote, para la carga dirigida de catálogos grandes. */
export interface NeededCodes {
  cp: Set<string>;
  /** Claves del concepto de flete (catálogo completo c_ClaveProdServ). */
  clave_prod_serv: Set<string>;
  /** Claves de mercancías (catálogo Carta Porte c_ClaveProdServCP). */
  clave_prod_serv_cp: Set<string>;
  unidad: Set<string>;
}

const upper = (v: string | undefined): string => (v ?? "").trim().toUpperCase();

/** Recorre los grupos de folio y junta las claves de catálogo referidas (puro). */
export function collectCatalogCodes(groups: FolioGroup[]): NeededCodes {
  const needed: NeededCodes = {
    cp: new Set(),
    clave_prod_serv: new Set(),
    clave_prod_serv_cp: new Set(),
    unidad: new Set(),
  };
  for (const group of groups) {
    const { input } = assembleFolioGroup(group);
    const { comprobante, cartaPorte } = input;

    for (const u of cartaPorte.ubicaciones) {
      const cp = upper(u.domicilio?.codigoPostal as string | undefined);
      if (cp) needed.cp.add(cp);
    }
    needed.cp.add(upper(comprobante.receptor.domicilioFiscalReceptor as string | undefined));

    needed.clave_prod_serv.add(upper(comprobante.concepto.claveProdServ as string | undefined));
    needed.unidad.add(upper(comprobante.concepto.claveUnidad as string | undefined));
    for (const m of cartaPorte.mercancias.mercancia) {
      needed.clave_prod_serv_cp.add(upper(m.bienesTransp as string | undefined));
      needed.unidad.add(upper(m.claveUnidad as string | undefined));
    }
  }
  for (const set of Object.values(needed)) set.delete("");
  return needed;
}

/** PostgREST limita a `max_rows` (1000) por respuesta; paginamos con range. */
const PAGE_SIZE = 1000;

/** Trae TODAS las filas vigentes de un catálogo (paginado). */
async function fetchAll(
  supabase: SupabaseClient<Database>,
  catalogoType: CatalogType,
): Promise<SatCatalogoRow[]> {
  const out: SatCatalogoRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("sat_catalogos")
      .select("catalogo_type, code, description, attributes")
      .eq("catalogo_type", catalogoType)
      .is("valid_to", null)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Carga de catálogo ${catalogoType} falló: ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return out;
}

/** Trae en lotes las filas `code IN (...)` de un catálogo grande. */
async function fetchByCodes(
  supabase: SupabaseClient<Database>,
  catalogoType: CatalogType,
  codes: string[],
): Promise<SatCatalogoRow[]> {
  const out: SatCatalogoRow[] = [];
  const CHUNK = 500;
  for (let i = 0; i < codes.length; i += CHUNK) {
    const slice = codes.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("sat_catalogos")
      .select("catalogo_type, code, description, attributes")
      .eq("catalogo_type", catalogoType)
      .is("valid_to", null)
      .in("code", slice);
    if (error) throw new Error(`Carga de catálogo ${catalogoType} falló: ${error.message}`);
    out.push(...(data ?? []));
  }
  return out;
}

/**
 * Carga el índice de catálogos desde Supabase (I/O — fuera del engine).
 * Catálogos chicos completos + catálogos grandes filtrados por `needed`.
 */
export async function loadCatalogIndex(
  supabase: SupabaseClient<Database>,
  needed: NeededCodes,
): Promise<CatalogIndex> {
  const rows: SatCatalogoRow[] = [];

  for (const catalogoType of FULL_LOAD_TYPES) {
    rows.push(...(await fetchAll(supabase, catalogoType)));
  }

  rows.push(...(await fetchByCodes(supabase, "cp", [...needed.cp])));
  rows.push(...(await fetchByCodes(supabase, "clave_prod_serv", [...needed.clave_prod_serv])));
  rows.push(
    ...(await fetchByCodes(supabase, "clave_prod_serv_cp", [...needed.clave_prod_serv_cp])),
  );

  return buildCatalogIndex(rows);
}

/** Índice vacío (para tests o cuando no hay catálogos que verificar). */
export function emptyCatalogIndex(): CatalogIndex {
  return buildCatalogIndex([]);
}
