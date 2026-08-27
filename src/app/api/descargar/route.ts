import { NextResponse } from "next/server";
import { zipSync } from "fflate";
import { createClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/utils/log";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const runtime = "nodejs";

type Tipo = "xml" | "pdf" | "zip_todos";

function isTipo(v: string | null): v is Tipo {
  return v === "xml" || v === "pdf" || v === "zip_todos";
}

const log = (entry: Record<string, unknown>): void => logEvent({ action: "descargar", ...entry });

/** Descarga un objeto de Storage a bytes. `null` si falla (se omite del ZIP, no se aborta todo). */
async function downloadBytes(
  supabase: SupabaseClient<Database>,
  bucket: "cfdi-xml" | "cfdi-pdf",
  path: string,
): Promise<Uint8Array | null> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

/**
 * GET /api/descargar?procesoId=...&tipo=xml|pdf|zip_todos
 * ZIP en memoria (fflate) con los XML/PDF de las filas ya timbradas del
 * proceso. Sin guardar nada en disco; sin URLs firmadas persistidas (Storage
 * respeta RLS por carpeta `user_id/...`, así que solo se puede descargar lo
 * propio).
 */
export async function GET(request: Request): Promise<NextResponse | Response> {
  const startedAt = Date.now();
  const { searchParams } = new URL(request.url);
  const procesoId = searchParams.get("procesoId");
  const tipoParam = searchParams.get("tipo");

  if (!procesoId || !isTipo(tipoParam)) {
    return NextResponse.json(
      { error: "Parámetros inválidos: procesoId y tipo (xml|pdf|zip_todos) son obligatorios." },
      { status: 400 },
    );
  }
  const tipo = tipoParam;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: proceso } = await supabase
    .from("procesos")
    .select("id, original_filename")
    .eq("id", procesoId)
    .maybeSingle();
  if (!proceso) return NextResponse.json({ error: "Proceso no encontrado." }, { status: 404 });

  const { data: filas } = await supabase
    .from("filas_proceso")
    .select("id, folio, xml_url, pdf_url")
    .eq("proceso_id", procesoId)
    .eq("status", "stamped");

  if (!filas || filas.length === 0) {
    return NextResponse.json(
      { error: "Este proceso todavía no tiene CFDI timbrados." },
      { status: 404 },
    );
  }

  const entries: Record<string, Uint8Array> = {};
  const wantsXml = tipo === "xml" || tipo === "zip_todos";
  const wantsPdf = tipo === "pdf" || tipo === "zip_todos";
  const prefixXml = tipo === "zip_todos" ? "xml/" : "";
  const prefixPdf = tipo === "zip_todos" ? "pdf/" : "";

  for (const fila of filas) {
    const name = fila.folio || fila.id;
    if (wantsXml && fila.xml_url) {
      const bytes = await downloadBytes(supabase, "cfdi-xml", fila.xml_url);
      if (bytes) entries[`${prefixXml}${name}.xml`] = bytes;
    }
    if (wantsPdf && fila.pdf_url) {
      const bytes = await downloadBytes(supabase, "cfdi-pdf", fila.pdf_url);
      if (bytes) entries[`${prefixPdf}${name}.pdf`] = bytes;
    }
  }

  if (Object.keys(entries).length === 0) {
    return NextResponse.json(
      { error: "No se encontraron archivos para descargar." },
      { status: 404 },
    );
  }

  const zipped = zipSync(entries, { level: 6 });
  const baseName = (proceso.original_filename ?? "cfdi").replace(/\.[^.]+$/, "");

  log({
    level: "info",
    userId: user.id,
    procesoId,
    tipo,
    count: Object.keys(entries).length,
    durationMs: Date.now() - startedAt,
  });

  return new Response(zipped, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${baseName}-${tipo}.zip"`,
      "Content-Length": String(zipped.byteLength),
    },
  });
}
