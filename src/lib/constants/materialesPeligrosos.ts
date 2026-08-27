/**
 * Catálogo c_MaterialPeligroso (Complemento Carta Porte 3.1).
 *
 * Los datos viven en `materialesPeligrosos.generated.json` (generado por
 * `scripts/sync-catalogs-sat.ts`) para no crear una unión de tipos de ~2.3k
 * literales. Este módulo sólo lo tipa y expone helpers.
 */
import rawData from "./materialesPeligrosos.generated.json";

export interface MaterialPeligrosoInfo {
  /** Descripción de la sustancia. */
  texto: string;
  /** Clase o división de riesgo (p. ej. "2.1", "3", "6.1"). */
  clase_o_div: string;
  /** Riesgo secundario, si aplica. */
  peligro_secundario: string;
  /** Nombre técnico, si aplica. */
  nombre_tecnico: string;
}

export const MATERIALES_PELIGROSOS: Record<string, MaterialPeligrosoInfo> = rawData;

/** True si la clave existe en el catálogo c_MaterialPeligroso vigente. */
export function isClaveMaterialPeligrosoValida(clave: string): boolean {
  return Object.prototype.hasOwnProperty.call(MATERIALES_PELIGROSOS, clave);
}
