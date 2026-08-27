/**
 * Tipos de dominio internos de CartaPorteExpress.
 *
 * Se derivan de los schemas Zod (`z.infer`) donde aplica, para tener una sola
 * fuente de verdad. `database.ts` cubre la forma de las tablas; esto cubre la
 * forma del negocio (proceso de carga, fila validada, resultado de timbre).
 */
import type {
  CfdiCartaPorteIngreso,
  CfdiCartaPorteIngresoInput,
} from "@/lib/validators/cartaPorte31Schemas";
import type { ValidationIssue } from "@/lib/utils/errors";

export type { CfdiCartaPorteIngreso, CfdiCartaPorteIngresoInput };

/** Estado de una fila a lo largo del pipeline (coincide con `filas_proceso.status`). */
export type FilaStatus =
  "pending" | "valid" | "invalid" | "stamping" | "stamped" | "failed" | "cancelled";

/** Estado de un proceso de carga (coincide con `procesos.status`). */
export type ProcesoStatus =
  "uploaded" | "validating" | "validated" | "stamping" | "completed" | "failed";

/** Una fila del Excel tal cual se leyó (claves = encabezados de la plantilla). */
export type RawExcelRow = Record<string, string | number | boolean | null>;

/**
 * Grupo de filas del Excel que comparten `folio` de viaje y que se ensamblan en
 * un solo CFDI (decisión de producto: "filas agrupadas por folio").
 */
export interface FolioGroup {
  folio: string;
  /** Números de fila del Excel (1-based) que componen el grupo. */
  rowNumbers: number[];
  rows: RawExcelRow[];
}

/** Resultado de validar un folio: válido -> datos listos para el PAC mapper. */
export interface FilaValida {
  folio: string;
  rowNumbers: number[];
  data: CfdiCartaPorteIngreso;
}

/** Resultado de validar un folio: inválido -> errores para la UI editable. */
export interface FilaInvalida {
  folio: string;
  rowNumbers: number[];
  issues: ValidationIssue[];
  /** Datos crudos ensamblados (para prellenar el editor de errores). */
  raw: CfdiCartaPorteIngresoInput;
}

/** Salida del motor de validación (función pura, sin side effects). */
export interface ValidationResult {
  valid: FilaValida[];
  invalid: FilaInvalida[];
  /** Conteo de errores por código, para `procesos.error_summary`. */
  errorSummary: Record<string, number>;
}

/** Perfil del emisor necesario para validar (subconjunto de `profiles`). */
export interface EmisorProfile {
  rfcEmisor: string;
  regimenFiscalId: string | null;
  cpEmisor: string | null;
}

/** Resultado de timbrar una fila (se llena en Sprint 3). */
export interface TimbreResult {
  folio: string;
  status: "stamped" | "failed";
  uuid?: string;
  xmlPath?: string;
  pdfPath?: string;
  error?: ValidationIssue | { code: string; message: string };
}
