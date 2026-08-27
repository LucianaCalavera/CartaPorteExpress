/**
 * CORE IP — Schemas Zod del CFDI 4.0 de tipo Ingreso con Complemento
 * Carta Porte 3.1, para transporte terrestre nacional de flotillas chicas.
 *
 * Alcance V1 (ver CLAUDE.md): CFDI de **Ingreso** (el transportista factura el
 * flete). Autotransporte federal. Ubicaciones Origen/Destino (sin intermedios en
 * la plantilla). Una figura de transporte mínima (operador).
 *
 * Estos schemas validan **formato y estructura**. La existencia en catálogos
 * SAT, las ventanas de fecha y la consistencia entre filas del mismo folio se
 * validan en `validationEngine` (que recibe el índice de catálogos y la fecha
 * de referencia, para mantener estos schemas puros y deterministas).
 *
 * Regla de Oro #6: tipado estricto, sin `any`.
 */
import { z } from "zod";
import { es } from "zod/locales";
import {
  ANIO_MODELO_MAX,
  ANIO_MODELO_MIN,
  CLAVE_PROD_SERV_REGEX,
  CLAVE_UNIDAD_REGEX,
  CP_REGEX,
  NUM_PERMISO_SCT_REGEX,
  PESO_KG_MIN,
  PLACA_REGEX,
  RFC_REGEX,
  normalizePlaca,
} from "@/lib/validators/satRegex";
import type { ValidationCode, ValidationIssue } from "@/lib/utils/errors";

// Mensajes por defecto de Zod en español (México).
z.config(es());

// ---------------------------------------------------------------------------
// Helpers de preprocesamiento (Excel entrega strings; limpiamos antes de validar)
// ---------------------------------------------------------------------------

const cleanString = (v: unknown): unknown => (typeof v === "string" ? v.trim() : v);
const cleanUpper = (v: unknown): unknown => (typeof v === "string" ? v.trim().toUpperCase() : v);
const emptyToUndefined = (v: unknown): unknown =>
  v === "" || v === null || v === undefined ? undefined : v;

/** Convierte "1,234.50" / " 12 " / 12 -> number; deja pasar lo no numérico. */
const toNumber = (v: unknown): unknown => {
  const x = emptyToUndefined(v);
  if (x === undefined) return undefined;
  if (typeof x === "number") return x;
  if (typeof x === "string") {
    const n = Number(x.replace(/,/g, "").trim());
    return Number.isNaN(n) ? x : n;
  }
  return x;
};

/** String requerido y recortado. */
const reqString = (msg: string) =>
  z.preprocess(cleanString, z.string({ error: msg }).min(1, { error: msg }));

/** String opcional (vacío -> undefined). */
const optString = () =>
  z.preprocess((v) => emptyToUndefined(cleanString(v)), z.string().optional());

/** String requerido, normalizado a mayúsculas. */
const reqUpper = (msg: string) =>
  z.preprocess(cleanUpper, z.string({ error: msg }).min(1, { error: msg }));

const optUpper = () => z.preprocess((v) => emptyToUndefined(cleanUpper(v)), z.string().optional());

const reqNumber = (msg: string) => z.preprocess(toNumber, z.number({ error: msg }));

const optNumber = () => z.preprocess(toNumber, z.number().optional());

// ---------------------------------------------------------------------------
// Campos SAT reutilizables
// ---------------------------------------------------------------------------

export const rfcSchema = z.preprocess(
  cleanUpper,
  z.string({ error: "RFC requerido" }).regex(RFC_REGEX, { error: "RFC con formato inválido" }),
);

export const codigoPostalSchema = z.preprocess(
  cleanUpper,
  z.string({ error: "Código postal requerido" }).regex(CP_REGEX, {
    error: "El código postal debe tener 5 dígitos",
  }),
);

export const claveProdServSchema = z.preprocess(
  cleanUpper,
  z.string({ error: "Clave de producto/servicio requerida" }).regex(CLAVE_PROD_SERV_REGEX, {
    error: "La clave de producto/servicio debe tener 8 dígitos",
  }),
);

export const claveUnidadSchema = z.preprocess(
  cleanUpper,
  z.string({ error: "Clave de unidad requerida" }).regex(CLAVE_UNIDAD_REGEX, {
    error: "Clave de unidad con formato inválido",
  }),
);

/** Verifica que la cadena represente una fecha-hora real (sin overflow de calendario). */
function isRealDateTime(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d, h, mi, sec] = m.slice(1).map(Number);
  const dt = new Date(y, mo - 1, d, h, mi, sec);
  return (
    dt.getFullYear() === y &&
    dt.getMonth() === mo - 1 &&
    dt.getDate() === d &&
    dt.getHours() === h &&
    dt.getMinutes() === mi &&
    dt.getSeconds() === sec
  );
}

/** Fecha-hora SAT sin zona: `YYYY-MM-DDTHH:MM:SS`. */
export const fechaHoraSatSchema = z.preprocess(
  cleanString,
  z
    .string({ error: "Fecha y hora requeridas" })
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/, {
      error: "Formato de fecha inválido (se espera AAAA-MM-DDTHH:MM:SS)",
    })
    .refine(isRealDateTime, { error: "La fecha no existe en el calendario" }),
);

export const estadoSchema = z.preprocess(
  cleanUpper,
  z.string({ error: "Estado requerido" }).regex(/^[A-ZÑ]{2,4}$/, {
    error: "Clave de estado inválida",
  }),
);

export const paisSchema = z.preprocess(
  (v) => emptyToUndefined(cleanUpper(v)) ?? "MEX",
  z.string().regex(/^[A-Z]{3}$/, { error: "Clave de país inválida (ISO alfa-3)" }),
);

/**
 * Email del cliente. No lo pide el CFDI/Carta Porte del SAT, pero Factura.com
 * lo exige para registrar al receptor como cliente antes de timbrar (ver
 * `lib/pac/pacMapper.ts`).
 */
export const emailSchema = z.preprocess(
  cleanString,
  z.string({ error: "El email del cliente es obligatorio" }).email({
    error: "El email del cliente tiene un formato inválido",
  }),
);

// ---------------------------------------------------------------------------
// Domicilio
// ---------------------------------------------------------------------------

export const domicilioSchema = z.object({
  calle: optString(),
  numExterior: optString(),
  numInterior: optString(),
  colonia: optUpper(),
  localidad: optUpper(),
  municipio: optUpper(),
  referencia: optString(),
  estado: estadoSchema,
  pais: paisSchema,
  codigoPostal: codigoPostalSchema,
});
export type Domicilio = z.infer<typeof domicilioSchema>;

// ---------------------------------------------------------------------------
// Ubicaciones
// ---------------------------------------------------------------------------

export const tipoUbicacionSchema = z.enum(["Origen", "Destino"], {
  error: "Tipo de ubicación inválido (Origen | Destino)",
});

export const ubicacionSchema = z
  .object({
    tipoUbicacion: tipoUbicacionSchema,
    idUbicacion: optUpper(),
    rfcRemitenteDestinatario: rfcSchema,
    nombreRemitenteDestinatario: optString(),
    fechaHoraSalidaLlegada: fechaHoraSatSchema,
    /** Requerida para Destino: km recorridos hasta esa ubicación. */
    distanciaRecorrida: optNumber().pipe(
      z.number().positive({ error: "La distancia recorrida debe ser mayor a 0" }).optional(),
    ),
    domicilio: domicilioSchema,
  })
  .refine((u) => u.tipoUbicacion !== "Destino" || typeof u.distanciaRecorrida === "number", {
    error: "La distancia recorrida es obligatoria en el Destino",
    path: ["distanciaRecorrida"],
  });
export type Ubicacion = z.infer<typeof ubicacionSchema>;

// ---------------------------------------------------------------------------
// Mercancías
// ---------------------------------------------------------------------------

export const materialPeligrosoFlagSchema = z.enum(["Sí", "No"], {
  error: 'Material peligroso debe ser "Sí" o "No"',
});

export const mercanciaSchema = z
  .object({
    bienesTransp: claveProdServSchema,
    descripcion: reqString("La descripción de la mercancía es obligatoria"),
    cantidad: reqNumber("La cantidad es obligatoria").pipe(
      z.number().positive({ error: "La cantidad debe ser mayor a 0" }),
    ),
    claveUnidad: claveUnidadSchema,
    pesoEnKg: reqNumber("El peso en kg es obligatorio").pipe(
      z.number().gte(PESO_KG_MIN, { error: "El peso en kg debe ser mayor a 0" }),
    ),
    valorMercancia: optNumber().pipe(
      z
        .number()
        .nonnegative({ error: "El valor de la mercancía no puede ser negativo" })
        .optional(),
    ),
    moneda: z
      .preprocess((v) => emptyToUndefined(cleanUpper(v)) ?? "MXN", z.string().length(3))
      .optional(),
    materialPeligroso: z.preprocess(emptyToUndefined, materialPeligrosoFlagSchema.optional()),
    cveMaterialPeligroso: optUpper(),
    embalaje: optUpper(),
    descripEmbalaje: optString(),
  })
  .superRefine((m, ctx) => {
    if (m.materialPeligroso === "Sí") {
      if (!m.cveMaterialPeligroso) {
        addAppIssue(
          ctx,
          ["cveMaterialPeligroso"],
          "material_peligroso_requerido",
          "La clave de material peligroso es obligatoria cuando aplica",
        );
      }
      if (!m.embalaje) {
        addAppIssue(
          ctx,
          ["embalaje"],
          "material_peligroso_requerido",
          "El tipo de embalaje es obligatorio para material peligroso",
        );
      }
    }
    if (m.materialPeligroso !== "Sí" && m.cveMaterialPeligroso) {
      addAppIssue(
        ctx,
        ["cveMaterialPeligroso"],
        "material_peligroso_no_aplica",
        'Se indicó clave de material peligroso pero Material Peligroso no es "Sí"',
      );
    }
  });
export type Mercancia = z.infer<typeof mercanciaSchema>;

export const mercanciasSchema = z.object({
  pesoBrutoTotal: reqNumber("El peso bruto total es obligatorio").pipe(
    z.number().positive({ error: "El peso bruto total debe ser mayor a 0" }),
  ),
  unidadPeso: reqUpper("La unidad de peso es obligatoria"),
  numTotalMercancias: reqNumber("El número total de mercancías es obligatorio").pipe(
    z.number().int({ error: "Debe ser un entero" }).positive({ error: "Debe ser mayor a 0" }),
  ),
  mercancia: z.array(mercanciaSchema).min(1, { error: "Se requiere al menos una mercancía" }),
});
export type Mercancias = z.infer<typeof mercanciasSchema>;

// ---------------------------------------------------------------------------
// Autotransporte
// ---------------------------------------------------------------------------

export const identificacionVehicularSchema = z.object({
  placaVM: z.preprocess(
    normalizePlaca,
    z.string({ error: "Placa requerida" }).regex(PLACA_REGEX, {
      error: "Placa inválida (5 a 7 caracteres, sin guiones ni espacios)",
    }),
  ),
  anioModeloVM: reqNumber("El año modelo es obligatorio").pipe(
    z
      .number()
      .int({ error: "El año modelo debe ser un entero" })
      .gte(ANIO_MODELO_MIN, { error: `El año modelo no puede ser menor a ${ANIO_MODELO_MIN}` })
      .lte(ANIO_MODELO_MAX, { error: `El año modelo no puede ser mayor a ${ANIO_MODELO_MAX}` }),
  ),
  configVehicular: reqUpper("La configuración vehicular es obligatoria"),
  pesoBrutoVehicular: optNumber().pipe(z.number().positive().optional()),
});

export const segurosSchema = z.object({
  aseguraRespCivil: reqString("La aseguradora de responsabilidad civil es obligatoria"),
  polizaRespCivil: reqString("El número de póliza de responsabilidad civil es obligatorio"),
  aseguraMedAmbiente: optString(),
  polizaMedAmbiente: optString(),
  aseguraCarga: optString(),
  polizaCarga: optString(),
  primaSeguro: optNumber().pipe(z.number().nonnegative().optional()),
});

export const autotransporteSchema = z.object({
  permSCT: reqUpper("El tipo de permiso SCT es obligatorio"),
  numPermisoSCT: z.preprocess(
    cleanUpper,
    z.string({ error: "El número de permiso SCT es obligatorio" }).regex(NUM_PERMISO_SCT_REGEX, {
      error: "Número de permiso SCT con formato inválido",
    }),
  ),
  identificacionVehicular: identificacionVehicularSchema,
  seguros: segurosSchema,
});
export type Autotransporte = z.infer<typeof autotransporteSchema>;

// ---------------------------------------------------------------------------
// Figuras de transporte
// ---------------------------------------------------------------------------

export const figuraTransporteSchema = z
  .object({
    tipoFigura: reqUpper("El tipo de figura de transporte es obligatorio"),
    rfcFigura: z.preprocess(emptyToUndefined, rfcSchema.optional()),
    numLicencia: optUpper(),
    nombreFigura: optString(),
    numRegIdTribFigura: optUpper(),
    residenciaFiscalFigura: optUpper(),
    domicilio: domicilioSchema.optional(),
  })
  .superRefine((f, ctx) => {
    // 01 = Operador -> licencia obligatoria.
    if (f.tipoFigura === "01" && !f.numLicencia) {
      addAppIssue(
        ctx,
        ["numLicencia"],
        "required",
        "El número de licencia es obligatorio para el operador",
      );
    }
    // Operador nacional -> RFC obligatorio.
    if (f.tipoFigura === "01" && !f.rfcFigura && !f.numRegIdTribFigura) {
      addAppIssue(
        ctx,
        ["rfcFigura"],
        "required",
        "El operador requiere RFC (o registro tributario si es extranjero)",
      );
    }
  });
export type FiguraTransporte = z.infer<typeof figuraTransporteSchema>;

// ---------------------------------------------------------------------------
// Complemento Carta Porte 3.1
// ---------------------------------------------------------------------------

export const cartaPorte31Schema = z
  .object({
    version: z.literal("3.1"),
    transpInternac: z.enum(["Sí", "No"], {
      error: 'Transporte internacional debe ser "Sí" o "No"',
    }),
    entradaSalidaMerc: z.preprocess(emptyToUndefined, z.enum(["Entrada", "Salida"]).optional()),
    paisOrigenDestino: optUpper(),
    viaEntradaSalida: optUpper(),
    totalDistRec: reqNumber("La distancia total recorrida es obligatoria").pipe(
      z.number().positive({ error: "La distancia total recorrida debe ser mayor a 0" }),
    ),
    ubicaciones: z.array(ubicacionSchema).min(2, {
      error: "Se requieren al menos dos ubicaciones (origen y destino)",
    }),
    mercancias: mercanciasSchema,
    autotransporte: autotransporteSchema,
    figuras: z.array(figuraTransporteSchema).min(1, {
      error: "Se requiere al menos una figura de transporte",
    }),
  })
  .superRefine((cp, ctx) => {
    const origenes = cp.ubicaciones.filter((u) => u.tipoUbicacion === "Origen");
    const destinos = cp.ubicaciones.filter((u) => u.tipoUbicacion === "Destino");
    if (origenes.length !== 1) {
      addAppIssue(ctx, ["ubicaciones"], "required", "Debe haber exactamente un Origen");
    }
    if (destinos.length < 1) {
      addAppIssue(ctx, ["ubicaciones"], "required", "Debe haber al menos un Destino");
    }
    if (cp.transpInternac === "Sí" && !cp.paisOrigenDestino) {
      addAppIssue(
        ctx,
        ["paisOrigenDestino"],
        "required",
        "País de origen/destino es obligatorio en transporte internacional",
      );
    }
  });
export type CartaPorte31 = z.infer<typeof cartaPorte31Schema>;

// ---------------------------------------------------------------------------
// Comprobante (CFDI 4.0 Ingreso) + receptor + concepto de flete
// ---------------------------------------------------------------------------

export const receptorSchema = z.object({
  rfc: rfcSchema,
  nombre: reqString("El nombre o razón social del receptor es obligatorio"),
  email: emailSchema,
  domicilioFiscalReceptor: codigoPostalSchema,
  regimenFiscalReceptor: reqUpper("El régimen fiscal del receptor es obligatorio"),
  usoCFDI: reqUpper("El uso de CFDI es obligatorio"),
});
export type Receptor = z.infer<typeof receptorSchema>;

export const conceptoFleteSchema = z.object({
  claveProdServ: claveProdServSchema,
  claveUnidad: claveUnidadSchema,
  descripcion: reqString("La descripción del servicio de transporte es obligatoria"),
  cantidad: z.preprocess((v) => toNumber(v) ?? 1, z.number().positive()),
  valorUnitario: reqNumber("El valor unitario del flete es obligatorio").pipe(
    z.number().positive({ error: "El valor del flete debe ser mayor a 0" }),
  ),
  descuento: optNumber().pipe(z.number().nonnegative().optional()),
  objetoImp: z.preprocess((v) => emptyToUndefined(cleanUpper(v)) ?? "02", z.string()),
});

export const comprobanteIngresoSchema = z.object({
  serie: optUpper(),
  folio: reqString("El folio del viaje es obligatorio"),
  formaPago: reqUpper("La forma de pago es obligatoria"),
  metodoPago: z.enum(["PUE", "PPD"], { error: "Método de pago debe ser PUE o PPD" }),
  moneda: z.preprocess((v) => emptyToUndefined(cleanUpper(v)) ?? "MXN", z.string().length(3)),
  tipoCambio: optNumber().pipe(z.number().positive().optional()),
  receptor: receptorSchema,
  concepto: conceptoFleteSchema,
});
export type ComprobanteIngreso = z.infer<typeof comprobanteIngresoSchema>;

// ---------------------------------------------------------------------------
// CFDI Ingreso + Carta Porte — objeto ensamblado a validar por fila-folio
// ---------------------------------------------------------------------------

export const cfdiCartaPorteIngresoSchema = z.object({
  comprobante: comprobanteIngresoSchema,
  cartaPorte: cartaPorte31Schema,
});
export type CfdiCartaPorteIngreso = z.infer<typeof cfdiCartaPorteIngresoSchema>;

/** Entrada cruda (pre-validación) — todo opcional/unknown, la arma el mapper. */
export type CfdiCartaPorteIngresoInput = z.input<typeof cfdiCartaPorteIngresoSchema>;

// ---------------------------------------------------------------------------
// Puente Zod -> ValidationIssue
// ---------------------------------------------------------------------------

interface AppIssueParams {
  appCode: ValidationCode;
}

/** Agrega un issue custom que transporta un `ValidationCode` estable. */
function addAppIssue(
  ctx: z.core.$RefinementCtx,
  path: (string | number)[],
  appCode: ValidationCode,
  message: string,
): void {
  ctx.addIssue({ code: "custom", message, path, params: { appCode } satisfies AppIssueParams });
}

/** Traduce el código de issue de Zod a nuestro `ValidationCode`. */
function mapZodIssue(issue: z.core.$ZodIssue): ValidationCode {
  if (issue.code === "custom") {
    const params = issue.params as Partial<AppIssueParams> | undefined;
    return params?.appCode ?? "unknown";
  }
  switch (issue.code) {
    case "invalid_type":
      return issue.input === undefined || issue.input === null ? "required" : "invalid_type";
    case "too_small":
    case "too_big":
    case "not_multiple_of":
      return "out_of_range";
    case "invalid_format":
    case "invalid_key":
      return "invalid_format";
    case "invalid_value":
    case "invalid_union":
      return "invalid_enum";
    default:
      return "unknown";
  }
}

/** Convierte un `ZodError` en la lista canónica de `ValidationIssue`. */
export function zodErrorToValidationIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    field: issue.path.map(String).join("."),
    code: mapZodIssue(issue),
    message: issue.message,
    value: "input" in issue ? issue.input : undefined,
  }));
}
