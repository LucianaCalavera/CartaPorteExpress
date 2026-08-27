/** Formas de request/response de los Route Handlers y Server Actions. */
import type { FilaStatus, ProcesoStatus } from "@/types/cpe";
import type { ValidationIssue } from "@/lib/utils/errors";

export interface ProcesarSuccess {
  procesoId: string;
}

export interface ProcesarError {
  error: string;
}

export type ProcesarResponse = ProcesarSuccess | ProcesarError;

export interface RevalidarFilaResult {
  ok: boolean;
  status?: FilaStatus;
  issues?: ValidationIssue[];
  error?: string;
}

export interface TimbrarProcesoResult {
  ok: boolean;
  stamped: number;
  failed: number;
  /** true si se usó el cliente mock (faltan credenciales reales del PAC en Vault). */
  usingMock: boolean;
  error?: string;
}

/** Resumen ligero de un proceso para la tabla de historial del dashboard. */
export interface ProcesoSummary {
  id: string;
  originalFilename: string | null;
  status: ProcesoStatus;
  totalRows: number;
  validRows: number;
  errorRows: number;
  stampedRows: number;
  failedRows: number;
  createdAt: string;
}
