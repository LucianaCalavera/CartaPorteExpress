/**
 * Declaración de qué tablas del SQLite de `phpcfdi/resources-sat-catalogs` se
 * sincronizan y cómo se transforman.
 *
 * Dos destinos:
 *  - `BIG_CATALOG_SOURCES`  -> tabla `public.sat_catalogos` en Supabase
 *    (catálogos grandes o volátiles: CP, ClaveProdServ, ClaveUnidad, etc.).
 *  - `SMALL_CATALOG_SOURCES` -> archivo TS generado y versionado
 *    (`src/lib/constants/cartaPorteCatalogs.generated.ts`), catálogos chicos y
 *    estables que conviene tener en el bundle sin round-trip a la DB.
 *
 * Regla de Oro #8: cada fila lleva `version` (fecha de publicación del catálogo
 * SAT). El sync marca `valid_to` de versiones previas al insertar la nueva.
 */

/** Fila cruda que devuelve `node:sqlite` (todas las columnas como texto/número). */
export type SqliteRow = Record<string, string | number | null>;

/** Registro normalizado listo para insertar en `sat_catalogos`. */
export interface SatCatalogoRecord {
  code: string;
  description: string;
  parent_code: string | null;
  valid_from: string;
  valid_to: string | null;
  attributes: Record<string, unknown>;
}

export interface BigCatalogSource {
  /** Valor de `sat_catalogos.catalogo_type`. */
  catalogoType: string;
  /** SQL `SELECT` contra el SQLite de phpcfdi (una fila por `code`). */
  query: string;
  /** Transforma una fila del SELECT en un registro de `sat_catalogos`. */
  toRecord: (row: SqliteRow) => SatCatalogoRecord;
}

/** Normaliza `vigencia_hasta` ('' -> null) para la columna `date`. */
function endDate(value: string | number | null): string | null {
  const s = String(value ?? "").trim();
  return s.length > 0 ? s : null;
}

/** Normaliza `vigencia_desde` con fallback a la versión del snapshot. */
function startDate(value: string | number | null, fallback: string): string {
  const s = String(value ?? "").trim();
  return s.length > 0 ? s : fallback;
}

function intToBool(value: string | number | null): boolean {
  return String(value ?? "").trim() === "1";
}

/**
 * @param version fecha del snapshot (`SAT_CATALOGS_VERSION`), usada como
 *   `valid_from` por defecto cuando la fuente no trae `vigencia_desde`.
 */
export function buildBigCatalogSources(version: string): BigCatalogSource[] {
  return [
    {
      catalogoType: "cp",
      // El código postal referencia un c_Estado (código) y un municipio (texto
      // vía join). Guardamos el código de estado en `attributes.estado` para
      // validar que `Domicilio/Estado` coincida.
      query: `
        SELECT cp.id            AS code,
               cp.estado        AS estado_code,
               est.texto        AS estado_nombre,
               mun.texto        AS municipio_nombre,
               cp.vigencia_desde AS vigencia_desde,
               cp.vigencia_hasta AS vigencia_hasta
        FROM cfdi_40_codigos_postales cp
        LEFT JOIN cfdi_40_estados est
          ON est.estado = cp.estado
        LEFT JOIN cfdi_40_municipios mun
          ON mun.municipio = cp.municipio AND mun.estado = cp.estado
      `,
      toRecord: (row) => {
        const estadoNombre = String(row.estado_nombre ?? "").trim();
        const municipioNombre = String(row.municipio_nombre ?? "").trim();
        const descr = [municipioNombre, estadoNombre].filter(Boolean).join(", ");
        return {
          code: String(row.code),
          description: descr || String(row.code),
          parent_code: null,
          valid_from: startDate(row.vigencia_desde, version),
          valid_to: endDate(row.vigencia_hasta),
          attributes: { estado: String(row.estado_code ?? "").trim() || null },
        };
      },
    },
    {
      // Concepto del CFDI: servicio de flete. Usa el catálogo COMPLETO
      // c_ClaveProdServ (p. ej. 78101800 "Transporte de carga por carretera").
      catalogoType: "clave_prod_serv",
      query: `
        SELECT id, texto, complemento, vigencia_desde, vigencia_hasta
        FROM cfdi_40_productos_servicios
      `,
      toRecord: (row) => ({
        code: String(row.id),
        description: String(row.texto ?? "").trim() || String(row.id),
        parent_code: null,
        valid_from: startDate(row.vigencia_desde, version),
        valid_to: endDate(row.vigencia_hasta),
        attributes: { complemento: String(row.complemento ?? "").trim() || null },
      }),
    },
    {
      // Mercancía transportada: Mercancia/@BienesTransp. Usa el catálogo
      // ESPECÍFICO de Carta Porte (c_ClaveProdServCP). La columna
      // `material_peligroso` es un set separado por comas de valores permitidos
      // para MaterialPeligroso: '0' (sólo "No"), '1' (sólo "Sí"), '0,1' (opcional).
      catalogoType: "clave_prod_serv_cp",
      query: `
        SELECT id, texto, material_peligroso, vigencia_desde, vigencia_hasta
        FROM ccp_31_productos_servicios
      `,
      toRecord: (row) => ({
        code: String(row.id),
        description: String(row.texto ?? "").trim() || String(row.id),
        parent_code: null,
        valid_from: startDate(row.vigencia_desde, version),
        valid_to: endDate(row.vigencia_hasta),
        attributes: {
          material_peligroso: String(row.material_peligroso ?? "0").trim() || "0",
        },
      }),
    },
    {
      // c_ClaveUnidad completo (Mercancia/@ClaveUnidad y Concepto/@ClaveUnidad;
      // p. ej. H87 "Pieza", E48 "Unidad de servicio", KGM).
      catalogoType: "unidad",
      query: `
        SELECT id, texto, simbolo, notas, vigencia_desde, vigencia_hasta
        FROM cfdi_40_claves_unidades
      `,
      toRecord: (row) => ({
        code: String(row.id),
        description: String(row.texto ?? "").trim() || String(row.id),
        parent_code: null,
        valid_from: startDate(row.vigencia_desde, version),
        valid_to: endDate(row.vigencia_hasta),
        attributes: {
          simbolo: String(row.simbolo ?? "").trim() || null,
          nota: String(row.notas ?? "").trim() || null,
        },
      }),
    },
    {
      catalogoType: "regimen_fiscal",
      query: `
        SELECT id, texto, aplica_fisica, aplica_moral, vigencia_desde, vigencia_hasta
        FROM cfdi_40_regimenes_fiscales
      `,
      toRecord: (row) => ({
        code: String(row.id),
        description: String(row.texto ?? "").trim() || String(row.id),
        parent_code: null,
        valid_from: startDate(row.vigencia_desde, version),
        valid_to: endDate(row.vigencia_hasta),
        attributes: {
          aplica_fisica: intToBool(row.aplica_fisica),
          aplica_moral: intToBool(row.aplica_moral),
        },
      }),
    },
    {
      catalogoType: "uso_cfdi",
      query: `
        SELECT id, texto, aplica_fisica, aplica_moral,
               regimenes_fiscales_receptores, vigencia_desde, vigencia_hasta
        FROM cfdi_40_usos_cfdi
      `,
      toRecord: (row) => ({
        code: String(row.id),
        description: String(row.texto ?? "").trim() || String(row.id),
        parent_code: null,
        valid_from: startDate(row.vigencia_desde, version),
        valid_to: endDate(row.vigencia_hasta),
        attributes: {
          aplica_fisica: intToBool(row.aplica_fisica),
          aplica_moral: intToBool(row.aplica_moral),
          regimenes_receptores: String(row.regimenes_fiscales_receptores ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        },
      }),
    },
    {
      catalogoType: "moneda",
      query: `
        SELECT id, texto, decimales, vigencia_desde, vigencia_hasta
        FROM cfdi_40_monedas
      `,
      toRecord: (row) => ({
        code: String(row.id),
        description: String(row.texto ?? "").trim() || String(row.id),
        parent_code: null,
        valid_from: startDate(row.vigencia_desde, version),
        valid_to: endDate(row.vigencia_hasta),
        attributes: { decimales: Number(row.decimales ?? 2) },
      }),
    },
    {
      catalogoType: "aduana",
      query: `
        SELECT id, texto, vigencia_desde, vigencia_hasta
        FROM cfdi_40_aduanas
      `,
      toRecord: (row) => ({
        code: String(row.id),
        description: String(row.texto ?? "").trim() || String(row.id),
        parent_code: null,
        valid_from: startDate(row.vigencia_desde, version),
        valid_to: endDate(row.vigencia_hasta),
        attributes: {},
      }),
    },
  ];
}

// ---------------------------------------------------------------------------
// Catálogos chicos -> archivo TS generado
// ---------------------------------------------------------------------------

export interface SmallCatalogSource {
  /** Nombre del `export const` en el archivo generado. */
  exportName: string;
  /** Tabla del SQLite. */
  sqliteTable: string;
  /** Columna que actúa como clave del `Record`. */
  keyColumn: string;
  /** Columnas de detalle a incluir en cada entrada (además de la clave). */
  detailColumns: readonly string[];
  /** Comentario JSDoc para el export. */
  doc: string;
}

export const SMALL_CATALOG_SOURCES: readonly SmallCatalogSource[] = [
  {
    exportName: "CONFIGURACIONES_AUTOTRANSPORTE",
    sqliteTable: "ccp_31_configuraciones_autotransporte",
    keyColumn: "id",
    detailColumns: ["texto", "numero_de_ejes", "numero_de_llantas", "remolque"],
    doc: "c_ConfigAutotransporte — configuración vehicular del autotransporte.",
  },
  {
    exportName: "TIPOS_PERMISO_SCT",
    sqliteTable: "ccp_31_tipos_permiso",
    keyColumn: "id",
    detailColumns: ["texto", "clave_transporte"],
    doc: "c_TipoPermiso — tipo de permiso SCT del autotransporte.",
  },
  {
    exportName: "TIPOS_REMOLQUE",
    sqliteTable: "ccp_31_tipos_remolque",
    keyColumn: "id",
    detailColumns: ["texto"],
    doc: "c_SubTipoRem — subtipo de remolque / semirremolque.",
  },
  {
    exportName: "FIGURAS_TRANSPORTE",
    sqliteTable: "ccp_31_figuras_transporte",
    keyColumn: "id",
    detailColumns: ["texto"],
    doc: "c_FiguraTransporte — tipo de figura de transporte (operador, propietario, etc.).",
  },
  {
    exportName: "TIPOS_EMBALAJE",
    sqliteTable: "ccp_31_tipos_embalaje",
    keyColumn: "id",
    detailColumns: ["texto"],
    doc: "c_TipoEmbalaje — tipo de embalaje para material peligroso.",
  },
  {
    exportName: "TIPOS_CARGA",
    sqliteTable: "ccp_31_tipos_carga",
    keyColumn: "id",
    detailColumns: ["texto"],
    doc: "c_TipoCarga — tipo de carga (general / especializada).",
  },
  {
    exportName: "FORMAS_PAGO",
    sqliteTable: "cfdi_40_formas_pago",
    keyColumn: "id",
    detailColumns: ["texto"],
    doc: "c_FormaPago — forma de pago del CFDI.",
  },
  {
    exportName: "METODOS_PAGO",
    sqliteTable: "cfdi_40_metodos_pago",
    keyColumn: "id",
    detailColumns: ["texto"],
    doc: "c_MetodoPago — método de pago (PUE / PPD).",
  },
  {
    exportName: "PAISES",
    sqliteTable: "cfdi_40_paises",
    keyColumn: "id",
    detailColumns: ["texto", "patron_codigo_postal"],
    doc: "c_Pais — países (ISO 3166-1 alpha-3 del SAT).",
  },
];

/**
 * Materiales peligrosos: ~460 filas, se emite como archivo aparte para no
 * inflar `cartaPorteCatalogs.generated.ts`. Ver `MATERIALES_PELIGROSOS_SOURCE`.
 */
export const MATERIALES_PELIGROSOS_SOURCE = {
  exportName: "MATERIALES_PELIGROSOS",
  sqliteTable: "ccp_31_materiales_peligrosos",
  keyColumn: "id",
  detailColumns: ["texto", "clase_o_div", "peligro_secundario", "nombre_tecnico"],
  doc: "c_MaterialPeligroso — claves de material peligroso.",
} as const satisfies SmallCatalogSource;
