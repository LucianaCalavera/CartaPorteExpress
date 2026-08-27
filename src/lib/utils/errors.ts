/**
 * Clases de error tipadas y la forma canónica de un problema de validación.
 *
 * `ValidationIssue` es lo que se persiste en `filas_proceso.validation_errors`
 * (array; vacío = fila válida) y lo que la UI muestra en la tabla editable.
 */

/** Códigos estables de error de validación (para agrupar y traducir en UI). */
export type ValidationCode =
  // Formato / estructura
  | "required"
  | "invalid_format"
  | "invalid_type"
  | "out_of_range"
  | "invalid_enum"
  // Reglas de negocio / SAT
  | "rfc_invalid"
  | "rfc_generico_no_permitido"
  | "cp_not_found"
  | "cp_origen_igual_destino"
  | "estado_no_coincide_cp"
  | "clave_prod_serv_not_found"
  | "clave_unidad_not_found"
  | "uso_cfdi_not_found"
  | "regimen_fiscal_not_found"
  | "moneda_not_found"
  | "material_peligroso_requerido"
  | "material_peligroso_no_aplica"
  | "cve_material_peligroso_not_found"
  | "config_vehicular_not_found"
  | "tipo_permiso_not_found"
  | "figura_transporte_not_found"
  | "fecha_fuera_de_ventana"
  | "fecha_llegada_antes_de_salida"
  | "peso_invalido"
  | "peso_total_no_coincide"
  | "num_mercancias_no_coincide"
  | "combustible_no_soportado"
  | "row_group_inconsistente"
  // Genérico
  | "unknown";

/** Un problema concreto en un campo de una fila. */
export interface ValidationIssue {
  /** Ruta al campo, notación de puntos: `ubicaciones.1.domicilio.codigoPostal`. */
  field: string;
  code: ValidationCode;
  /** Mensaje en español (México), apto para mostrar al gerente de tráfico. */
  message: string;
  /** Valor que causó el problema (para pintarlo en el input editable). */
  value?: unknown;
}

/** Error de validación de una o más filas antes de llamar al PAC (Regla #2). */
export class ValidationError extends Error {
  readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[], message = "La fila tiene errores de validación") {
    super(message);
    this.name = "ValidationError";
    this.issues = issues;
  }
}

/** Error devuelto por el PAC (Factura.com) al timbrar. */
export class PacError extends Error {
  readonly pacCode?: string;
  readonly raw?: unknown;

  constructor(message: string, options: { pacCode?: string; raw?: unknown } = {}) {
    super(message);
    this.name = "PacError";
    this.pacCode = options.pacCode;
    this.raw = options.raw;
  }
}

/** Error al enviar por WhatsApp (Meta Cloud API). */
export class WhatsAppError extends Error {
  readonly raw?: unknown;

  constructor(message: string, options: { raw?: unknown } = {}) {
    super(message);
    this.name = "WhatsAppError";
    this.raw = options.raw;
  }
}

/** Helper para construir un `ValidationIssue` con menos ceremonia. */
export function issue(
  field: string,
  code: ValidationCode,
  message: string,
  value?: unknown,
): ValidationIssue {
  return { field, code, message, value };
}
