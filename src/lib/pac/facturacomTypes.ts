/**
 * Tipos del contrato de Factura.com (PAC), verificados contra su documentación
 * pública (`factura.com/apidocs`) el 2026-08-27 — Regla de Oro #12. No asumidos
 * de memoria.
 *
 * Hallazgos relevantes (ver resumen en el chat / PR):
 * - No existe endpoint de timbrado batch: `POST /v4/cfdi40/create` timbra UN
 *   CFDI por request, de forma síncrona (la respuesta ya trae el UUID/SAT).
 * - El receptor debe existir como "cliente" (`POST /v1/clients/create` o
 *   `GET /v1/clients/{RFC}`) para obtener un `UID` — el CFDI solo referencia
 *   ese UID, no manda los datos del receptor inline.
 * - Sin mecanismo de idempotencia documentado a nivel PAC: la única protección
 *   contra doble timbrado es la nuestra (Regla de Oro #3).
 * - Auth por headers: `F-Api-Key`, `F-Secret-Key` (por tenant), `F-PLUGIN`
 *   (fijo de la integración), `Content-Type: application/json`.
 * - Dentro de `CartaPorte.Mercancias`, `Autotransporte` (y las alternativas
 *   `TransporteMaritimo`/`Aereo`/`Ferroviario`) van ANIDADOS (así es también
 *   en el XSD oficial del SAT, no es un capricho de Factura.com).
 */

export interface FacturacomCredentials {
  apiKey: string;
  secretKey: string;
  /** Header `F-PLUGIN`: fijo por integración, no por tenant. */
  plugin: string;
  /** `https://sandbox.factura.com/api` o `https://api.factura.com`. */
  baseUrl: string;
}

// ---------------------------------------------------------------------------
// Clientes (receptor debe pre-existir para obtener un UID)
// ---------------------------------------------------------------------------

export interface FacturacomClientPayload {
  rfc: string;
  razons: string;
  codpos: string;
  email: string;
  regimen: string;
  pais: string;
  usocfdi?: string;
  calle?: string;
  colonia?: string;
  estado?: string;
}

export interface FacturacomClientData {
  UID: string;
  RazonSocial?: string;
  RFC?: string;
}

export interface FacturacomClientResponse {
  status: "success" | "error";
  Data?: FacturacomClientData;
  message?: string;
}

// ---------------------------------------------------------------------------
// CFDI 4.0 + Carta Porte 3.1 — payload de creación/timbrado
// ---------------------------------------------------------------------------

export interface FacturacomDomicilio {
  Calle?: string;
  NumeroExterior?: string;
  NumeroInterior?: string;
  Colonia?: string;
  Localidad?: string;
  Referencia?: string;
  Municipio?: string;
  Estado: string;
  Pais: string;
  CodigoPostal: string;
}

export interface FacturacomUbicacion {
  TipoUbicacion: "Origen" | "Destino";
  IDUbicacion: string;
  RFCRemitenteDestinatario: string;
  NombreRemitenteDestinatario?: string;
  FechaHoraSalidaLlegada: string;
  DistanciaRecorrida?: number;
  Domicilio: FacturacomDomicilio;
}

export interface FacturacomMercancia {
  BienesTransp: string;
  Descripcion: string;
  Cantidad: number;
  ClaveUnidad: string;
  PesoEnKg: number;
  ValorMercancia?: number;
  Moneda?: string;
  MaterialPeligroso?: "Sí" | "No";
  CveMaterialPeligroso?: string;
  Embalaje?: string;
  DescripEmbalaje?: string;
}

export interface FacturacomIdentificacionVehicular {
  ConfigVehicular: string;
  PesoBrutoVehicular?: number;
  PlacaVM: string;
  AnioModeloVM: number;
}

export interface FacturacomSeguros {
  AseguraRespCivil: string;
  PolizaRespCivil: string;
  AseguraMedAmbiente?: string;
  PolizaMedAmbiente?: string;
  AseguraCarga?: string;
  PolizaCarga?: string;
  PrimaSeguro?: number;
}

export interface FacturacomAutotransporte {
  PermSCT: string;
  NumPermisoSCT: string;
  IdentificacionVehicular: FacturacomIdentificacionVehicular;
  Seguros: FacturacomSeguros;
}

/** Anidado dentro de `Mercancias`, no de `CartaPorte` (así es el XSD del SAT). */
export interface FacturacomMercancias {
  PesoBrutoTotal: number;
  UnidadPeso: string;
  NumTotalMercancias: number;
  Mercancia: FacturacomMercancia[];
  Autotransporte: FacturacomAutotransporte;
}

export interface FacturacomFigura {
  TipoFigura: string;
  NombreFigura?: string;
  RFCFigura?: string;
  NumLicencia?: string;
  NumRegIdTribFigura?: string;
  ResidenciaFiscalFigura?: string;
  Domicilio?: FacturacomDomicilio;
}

export interface FacturacomCartaPorte {
  Version: "3.1";
  TranspInternac: "Sí" | "No";
  EntradaSalidaMerc?: "Entrada" | "Salida";
  PaisOrigenDestino?: string;
  ViaEntradaSalida?: string;
  TotalDistRec: number;
  Ubicaciones: { Ubicacion: FacturacomUbicacion[] };
  Mercancias: FacturacomMercancias;
  FiguraTransporte: { TiposFigura: FacturacomFigura[] };
}

export interface FacturacomTraslado {
  Base: number;
  Impuesto: string;
  TipoFactor: "Tasa" | "Cuota" | "Exento";
  TasaOCuota: string;
  Importe: number;
}

export interface FacturacomConcepto {
  ClaveProdServ: string;
  Cantidad: number;
  ClaveUnidad: string;
  Unidad: string;
  ValorUnitario: number;
  Descripcion: string;
  Descuento?: number;
  ObjetoImp: string;
  Impuestos?: {
    Traslados: FacturacomTraslado[];
    Retenidos: [];
    Locales: [];
  };
}

export interface FacturacomCreateCfdiPayload {
  Receptor: { UID: string };
  TipoDocumento: "carta_porte_ingreso";
  RegimenFiscal?: string;
  LugarExpedicion?: string;
  Serie?: string;
  Conceptos: FacturacomConcepto[];
  UsoCFDI: string;
  FormaPago: string;
  MetodoPago: "PUE" | "PPD";
  Moneda: string;
  TipoCambio?: number;
  CartaPorte: FacturacomCartaPorte;
}

export interface FacturacomSatData {
  UUID: string;
  FechaTimbrado: string;
  NoCertificadoSAT: string;
  Version: string;
  SelloSAT: string;
  SelloCFD: string;
}

export interface FacturacomCreateCfdiSuccess {
  response: "success";
  message: string;
  UUID: string;
  uid: string;
  invoice_uid: string;
  SAT: FacturacomSatData;
  INV?: { Serie?: string; Folio?: number };
}

export interface FacturacomCreateCfdiError {
  response: "error";
  message: { message: string; messageDetail?: string; data?: unknown; status?: string } | string;
  xmlerror?: string;
}

export type FacturacomCreateCfdiResponse = FacturacomCreateCfdiSuccess | FacturacomCreateCfdiError;

export function isFacturacomSuccess(
  res: FacturacomCreateCfdiResponse,
): res is FacturacomCreateCfdiSuccess {
  return res.response === "success";
}
