/**
 * Motor de validación — función pura `validateBatch`.
 *
 * Recibe grupos de folio (ya agrupados) + índice de catálogos + fecha de
 * referencia. **Sin side effects**: no I/O, no `Date.now()` implícito, no
 * mutación de la entrada. 100% testeable (Sprint 1, Regla de Oro).
 *
 * Orden por folio:
 *   1. Ensamblar (mapeo Excel -> objeto) y detectar inconsistencias de grupo.
 *   2. Validar formato/estructura con Zod.
 *   3. Si Zod pasa, aplicar reglas de negocio + catálogos SAT.
 *   4. Clasificar en `valid` / `invalid`.
 */
import {
  cfdiCartaPorteIngresoSchema,
  zodErrorToValidationIssues,
  type CfdiCartaPorteIngreso,
} from "@/lib/validators/cartaPorte31Schemas";
import { assembleFolioGroup } from "@/lib/validators/excelRowToCpeSchema";
import { CFDI_FECHA_MAX_DIAS_FUTURO, CFDI_FECHA_MAX_DIAS_PASADO } from "@/lib/validators/satRegex";
import { issue, type ValidationIssue } from "@/lib/utils/errors";
import { isClaveMaterialPeligrosoValida } from "@/lib/constants/materialesPeligrosos";
import type { CatalogIndex } from "@/lib/catalogos/catalogIndex";
import type {
  EmisorProfile,
  FilaInvalida,
  FilaValida,
  FolioGroup,
  ValidationResult,
} from "@/types/cpe";

export interface ValidateBatchContext {
  profile: EmisorProfile;
  catalogs: CatalogIndex;
  /** Fecha de referencia (por defecto ahora). Inyectable para tests. */
  now?: Date;
}

/** Claves de producto/servicio de combustibles (Complemento Hidrocarburos, fuera de V1). */
const COMBUSTIBLE_PREFIXES = ["1510"] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Reglas de negocio (operan sobre el objeto ya validado por Zod)
// ---------------------------------------------------------------------------

function checkUbicaciones(cfdi: CfdiCartaPorteIngreso, catalogs: CatalogIndex): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  cfdi.cartaPorte.ubicaciones.forEach((u, i) => {
    const path = `cartaPorte.ubicaciones.${i}.domicilio`;
    const cp = u.domicilio.codigoPostal;
    const entry = catalogs.cp.get(cp);
    if (!entry) {
      issues.push(
        issue(
          `${path}.codigoPostal`,
          "cp_not_found",
          `El código postal ${cp} no existe en el catálogo del SAT`,
          cp,
        ),
      );
      return;
    }
    const estadoCp = String(entry.attributes.estado ?? "").toUpperCase();
    if (estadoCp && u.domicilio.estado && estadoCp !== u.domicilio.estado.toUpperCase()) {
      issues.push(
        issue(
          `${path}.estado`,
          "estado_no_coincide_cp",
          `El estado "${u.domicilio.estado}" no corresponde al código postal ${cp} (esperado: ${estadoCp})`,
          u.domicilio.estado,
        ),
      );
    }
  });

  const origen = cfdi.cartaPorte.ubicaciones.find((u) => u.tipoUbicacion === "Origen");
  const destinos = cfdi.cartaPorte.ubicaciones.filter((u) => u.tipoUbicacion === "Destino");
  for (const destino of destinos) {
    if (origen && origen.domicilio.codigoPostal === destino.domicilio.codigoPostal) {
      issues.push(
        issue(
          "cartaPorte.ubicaciones",
          "cp_origen_igual_destino",
          "El código postal de origen y destino no pueden ser iguales",
          origen.domicilio.codigoPostal,
        ),
      );
      break;
    }
  }
  return issues;
}

function checkFechas(cfdi: CfdiCartaPorteIngreso, now: Date): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const origen = cfdi.cartaPorte.ubicaciones.find((u) => u.tipoUbicacion === "Origen");
  const destinos = cfdi.cartaPorte.ubicaciones.filter((u) => u.tipoUbicacion === "Destino");

  if (origen) {
    const salida = new Date(origen.fechaHoraSalidaLlegada);
    const minDate = new Date(now.getTime() - CFDI_FECHA_MAX_DIAS_PASADO * DAY_MS);
    const maxDate = new Date(now.getTime() + CFDI_FECHA_MAX_DIAS_FUTURO * DAY_MS);
    if (salida < minDate || salida > maxDate) {
      issues.push(
        issue(
          "cartaPorte.ubicaciones.0.fechaHoraSalidaLlegada",
          "fecha_fuera_de_ventana",
          `La fecha de salida debe estar entre ${CFDI_FECHA_MAX_DIAS_PASADO} días atrás y ${CFDI_FECHA_MAX_DIAS_FUTURO} días adelante`,
          origen.fechaHoraSalidaLlegada,
        ),
      );
    }
    for (const destino of destinos) {
      if (new Date(destino.fechaHoraSalidaLlegada) < salida) {
        issues.push(
          issue(
            "cartaPorte.ubicaciones.1.fechaHoraSalidaLlegada",
            "fecha_llegada_antes_de_salida",
            "La fecha de llegada al destino no puede ser anterior a la salida del origen",
            destino.fechaHoraSalidaLlegada,
          ),
        );
      }
    }
  }
  return issues;
}

function checkClaveProdServServicio(
  cfdi: CfdiCartaPorteIngreso,
  catalogs: CatalogIndex,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { claveProdServ, claveUnidad } = cfdi.comprobante.concepto;
  if (!catalogs.clave_prod_serv.has(claveProdServ)) {
    issues.push(
      issue(
        "comprobante.concepto.claveProdServ",
        "clave_prod_serv_not_found",
        `La clave de producto/servicio del flete (${claveProdServ}) no existe en el catálogo del SAT`,
        claveProdServ,
      ),
    );
  }
  if (!catalogs.unidad.has(claveUnidad)) {
    issues.push(
      issue(
        "comprobante.concepto.claveUnidad",
        "clave_unidad_not_found",
        `La clave de unidad del flete (${claveUnidad}) no existe en el catálogo del SAT`,
        claveUnidad,
      ),
    );
  }
  return issues;
}

function checkMercancias(cfdi: CfdiCartaPorteIngreso, catalogs: CatalogIndex): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  cfdi.cartaPorte.mercancias.mercancia.forEach((m, i) => {
    const path = `cartaPorte.mercancias.mercancia.${i}`;
    const entry = catalogs.clave_prod_serv_cp.get(m.bienesTransp);

    if (!entry) {
      issues.push(
        issue(
          `${path}.bienesTransp`,
          "clave_prod_serv_not_found",
          `La clave de producto/servicio ${m.bienesTransp} no existe en el catálogo de Carta Porte del SAT`,
          m.bienesTransp,
        ),
      );
    }
    if (!catalogs.unidad.has(m.claveUnidad)) {
      issues.push(
        issue(
          `${path}.claveUnidad`,
          "clave_unidad_not_found",
          `La clave de unidad ${m.claveUnidad} no existe en el catálogo del SAT`,
          m.claveUnidad,
        ),
      );
    }
    if (COMBUSTIBLE_PREFIXES.some((p) => m.bienesTransp.startsWith(p))) {
      issues.push(
        issue(
          `${path}.bienesTransp`,
          "combustible_no_soportado",
          "El transporte de combustibles/hidrocarburos requiere el Complemento de Hidrocarburos, no soportado en esta versión",
          m.bienesTransp,
        ),
      );
    }

    // Material peligroso vs flag del catálogo ('0' | '1' | '0,1').
    const flag = entry ? String(entry.attributes.material_peligroso ?? "0") : "0,1";
    const permitidos = new Set(flag.split(",").map((s) => s.trim()));
    if (permitidos.has("1") && !permitidos.has("0") && m.materialPeligroso !== "Sí") {
      issues.push(
        issue(
          `${path}.materialPeligroso`,
          "material_peligroso_requerido",
          `La clave ${m.bienesTransp} siempre es material peligroso; indica "Sí"`,
          m.materialPeligroso ?? null,
        ),
      );
    }
    if (permitidos.has("0") && !permitidos.has("1") && m.materialPeligroso === "Sí") {
      issues.push(
        issue(
          `${path}.materialPeligroso`,
          "material_peligroso_no_aplica",
          `La clave ${m.bienesTransp} no admite material peligroso`,
          m.materialPeligroso,
        ),
      );
    }
    if (
      m.materialPeligroso === "Sí" &&
      m.cveMaterialPeligroso &&
      !isClaveMaterialPeligrosoValida(m.cveMaterialPeligroso)
    ) {
      issues.push(
        issue(
          `${path}.cveMaterialPeligroso`,
          "cve_material_peligroso_not_found",
          `La clave de material peligroso ${m.cveMaterialPeligroso} no existe en el catálogo del SAT`,
          m.cveMaterialPeligroso,
        ),
      );
    }
  });
  return issues;
}

function checkReceptor(cfdi: CfdiCartaPorteIngreso, catalogs: CatalogIndex): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const r = cfdi.comprobante.receptor;

  if (!catalogs.cp.has(r.domicilioFiscalReceptor)) {
    issues.push(
      issue(
        "comprobante.receptor.domicilioFiscalReceptor",
        "cp_not_found",
        `El código postal fiscal del cliente (${r.domicilioFiscalReceptor}) no existe en el catálogo del SAT`,
        r.domicilioFiscalReceptor,
      ),
    );
  }
  if (!catalogs.regimen_fiscal.has(r.regimenFiscalReceptor)) {
    issues.push(
      issue(
        "comprobante.receptor.regimenFiscalReceptor",
        "regimen_fiscal_not_found",
        `El régimen fiscal ${r.regimenFiscalReceptor} no existe en el catálogo del SAT`,
        r.regimenFiscalReceptor,
      ),
    );
  }
  if (!catalogs.uso_cfdi.has(r.usoCFDI)) {
    issues.push(
      issue(
        "comprobante.receptor.usoCFDI",
        "uso_cfdi_not_found",
        `El uso de CFDI ${r.usoCFDI} no existe en el catálogo del SAT`,
        r.usoCFDI,
      ),
    );
  }
  if (!catalogs.moneda.has(cfdi.comprobante.moneda)) {
    issues.push(
      issue(
        "comprobante.moneda",
        "moneda_not_found",
        `La moneda ${cfdi.comprobante.moneda} no existe en el catálogo del SAT`,
        cfdi.comprobante.moneda,
      ),
    );
  }
  return issues;
}

/** Todas las reglas de negocio sobre un CFDI ya validado estructuralmente. */
function runBusinessRules(
  cfdi: CfdiCartaPorteIngreso,
  ctx: ValidateBatchContext,
): ValidationIssue[] {
  const now = ctx.now ?? new Date();
  return [
    ...checkUbicaciones(cfdi, ctx.catalogs),
    ...checkFechas(cfdi, now),
    ...checkClaveProdServServicio(cfdi, ctx.catalogs),
    ...checkMercancias(cfdi, ctx.catalogs),
    ...checkReceptor(cfdi, ctx.catalogs),
  ];
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Valida un lote de grupos de folio. Función pura.
 * @returns `{ valid, invalid, errorSummary }` — Regla de Oro #2: si Zod falla,
 *   NUNCA se llega a las reglas que asumirían datos bien formados.
 */
export function validateBatch(groups: FolioGroup[], ctx: ValidateBatchContext): ValidationResult {
  const valid: FilaValida[] = [];
  const invalid: FilaInvalida[] = [];
  const errorSummary: Record<string, number> = {};

  const tally = (issues: ValidationIssue[]): void => {
    for (const it of issues) errorSummary[it.code] = (errorSummary[it.code] ?? 0) + 1;
  };

  for (const group of groups) {
    const { input, issues: assemblyIssues } = assembleFolioGroup(group);
    const parsed = cfdiCartaPorteIngresoSchema.safeParse(input);

    if (!parsed.success) {
      const issues = [...assemblyIssues, ...zodErrorToValidationIssues(parsed.error)];
      tally(issues);
      invalid.push({ folio: group.folio, rowNumbers: group.rowNumbers, issues, raw: input });
      continue;
    }

    const businessIssues = [...assemblyIssues, ...runBusinessRules(parsed.data, ctx)];
    if (businessIssues.length > 0) {
      tally(businessIssues);
      invalid.push({
        folio: group.folio,
        rowNumbers: group.rowNumbers,
        issues: businessIssues,
        raw: input,
      });
      continue;
    }

    valid.push({ folio: group.folio, rowNumbers: group.rowNumbers, data: parsed.data });
  }

  return { valid, invalid, errorSummary };
}

export type { EmisorProfile };
