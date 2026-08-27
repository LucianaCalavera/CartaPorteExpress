import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ExcelParseError, parseExcelBuffer } from "@/lib/excel/parser";
import { groupByFolio } from "@/lib/validators/excelRowToCpeSchema";
import { validateBatch } from "@/lib/validators/validationEngine";
import { collectCatalogCodes, loadCatalogIndex } from "@/lib/catalogos/catalogIndex";
import { logEvent } from "@/lib/utils/log";
import type { Json } from "@/types/database";
import type { EmisorProfile, FolioGroup } from "@/types/cpe";
import type { ProcesarResponse } from "@/types/api";

export const runtime = "nodejs";

const ACCEPTED_EXTENSIONS = [".xlsx", ".csv"];

const log = (entry: Record<string, unknown>): void => logEvent({ action: "procesar", ...entry });

function rawDataForFolio(groups: FolioGroup[], folio: string): Json {
  const group = groups.find((g) => g.folio === folio);
  return (group?.rows ?? []) as unknown as Json;
}

export async function POST(request: Request): Promise<NextResponse<ProcesarResponse>> {
  const startedAt = Date.now();
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("rfc_emisor, regimen_fiscal_id, cp_emisor")
    .eq("id", user.id)
    .maybeSingle();

  if (!profileRow?.rfc_emisor) {
    return NextResponse.json(
      { error: "Completa el RFC emisor en Configuración antes de procesar un archivo." },
      { status: 400 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "No se pudo leer el formulario." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
  }
  if (!ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))) {
    return NextResponse.json({ error: "Solo se aceptan archivos .xlsx o .csv." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = parseExcelBuffer(buffer);
  } catch (err) {
    const message =
      err instanceof ExcelParseError ? err.message : "No se pudo procesar el archivo.";
    log({
      level: "warn",
      userId: user.id,
      status: "excel_parse_error",
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const groups = groupByFolio(parsed.rows);

  const profile: EmisorProfile = {
    rfcEmisor: profileRow.rfc_emisor,
    regimenFiscalId: profileRow.regimen_fiscal_id,
    cpEmisor: profileRow.cp_emisor,
  };

  const needed = collectCatalogCodes(groups);
  const catalogs = await loadCatalogIndex(supabase, needed);
  const result = validateBatch(groups, { profile, catalogs });

  const { data: proceso, error: procesoError } = await supabase
    .from("procesos")
    .insert({
      user_id: user.id,
      original_filename: file.name,
      total_rows: groups.length,
      valid_rows: result.valid.length,
      error_rows: result.invalid.length,
      status: "validated",
      error_summary: result.errorSummary as unknown as Json,
    })
    .select("id")
    .single();

  if (procesoError || !proceso) {
    log({
      level: "error",
      userId: user.id,
      status: "proceso_insert_error",
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: "No se pudo guardar el proceso." }, { status: 500 });
  }

  const filaInserts = [
    ...result.valid.map((f) => ({
      proceso_id: proceso.id,
      folio: f.folio,
      row_number: Math.min(...f.rowNumbers),
      row_numbers: f.rowNumbers,
      raw_data: rawDataForFolio(groups, f.folio),
      validated_data: f.data as unknown as Json,
      validation_errors: [] as unknown as Json,
      status: "valid",
    })),
    ...result.invalid.map((f) => ({
      proceso_id: proceso.id,
      folio: f.folio,
      row_number: Math.min(...f.rowNumbers),
      row_numbers: f.rowNumbers,
      raw_data: rawDataForFolio(groups, f.folio),
      validated_data: null,
      validation_errors: f.issues as unknown as Json,
      status: "invalid",
    })),
  ];

  if (filaInserts.length > 0) {
    const { error: filasError } = await supabase.from("filas_proceso").insert(filaInserts);
    if (filasError) {
      log({
        level: "error",
        userId: user.id,
        procesoId: proceso.id,
        status: "filas_insert_error",
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "No se pudo guardar el detalle del proceso." },
        { status: 500 },
      );
    }
  }

  log({
    level: "info",
    userId: user.id,
    procesoId: proceso.id,
    status: "ok",
    validCount: result.valid.length,
    invalidCount: result.invalid.length,
    durationMs: Date.now() - startedAt,
  });

  return NextResponse.json({ procesoId: proceso.id }, { status: 201 });
}
