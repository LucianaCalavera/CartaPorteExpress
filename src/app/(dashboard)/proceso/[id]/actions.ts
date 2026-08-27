"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateBatch } from "@/lib/validators/validationEngine";
import { collectCatalogCodes, loadCatalogIndex } from "@/lib/catalogos/catalogIndex";
import { buildFacturacomCfdiPayload, buildFacturacomClientPayload } from "@/lib/pac/pacMapper";
import { resolveFacturacomClient } from "@/lib/pac/resolveFacturacomClient";
import { logEvent } from "@/lib/utils/log";
import { PacError, type ValidationIssue } from "@/lib/utils/errors";
import type { Json } from "@/types/database";
import type { CfdiCartaPorteIngreso } from "@/lib/validators/cartaPorte31Schemas";
import type { EmisorProfile, FolioGroup, RawExcelRow } from "@/types/cpe";
import type { RevalidarFilaResult, TimbrarProcesoResult } from "@/types/api";

const log = (entry: Record<string, unknown>): void =>
  logEvent({ action: "timbrarProceso", ...entry });

/**
 * Corrige `raw_data` de una fila (grupo de folio) y la vuelve a validar contra
 * el motor puro (Sprint 1). Actualiza `filas_proceso` y los contadores de
 * `procesos` (incluye `error_summary` con el delta de códigos de error).
 */
export async function revalidarFila(
  procesoId: string,
  filaId: string,
  correctedRawData: RawExcelRow[],
): Promise<RevalidarFilaResult> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const [{ data: profileRow }, { data: fila }, { data: proceso }] = await Promise.all([
    supabase
      .from("profiles")
      .select("rfc_emisor, regimen_fiscal_id, cp_emisor")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("filas_proceso")
      .select("folio, row_numbers, validation_errors, status")
      .eq("id", filaId)
      .eq("proceso_id", procesoId)
      .maybeSingle(),
    supabase
      .from("procesos")
      .select("valid_rows, error_rows, error_summary")
      .eq("id", procesoId)
      .maybeSingle(),
  ]);

  if (!profileRow?.rfc_emisor) return { ok: false, error: "Falta el RFC emisor en Configuración." };
  if (!fila) return { ok: false, error: "La fila no existe o no pertenece a este proceso." };
  if (!proceso) return { ok: false, error: "El proceso no existe." };
  if (correctedRawData.length === 0) return { ok: false, error: "No hay datos para revalidar." };

  const group: FolioGroup = {
    folio: fila.folio,
    rowNumbers: fila.row_numbers,
    rows: correctedRawData,
  };

  const profile: EmisorProfile = {
    rfcEmisor: profileRow.rfc_emisor,
    regimenFiscalId: profileRow.regimen_fiscal_id,
    cpEmisor: profileRow.cp_emisor,
  };

  const needed = collectCatalogCodes([group]);
  const catalogs = await loadCatalogIndex(supabase, needed);
  const result = validateBatch([group], { profile, catalogs });

  const isValid = result.valid.length > 0;
  const newIssues: ValidationIssue[] = result.invalid[0]?.issues ?? [];
  const newStatus = isValid ? "valid" : "invalid";

  const { error: updateError } = await supabase
    .from("filas_proceso")
    .update({
      raw_data: correctedRawData as unknown as Json,
      validated_data: isValid ? (result.valid[0]!.data as unknown as Json) : null,
      validation_errors: newIssues as unknown as Json,
      status: newStatus,
    })
    .eq("id", filaId);

  if (updateError) return { ok: false, error: "No se pudo guardar la corrección." };

  const oldIssues = (fila.validation_errors as ValidationIssue[] | null) ?? [];
  const errorSummary: Record<string, number> = {
    ...((proceso.error_summary as Record<string, number> | null) ?? {}),
  };
  for (const it of oldIssues) errorSummary[it.code] = Math.max(0, (errorSummary[it.code] ?? 0) - 1);
  for (const it of newIssues) errorSummary[it.code] = (errorSummary[it.code] ?? 0) + 1;
  for (const code of Object.keys(errorSummary)) {
    if (errorSummary[code] <= 0) delete errorSummary[code];
  }

  const wasValid = fila.status === "valid";
  const validDelta = Number(isValid) - Number(wasValid);

  await supabase
    .from("procesos")
    .update({
      valid_rows: (proceso.valid_rows ?? 0) + validDelta,
      error_rows: (proceso.error_rows ?? 0) - validDelta,
      error_summary: errorSummary as unknown as Json,
    })
    .eq("id", procesoId);

  revalidatePath(`/proceso/${procesoId}`);

  return { ok: true, status: newStatus, issues: newIssues };
}

/**
 * Timbra las filas seleccionadas (deben estar `status='valid'`).
 *
 * No existe timbrado batch real en Factura.com (Regla de Oro #12 — verificado
 * contra su documentación): esto es un loop de un CFDI por request. La
 * protección contra doble timbrado (Regla de Oro #3) es el UPDATE ... WHERE
 * status='valid' antes de llamar al PAC — si dos invocaciones intentan tomar
 * la misma fila, sólo una gana la carrera (la otra recibe 0 filas afectadas).
 *
 * Si el perfil no tiene credenciales de Factura.com en Vault todavía (no hay
 * UI de Configuración hasta Sprint 4), usa el cliente mock automáticamente
 * (`usingMock: true` en el resultado) — así se puede probar el flujo completo
 * sin cuenta real.
 */
export async function timbrarProceso(
  procesoId: string,
  filaIds: string[],
): Promise<TimbrarProcesoResult> {
  const startedAt = Date.now();
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, stamped: 0, failed: 0, usingMock: false, error: "No autenticado" };

  const { data: profileRow } = await supabase
    .from("profiles")
    .select(
      "rfc_emisor, regimen_fiscal_id, cp_emisor, pac_api_key_secret_id, pac_api_secret_secret_id",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profileRow?.rfc_emisor) {
    return {
      ok: false,
      stamped: 0,
      failed: 0,
      usingMock: false,
      error: "Falta el RFC emisor en Configuración.",
    };
  }

  const { data: filas } = await supabase
    .from("filas_proceso")
    .select("id, folio, validated_data")
    .eq("proceso_id", procesoId)
    .in("id", filaIds)
    .eq("status", "valid");

  if (!filas || filas.length === 0) {
    return { ok: true, stamped: 0, failed: 0, usingMock: false };
  }

  const emisorProfile: EmisorProfile = {
    rfcEmisor: profileRow.rfc_emisor,
    regimenFiscalId: profileRow.regimen_fiscal_id,
    cpEmisor: profileRow.cp_emisor,
  };

  const { client, usingMock } = await resolveFacturacomClient(profileRow);
  const catalogs = await loadCatalogIndex(supabase, {
    cp: new Set(),
    clave_prod_serv: new Set(),
    clave_prod_serv_cp: new Set(),
    unidad: new Set(),
  });

  // UID del receptor por RFC, resuelto una sola vez por corrida aunque varias
  // filas compartan cliente. Un `PacError` cacheado propaga la falla a todas
  // las filas de ese RFC sin reintentar el registro del cliente por cada una.
  const receptorUidByRfc = new Map<string, string | PacError>();

  let stamped = 0;
  let failed = 0;

  for (const fila of filas) {
    const filaStartedAt = Date.now();
    const cfdi = fila.validated_data as unknown as CfdiCartaPorteIngreso;

    const { data: locked } = await supabase
      .from("filas_proceso")
      .update({ status: "stamping" })
      .eq("id", fila.id)
      .eq("status", "valid")
      .select("id")
      .maybeSingle();
    if (!locked) continue;

    try {
      const rfc = cfdi.comprobante.receptor.rfc;
      let receptorUid = receptorUidByRfc.get(rfc);
      if (receptorUid === undefined) {
        try {
          const uid = await client.findOrCreateClient(
            buildFacturacomClientPayload(cfdi.comprobante.receptor),
          );
          receptorUidByRfc.set(rfc, uid);
          receptorUid = uid;
        } catch (err) {
          const pacErr =
            err instanceof PacError
              ? err
              : new PacError("No se pudo registrar al cliente en el PAC");
          receptorUidByRfc.set(rfc, pacErr);
          receptorUid = pacErr;
        }
      }
      if (receptorUid instanceof PacError) throw receptorUid;

      const payload = buildFacturacomCfdiPayload(cfdi, { receptorUid, emisorProfile, catalogs });
      const result = await client.stampCfdi(payload);

      const [xml, pdf] = await Promise.all([
        client.downloadXml(result.uid),
        client.downloadPdf(result.uid),
      ]);
      const xmlPath = `${user.id}/${procesoId}/${fila.id}.xml`;
      const pdfPath = `${user.id}/${procesoId}/${fila.id}.pdf`;
      await Promise.all([
        supabase.storage
          .from("cfdi-xml")
          .upload(xmlPath, xml, { contentType: "application/xml", upsert: true }),
        supabase.storage
          .from("cfdi-pdf")
          .upload(pdfPath, pdf, { contentType: "application/pdf", upsert: true }),
      ]);

      await supabase
        .from("filas_proceso")
        .update({
          status: "stamped",
          uuid_timbre: result.UUID,
          xml_url: xmlPath,
          pdf_url: pdfPath,
          sat_status: "vigente",
          last_pac_response: result as unknown as Json,
        })
        .eq("id", fila.id);

      stamped++;
      log({
        level: "info",
        userId: user.id,
        procesoId,
        filaId: fila.id,
        status: "stamped",
        usingMock,
        durationMs: Date.now() - filaStartedAt,
      });
    } catch (err) {
      const pacErr =
        err instanceof PacError
          ? err
          : new PacError(err instanceof Error ? err.message : "Error desconocido al timbrar");

      await supabase
        .from("filas_proceso")
        .update({
          status: "failed",
          last_pac_response: { error: pacErr.message, raw: pacErr.raw ?? null } as unknown as Json,
        })
        .eq("id", fila.id);

      failed++;
      log({
        level: "error",
        userId: user.id,
        procesoId,
        filaId: fila.id,
        status: "failed",
        usingMock,
        error: pacErr.message,
        durationMs: Date.now() - filaStartedAt,
      });
    }
  }

  const { data: proceso } = await supabase
    .from("procesos")
    .select("stamped_rows, failed_rows")
    .eq("id", procesoId)
    .maybeSingle();

  await supabase
    .from("procesos")
    .update({
      stamped_rows: (proceso?.stamped_rows ?? 0) + stamped,
      failed_rows: (proceso?.failed_rows ?? 0) + failed,
      status: "completed",
    })
    .eq("id", procesoId);

  revalidatePath(`/proceso/${procesoId}`);

  log({
    level: "info",
    userId: user.id,
    procesoId,
    status: "ok",
    stamped,
    failed,
    usingMock,
    durationMs: Date.now() - startedAt,
  });

  return { ok: true, stamped, failed, usingMock };
}
