/**
 * Definición de la plantilla Excel de CartaPorteExpress y su mapeo a los campos
 * internos del CFDI de Ingreso + Carta Porte 3.1.
 *
 * Modelo (decisión de producto): **una fila = una mercancía**. Varias filas con
 * el mismo `Folio` se ensamblan en un solo CFDI. Las columnas `trip` deben ser
 * idénticas en todas las filas del folio; las `mercancia` cambian por fila.
 *
 * `key` es el identificador estable que consume `excelRowToCpeSchema.ts`.
 * `header` es el encabezado exacto de la plantilla (español, cara al usuario);
 * `aliases` tolera variantes comunes al leer archivos reales.
 */

export type ColumnScope = "trip" | "mercancia";

export interface PlantillaColumn {
  key: string;
  header: string;
  aliases?: readonly string[];
  scope: ColumnScope;
  required: boolean;
  /** Ayuda breve para la plantilla / mensajes de error. */
  hint?: string;
}

export const PLANTILLA_COLUMNAS_MAP = [
  // --- Identificación del viaje ---
  {
    key: "folio",
    header: "Folio",
    scope: "trip",
    required: true,
    hint: "Identificador del viaje; agrupa mercancías",
  },
  { key: "serie", header: "Serie", scope: "trip", required: false },

  // --- Comprobante / pago ---
  {
    key: "formaPago",
    header: "Forma de Pago",
    aliases: ["Forma Pago"],
    scope: "trip",
    required: true,
    hint: "Clave c_FormaPago (p. ej. 03)",
  },
  {
    key: "metodoPago",
    header: "Metodo de Pago",
    aliases: ["Método de Pago", "Metodo Pago"],
    scope: "trip",
    required: true,
    hint: "PUE o PPD",
  },
  { key: "moneda", header: "Moneda", scope: "trip", required: false, hint: "MXN por defecto" },

  // --- Receptor (cliente que paga el flete) ---
  {
    key: "receptorRfc",
    header: "RFC Cliente",
    aliases: ["RFC Receptor"],
    scope: "trip",
    required: true,
  },
  {
    key: "receptorNombre",
    header: "Nombre Cliente",
    aliases: ["Razon Social Cliente", "Nombre Receptor"],
    scope: "trip",
    required: true,
  },
  {
    key: "receptorCpFiscal",
    header: "CP Fiscal Cliente",
    aliases: ["Codigo Postal Cliente"],
    scope: "trip",
    required: true,
  },
  {
    key: "receptorRegimen",
    header: "Regimen Fiscal Cliente",
    aliases: ["Régimen Fiscal Cliente"],
    scope: "trip",
    required: true,
  },
  { key: "usoCfdi", header: "Uso CFDI", aliases: ["Uso del CFDI"], scope: "trip", required: true },

  // --- Concepto: servicio de flete ---
  {
    key: "fleteClaveProdServ",
    header: "Clave Producto Servicio Flete",
    aliases: ["Clave ProdServ Flete"],
    scope: "trip",
    required: true,
    hint: "p. ej. 78101800",
  },
  {
    key: "fleteClaveUnidad",
    header: "Clave Unidad Flete",
    scope: "trip",
    required: true,
    hint: "p. ej. E48",
  },
  {
    key: "fleteDescripcion",
    header: "Descripcion Flete",
    aliases: ["Descripción Flete"],
    scope: "trip",
    required: true,
  },
  {
    key: "fleteValor",
    header: "Valor Flete",
    aliases: ["Importe Flete"],
    scope: "trip",
    required: true,
    hint: "Monto sin IVA",
  },

  // --- Carta Porte: datos del viaje ---
  {
    key: "transpInternac",
    header: "Transporte Internacional",
    scope: "trip",
    required: true,
    hint: "Sí o No",
  },
  {
    key: "totalDistRec",
    header: "Distancia Total KM",
    aliases: ["Distancia Total"],
    scope: "trip",
    required: true,
  },

  // --- Origen ---
  {
    key: "origenRfc",
    header: "RFC Origen",
    aliases: ["RFC Remitente"],
    scope: "trip",
    required: true,
  },
  {
    key: "origenNombre",
    header: "Nombre Origen",
    aliases: ["Nombre Remitente"],
    scope: "trip",
    required: false,
  },
  {
    key: "origenFechaHora",
    header: "Fecha Hora Salida",
    aliases: ["Fecha y Hora Salida"],
    scope: "trip",
    required: true,
    hint: "AAAA-MM-DDTHH:MM:SS",
  },
  {
    key: "origenCp",
    header: "CP Origen",
    aliases: ["Codigo Postal Origen"],
    scope: "trip",
    required: true,
  },
  {
    key: "origenEstado",
    header: "Estado Origen",
    scope: "trip",
    required: true,
    hint: "Clave c_Estado (p. ej. JAL)",
  },
  { key: "origenMunicipio", header: "Municipio Origen", scope: "trip", required: false },
  { key: "origenColonia", header: "Colonia Origen", scope: "trip", required: false },
  { key: "origenCalle", header: "Calle Origen", scope: "trip", required: false },

  // --- Destino ---
  {
    key: "destinoRfc",
    header: "RFC Destino",
    aliases: ["RFC Destinatario"],
    scope: "trip",
    required: true,
  },
  {
    key: "destinoNombre",
    header: "Nombre Destino",
    aliases: ["Nombre Destinatario"],
    scope: "trip",
    required: false,
  },
  {
    key: "destinoFechaHora",
    header: "Fecha Hora Llegada",
    aliases: ["Fecha y Hora Llegada"],
    scope: "trip",
    required: true,
    hint: "AAAA-MM-DDTHH:MM:SS",
  },
  {
    key: "destinoDistancia",
    header: "Distancia Recorrida KM",
    aliases: ["Distancia Recorrida"],
    scope: "trip",
    required: true,
  },
  {
    key: "destinoCp",
    header: "CP Destino",
    aliases: ["Codigo Postal Destino"],
    scope: "trip",
    required: true,
  },
  { key: "destinoEstado", header: "Estado Destino", scope: "trip", required: true },
  { key: "destinoMunicipio", header: "Municipio Destino", scope: "trip", required: false },
  { key: "destinoColonia", header: "Colonia Destino", scope: "trip", required: false },
  { key: "destinoCalle", header: "Calle Destino", scope: "trip", required: false },

  // --- Autotransporte ---
  {
    key: "permSct",
    header: "Permiso SCT",
    aliases: ["Tipo Permiso SCT"],
    scope: "trip",
    required: true,
    hint: "Clave c_TipoPermiso (p. ej. TPAF01)",
  },
  {
    key: "numPermisoSct",
    header: "Num Permiso SCT",
    aliases: ["Numero Permiso SCT", "Número de Permiso SCT"],
    scope: "trip",
    required: true,
  },
  { key: "placa", header: "Placa", aliases: ["Placas"], scope: "trip", required: true },
  {
    key: "anioModelo",
    header: "Anio Modelo",
    aliases: ["Año Modelo", "Modelo"],
    scope: "trip",
    required: true,
  },
  {
    key: "configVehicular",
    header: "Config Vehicular",
    aliases: ["Configuracion Vehicular", "Configuración Vehicular"],
    scope: "trip",
    required: true,
    hint: "Clave c_ConfigAutotransporte (p. ej. C2)",
  },
  {
    key: "aseguraRespCivil",
    header: "Aseguradora Resp Civil",
    aliases: ["Aseguradora"],
    scope: "trip",
    required: true,
  },
  {
    key: "polizaRespCivil",
    header: "Poliza Resp Civil",
    aliases: ["Póliza Resp Civil", "Numero Poliza"],
    scope: "trip",
    required: true,
  },

  // --- Figura de transporte: operador ---
  { key: "operadorRfc", header: "RFC Operador", scope: "trip", required: true },
  { key: "operadorNombre", header: "Nombre Operador", scope: "trip", required: false },
  {
    key: "operadorLicencia",
    header: "Num Licencia",
    aliases: ["Numero Licencia", "Número de Licencia"],
    scope: "trip",
    required: true,
  },

  // --- Mercancía (una por fila) ---
  {
    key: "mercClaveProdServ",
    header: "Clave Producto Servicio Mercancia",
    aliases: ["Clave ProdServ Mercancia", "Bienes Transportados"],
    scope: "mercancia",
    required: true,
  },
  {
    key: "mercDescripcion",
    header: "Descripcion Mercancia",
    aliases: ["Descripción Mercancia"],
    scope: "mercancia",
    required: true,
  },
  {
    key: "mercCantidad",
    header: "Cantidad Mercancia",
    aliases: ["Cantidad"],
    scope: "mercancia",
    required: true,
  },
  {
    key: "mercClaveUnidad",
    header: "Clave Unidad Mercancia",
    aliases: ["Clave Unidad"],
    scope: "mercancia",
    required: true,
  },
  {
    key: "mercPesoKg",
    header: "Peso Kg Mercancia",
    aliases: ["Peso en Kg", "Peso Bruto"],
    scope: "mercancia",
    required: true,
  },
  { key: "mercValor", header: "Valor Mercancia", scope: "mercancia", required: false },
  {
    key: "mercMaterialPeligroso",
    header: "Material Peligroso",
    scope: "mercancia",
    required: false,
    hint: "Sí o No",
  },
  {
    key: "mercCveMaterialPeligroso",
    header: "Clave Material Peligroso",
    scope: "mercancia",
    required: false,
  },
  {
    key: "mercEmbalaje",
    header: "Embalaje",
    aliases: ["Tipo Embalaje"],
    scope: "mercancia",
    required: false,
  },
] as const satisfies readonly PlantillaColumn[];

export type PlantillaKey = (typeof PLANTILLA_COLUMNAS_MAP)[number]["key"];

/** Valores fijos que la plantilla no pide pero el CFDI requiere. */
export const PLANTILLA_DEFAULTS = {
  cartaPorteVersion: "3.1",
  objetoImp: "02",
  conceptoCantidad: 1,
  unidadPeso: "KGM",
  tipoFiguraOperador: "01",
} as const;

/** Normaliza un encabezado para comparar (sin acentos, minúsculas, sin dobles espacios). */
export function normalizeHeader(header: string): string {
  return header.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Índice: encabezado normalizado (header + aliases) -> key. */
export const HEADER_TO_KEY: ReadonlyMap<string, PlantillaKey> = new Map(
  PLANTILLA_COLUMNAS_MAP.flatMap((entry) => {
    const col: PlantillaColumn = entry;
    const headers = [col.header, ...(col.aliases ?? [])];
    return headers.map((h) => [normalizeHeader(h), col.key as PlantillaKey] as const);
  }),
);
