/**
 * Mapa inverso: ruta de campo de un `ValidationIssue` (rutas del schema Zod de
 * `cartaPorte31Schemas.ts`, ver `assembleFolioGroup`) -> columna de la
 * plantilla Excel. Permite que `ErrorRowEditor` resalte el input correcto en
 * vez de mostrar solo el path técnico.
 *
 * Rutas que no corresponden a un solo campo editable (p. ej. "cartaPorte.ubicaciones"
 * en `cp_origen_igual_destino`) devuelven `null`: el mensaje se muestra igual,
 * sin resaltar un input específico.
 */
import { PLANTILLA_COLUMNAS_MAP, type PlantillaKey } from "@/lib/validators/plantillaColumns";

export interface FieldTarget {
  key: PlantillaKey;
  /** Índice de mercancía (fila del grupo) si el campo es por-mercancía; `undefined` = trip (todas las filas). */
  mercanciaIndex?: number;
}

const VALID_KEYS = new Set<PlantillaKey>(PLANTILLA_COLUMNAS_MAP.map((c) => c.key as PlantillaKey));

/** Rutas fijas (no indexadas por mercancía) que arma `assembleFolioGroup`. */
const TRIP_FIELD_MAP: Record<string, PlantillaKey> = {
  "comprobante.serie": "serie",
  "comprobante.folio": "folio",
  "comprobante.formaPago": "formaPago",
  "comprobante.metodoPago": "metodoPago",
  "comprobante.moneda": "moneda",
  "comprobante.receptor.rfc": "receptorRfc",
  "comprobante.receptor.nombre": "receptorNombre",
  "comprobante.receptor.domicilioFiscalReceptor": "receptorCpFiscal",
  "comprobante.receptor.regimenFiscalReceptor": "receptorRegimen",
  "comprobante.receptor.usoCFDI": "usoCfdi",
  "comprobante.concepto.claveProdServ": "fleteClaveProdServ",
  "comprobante.concepto.claveUnidad": "fleteClaveUnidad",
  "comprobante.concepto.descripcion": "fleteDescripcion",
  "comprobante.concepto.valorUnitario": "fleteValor",
  "cartaPorte.transpInternac": "transpInternac",
  "cartaPorte.totalDistRec": "totalDistRec",
  "cartaPorte.ubicaciones.0.rfcRemitenteDestinatario": "origenRfc",
  "cartaPorte.ubicaciones.0.nombreRemitenteDestinatario": "origenNombre",
  "cartaPorte.ubicaciones.0.fechaHoraSalidaLlegada": "origenFechaHora",
  "cartaPorte.ubicaciones.0.domicilio.codigoPostal": "origenCp",
  "cartaPorte.ubicaciones.0.domicilio.estado": "origenEstado",
  "cartaPorte.ubicaciones.0.domicilio.municipio": "origenMunicipio",
  "cartaPorte.ubicaciones.0.domicilio.colonia": "origenColonia",
  "cartaPorte.ubicaciones.0.domicilio.calle": "origenCalle",
  "cartaPorte.ubicaciones.1.rfcRemitenteDestinatario": "destinoRfc",
  "cartaPorte.ubicaciones.1.nombreRemitenteDestinatario": "destinoNombre",
  "cartaPorte.ubicaciones.1.fechaHoraSalidaLlegada": "destinoFechaHora",
  "cartaPorte.ubicaciones.1.distanciaRecorrida": "destinoDistancia",
  "cartaPorte.ubicaciones.1.domicilio.codigoPostal": "destinoCp",
  "cartaPorte.ubicaciones.1.domicilio.estado": "destinoEstado",
  "cartaPorte.ubicaciones.1.domicilio.municipio": "destinoMunicipio",
  "cartaPorte.ubicaciones.1.domicilio.colonia": "destinoColonia",
  "cartaPorte.ubicaciones.1.domicilio.calle": "destinoCalle",
  "cartaPorte.autotransporte.permSCT": "permSct",
  "cartaPorte.autotransporte.numPermisoSCT": "numPermisoSct",
  "cartaPorte.autotransporte.identificacionVehicular.placaVM": "placa",
  "cartaPorte.autotransporte.identificacionVehicular.anioModeloVM": "anioModelo",
  "cartaPorte.autotransporte.identificacionVehicular.configVehicular": "configVehicular",
  "cartaPorte.autotransporte.seguros.aseguraRespCivil": "aseguraRespCivil",
  "cartaPorte.autotransporte.seguros.polizaRespCivil": "polizaRespCivil",
  "cartaPorte.figuras.0.rfcFigura": "operadorRfc",
  "cartaPorte.figuras.0.nombreFigura": "operadorNombre",
  "cartaPorte.figuras.0.numLicencia": "operadorLicencia",
};

/** Sufijo del campo de mercancía (después de `mercancias.mercancia.{i}.`) -> plantilla key. */
const MERCANCIA_FIELD_SUFFIX_MAP: Record<string, PlantillaKey> = {
  bienesTransp: "mercClaveProdServ",
  descripcion: "mercDescripcion",
  cantidad: "mercCantidad",
  claveUnidad: "mercClaveUnidad",
  pesoEnKg: "mercPesoKg",
  valorMercancia: "mercValor",
  materialPeligroso: "mercMaterialPeligroso",
  cveMaterialPeligroso: "mercCveMaterialPeligroso",
  embalaje: "mercEmbalaje",
};

const MERCANCIA_FIELD_RE = /^cartaPorte\.mercancias\.mercancia\.(\d+)\.(\w+)$/;
const COLUMNA_PREFIX = "columna.";

/** Resuelve la ruta de un `ValidationIssue.field` a su columna de plantilla, si aplica. */
export function resolveFieldTarget(field: string): FieldTarget | null {
  const mercMatch = MERCANCIA_FIELD_RE.exec(field);
  if (mercMatch) {
    const key = MERCANCIA_FIELD_SUFFIX_MAP[mercMatch[2]];
    return key ? { key, mercanciaIndex: Number(mercMatch[1]) } : null;
  }

  if (field.startsWith(COLUMNA_PREFIX)) {
    const key = field.slice(COLUMNA_PREFIX.length) as PlantillaKey;
    return VALID_KEYS.has(key) ? { key } : null;
  }

  const key = TRIP_FIELD_MAP[field];
  return key ? { key } : null;
}
