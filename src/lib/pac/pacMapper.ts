/**
 * Objeto interno validado (Zod, Sprint 1) -> payload JSON de Factura.com.
 * Función pura: sin I/O, sin `Date.now()` implícito. Los catálogos (para
 * resolver la descripción de `Unidad`) y el UID del receptor ya resuelto se
 * reciben como parámetros — el mapper no llama a Supabase ni al PAC.
 *
 * Contrato verificado contra `factura.com/apidocs` (ver `facturacomTypes.ts`).
 *
 * **Límite conocido de V1:** el cálculo de impuestos asume IVA 16% general
 * (`ObjetoImp: "02"`) sobre el flete — el caso típico de flete doméstico, que
 * es el único escenario que cubre la plantilla actual. Retenciones, tasa 0% y
 * exento no están soportados; si `ObjetoImp !== "02"` no se manda `Impuestos`.
 */
import type {
  CartaPorte31,
  CfdiCartaPorteIngreso,
  Domicilio,
  FiguraTransporte,
  Receptor,
  Ubicacion,
} from "@/lib/validators/cartaPorte31Schemas";
import type { CatalogIndex } from "@/lib/catalogos/catalogIndex";
import type { EmisorProfile } from "@/types/cpe";
import type {
  FacturacomAutotransporte,
  FacturacomCartaPorte,
  FacturacomClientPayload,
  FacturacomConcepto,
  FacturacomCreateCfdiPayload,
  FacturacomDomicilio,
  FacturacomFigura,
  FacturacomMercancia,
  FacturacomMercancias,
  FacturacomUbicacion,
} from "@/lib/pac/facturacomTypes";

const IVA_TASA_GENERAL = 0.16;

const round2 = (n: number): number => Math.round(n * 100) / 100;

function mapDomicilio(d: Domicilio): FacturacomDomicilio {
  return {
    Calle: d.calle,
    NumeroExterior: d.numExterior,
    NumeroInterior: d.numInterior,
    Colonia: d.colonia,
    Localidad: d.localidad,
    Referencia: d.referencia,
    Municipio: d.municipio,
    Estado: d.estado,
    Pais: d.pais,
    CodigoPostal: d.codigoPostal,
  };
}

/** `IDUbicacion` no lo pide la plantilla; se genera determinísticamente (OR/DE + 6 dígitos). */
function mapUbicaciones(ubicaciones: Ubicacion[]): { Ubicacion: FacturacomUbicacion[] } {
  let destinoIndex = 0;
  const list = ubicaciones.map((u) => {
    const prefix = u.tipoUbicacion === "Origen" ? "OR" : "DE";
    const index = u.tipoUbicacion === "Origen" ? 1 : ++destinoIndex;
    return {
      TipoUbicacion: u.tipoUbicacion,
      IDUbicacion: u.idUbicacion ?? `${prefix}${String(index).padStart(6, "0")}`,
      RFCRemitenteDestinatario: u.rfcRemitenteDestinatario,
      NombreRemitenteDestinatario: u.nombreRemitenteDestinatario,
      FechaHoraSalidaLlegada: u.fechaHoraSalidaLlegada,
      DistanciaRecorrida: u.distanciaRecorrida,
      Domicilio: mapDomicilio(u.domicilio),
    } satisfies FacturacomUbicacion;
  });
  return { Ubicacion: list };
}

function mapMercancia(m: CartaPorte31["mercancias"]["mercancia"][number]): FacturacomMercancia {
  return {
    BienesTransp: m.bienesTransp,
    Descripcion: m.descripcion,
    Cantidad: m.cantidad,
    ClaveUnidad: m.claveUnidad,
    PesoEnKg: m.pesoEnKg,
    ValorMercancia: m.valorMercancia,
    Moneda: m.moneda,
    MaterialPeligroso: m.materialPeligroso,
    CveMaterialPeligroso: m.cveMaterialPeligroso,
    Embalaje: m.embalaje,
    DescripEmbalaje: m.descripEmbalaje,
  };
}

function mapAutotransporte(a: CartaPorte31["autotransporte"]): FacturacomAutotransporte {
  return {
    PermSCT: a.permSCT,
    NumPermisoSCT: a.numPermisoSCT,
    IdentificacionVehicular: {
      ConfigVehicular: a.identificacionVehicular.configVehicular,
      PesoBrutoVehicular: a.identificacionVehicular.pesoBrutoVehicular,
      PlacaVM: a.identificacionVehicular.placaVM,
      AnioModeloVM: a.identificacionVehicular.anioModeloVM,
    },
    Seguros: {
      AseguraRespCivil: a.seguros.aseguraRespCivil,
      PolizaRespCivil: a.seguros.polizaRespCivil,
      AseguraMedAmbiente: a.seguros.aseguraMedAmbiente,
      PolizaMedAmbiente: a.seguros.polizaMedAmbiente,
      AseguraCarga: a.seguros.aseguraCarga,
      PolizaCarga: a.seguros.polizaCarga,
      PrimaSeguro: a.seguros.primaSeguro,
    },
  };
}

/** `Autotransporte` va anidado dentro de `Mercancias` — así es el XSD del SAT, no un capricho del PAC. */
function mapMercancias(cp: CartaPorte31): FacturacomMercancias {
  return {
    PesoBrutoTotal: cp.mercancias.pesoBrutoTotal,
    UnidadPeso: cp.mercancias.unidadPeso,
    NumTotalMercancias: cp.mercancias.numTotalMercancias,
    Mercancia: cp.mercancias.mercancia.map(mapMercancia),
    Autotransporte: mapAutotransporte(cp.autotransporte),
  };
}

function mapFigura(f: FiguraTransporte): FacturacomFigura {
  return {
    TipoFigura: f.tipoFigura,
    NombreFigura: f.nombreFigura,
    RFCFigura: f.rfcFigura,
    NumLicencia: f.numLicencia,
    NumRegIdTribFigura: f.numRegIdTribFigura,
    ResidenciaFiscalFigura: f.residenciaFiscalFigura,
    Domicilio: f.domicilio ? mapDomicilio(f.domicilio) : undefined,
  };
}

function mapCartaPorte(cp: CartaPorte31): FacturacomCartaPorte {
  return {
    Version: cp.version,
    TranspInternac: cp.transpInternac,
    EntradaSalidaMerc: cp.entradaSalidaMerc,
    PaisOrigenDestino: cp.paisOrigenDestino,
    ViaEntradaSalida: cp.viaEntradaSalida,
    TotalDistRec: cp.totalDistRec,
    Ubicaciones: mapUbicaciones(cp.ubicaciones),
    Mercancias: mapMercancias(cp),
    FiguraTransporte: { TiposFigura: cp.figuras.map(mapFigura) },
  };
}

/** IVA 16% general si el concepto es objeto de impuesto (`ObjetoImp: "02"`). Ver límite de V1 arriba. */
function buildImpuestos(base: number, objetoImp: string): FacturacomConcepto["Impuestos"] {
  if (objetoImp !== "02") return undefined;
  const baseRedondeada = round2(base);
  return {
    Traslados: [
      {
        Base: baseRedondeada,
        Impuesto: "002",
        TipoFactor: "Tasa",
        TasaOCuota: "0.160000",
        Importe: round2(baseRedondeada * IVA_TASA_GENERAL),
      },
    ],
    Retenidos: [],
    Locales: [],
  };
}

function mapConcepto(
  concepto: CfdiCartaPorteIngreso["comprobante"]["concepto"],
  catalogs: CatalogIndex,
): FacturacomConcepto {
  const base = round2(concepto.cantidad * concepto.valorUnitario - (concepto.descuento ?? 0));
  return {
    ClaveProdServ: concepto.claveProdServ,
    Cantidad: concepto.cantidad,
    ClaveUnidad: concepto.claveUnidad,
    Unidad: catalogs.unidad.get(concepto.claveUnidad)?.description ?? concepto.claveUnidad,
    ValorUnitario: concepto.valorUnitario,
    Descripcion: concepto.descripcion,
    Descuento: concepto.descuento,
    ObjetoImp: concepto.objetoImp,
    Impuestos: buildImpuestos(base, concepto.objetoImp),
  };
}

export interface BuildFacturacomCfdiPayloadOptions {
  /** UID del receptor ya registrado como cliente en Factura.com (`findOrCreateClient`). */
  receptorUid: string;
  emisorProfile: EmisorProfile;
  catalogs: CatalogIndex;
}

export function buildFacturacomCfdiPayload(
  cfdi: CfdiCartaPorteIngreso,
  opts: BuildFacturacomCfdiPayloadOptions,
): FacturacomCreateCfdiPayload {
  const { comprobante, cartaPorte } = cfdi;
  return {
    Receptor: { UID: opts.receptorUid },
    TipoDocumento: "carta_porte_ingreso",
    RegimenFiscal: opts.emisorProfile.regimenFiscalId ?? undefined,
    LugarExpedicion: opts.emisorProfile.cpEmisor ?? undefined,
    // PENDIENTE: la doc pública de Factura.com describe `Serie` como "number
    // (series ID)", no como el string alfanumérico típico de CFDI. Se manda
    // el string tal cual mientras no tengamos cuenta sandbox para confirmar
    // el formato real que espera el endpoint.
    Serie: comprobante.serie,
    Conceptos: [mapConcepto(comprobante.concepto, opts.catalogs)],
    UsoCFDI: comprobante.receptor.usoCFDI,
    FormaPago: comprobante.formaPago,
    MetodoPago: comprobante.metodoPago,
    Moneda: comprobante.moneda,
    TipoCambio: comprobante.tipoCambio,
    CartaPorte: mapCartaPorte(cartaPorte),
  };
}

/** Payload para registrar/buscar al receptor como cliente en Factura.com. */
export function buildFacturacomClientPayload(receptor: Receptor): FacturacomClientPayload {
  return {
    rfc: receptor.rfc,
    razons: receptor.nombre,
    codpos: receptor.domicilioFiscalReceptor,
    email: receptor.email,
    regimen: receptor.regimenFiscalReceptor,
    pais: "MEX",
    usocfdi: receptor.usoCFDI,
  };
}
