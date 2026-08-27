/**
 * Expresiones regulares y constantes de formato del SAT usadas por los schemas
 * de Carta Porte 3.1. Sólo formato — la existencia en catálogo se valida en
 * `validationEngine` con el índice de catálogos inyectado.
 */

/** RFC persona moral (3 letras) o física (4 letras) + fecha + homoclave. */
export const RFC_REGEX = /^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{2})([A\d])$/;

/** RFC genérico nacional (público en general). */
export const RFC_GENERICO_NACIONAL = "XAXX010101000";

/** RFC genérico de operaciones con extranjeros. */
export const RFC_GENERICO_EXTRANJERO = "XEXX010101000";

/** Código postal mexicano: 5 dígitos. */
export const CP_REGEX = /^\d{5}$/;

/**
 * Placa de autotransporte para el complemento: sin guiones ni espacios,
 * alfanumérica, 5 a 7 caracteres (Regla del SAT para `PlacaVM`).
 */
export const PLACA_REGEX = /^[A-Z0-9]{5,7}$/;

/** Número de permiso SCT: alfanumérico con guiones/diagonales, hasta 50. */
export const NUM_PERMISO_SCT_REGEX = /^[A-Z0-9/\- ]{1,50}$/;

/** Clave de producto/servicio SAT: 8 dígitos. */
export const CLAVE_PROD_SERV_REGEX = /^\d{8}$/;

/** Clave de unidad SAT: 1 a 3 caracteres alfanuméricos en mayúscula. */
export const CLAVE_UNIDAD_REGEX = /^[A-Z0-9]{1,3}$/;

/** Año modelo del vehículo: rango razonable para una flotilla en operación. */
export const ANIO_MODELO_MIN = 1950;
export const ANIO_MODELO_MAX = new Date().getFullYear() + 2;

/** Peso mínimo significativo en kg (evita PesoBruto = 0). */
export const PESO_KG_MIN = 0.001;

/**
 * Ventana válida para `FechaHoraSalidaLlegada` del Origen respecto a la fecha
 * de referencia (hoy). El SAT tolera timbrar con algo de atraso, pero no fechas
 * lejanas ni muy adelantadas.
 */
export const CFDI_FECHA_MAX_DIAS_PASADO = 3;
export const CFDI_FECHA_MAX_DIAS_FUTURO = 30;

/** Normaliza a mayúsculas y sin espacios extremos (RFC, CP, placa, claves). */
export function upperTrim(value: unknown): unknown {
  return typeof value === "string" ? value.trim().toUpperCase() : value;
}

/** Sólo recorta espacios extremos. */
export function trim(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

/** Quita separadores comunes de una placa antes de validar. */
export function normalizePlaca(value: unknown): unknown {
  return typeof value === "string" ? value.replace(/[\s-]/g, "").toUpperCase() : value;
}

/** True si el RFC es uno de los genéricos del SAT. */
export function isRfcGenerico(rfc: string): boolean {
  return rfc === RFC_GENERICO_NACIONAL || rfc === RFC_GENERICO_EXTRANJERO;
}
