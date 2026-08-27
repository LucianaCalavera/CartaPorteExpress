/**
 * Sincroniza los catálogos SAT (CFDI 4.0 + Complemento Carta Porte 3.1) desde
 * `phpcfdi/resources-sat-catalogs` hacia:
 *   1. La tabla `public.sat_catalogos` de Supabase (catálogos grandes/volátiles).
 *   2. Archivos TS generados en `src/lib/constants/` (catálogos chicos/estables).
 *
 * Uso:  npm run catalogs:sync            (usa .env.local)
 *       npm run catalogs:sync -- --dry   (no escribe en Supabase)
 *
 * Idempotente: se puede re-correr; `sat_catalogos` hace upsert por
 * (catalogo_type, version, code) y marca `valid_to` de versiones previas.
 *
 * Reglas de Oro aplicadas: #6 (tipado estricto), #8 (catálogos versionados),
 * #9 (logs JSON estructurados), #12 (fuente verificada — ver satCatalogsVersion.ts).
 */
import { createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import { pipeline } from "node:stream/promises";
import { DatabaseSync } from "node:sqlite";
import bz2 from "unbzip2-stream";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  PHPCFDI_CATALOGS_DB_URL,
  PHPCFDI_CATALOGS_RELEASE,
  SAT_CATALOGS_VERSION,
} from "@/lib/constants/satCatalogsVersion";
import {
  buildBigCatalogSources,
  MATERIALES_PELIGROSOS_SOURCE,
  SMALL_CATALOG_SOURCES,
  type SmallCatalogSource,
  type SqliteRow,
} from "@/lib/catalogos/sources";

const CONSTANTS_DIR = path.join(process.cwd(), "src", "lib", "constants");
const UPSERT_CHUNK_SIZE = 1000;
const DRY_RUN = process.argv.includes("--dry");

type Level = "info" | "warn" | "error";
function log(level: Level, action: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({
    level,
    timestamp: new Date().toISOString(),
    scope: "sync-catalogs-sat",
    action,
    ...fields,
  });
  if (level === "error") console.error(line);
  else console.log(line);
}

/** Descarga el SQLite comprimido y lo descomprime a un archivo temporal. */
async function downloadCatalogsDb(): Promise<string> {
  const dir = path.join(tmpdir(), "cpe-catalogs");
  await mkdir(dir, { recursive: true });
  const dbPath = path.join(dir, `catalogs-${SAT_CATALOGS_VERSION}.db`);

  const started = Date.now();
  log("info", "download.start", {
    url: PHPCFDI_CATALOGS_DB_URL,
    release: PHPCFDI_CATALOGS_RELEASE,
  });
  const res = await fetch(PHPCFDI_CATALOGS_DB_URL, { redirect: "follow" });
  if (!res.ok || !res.body) {
    throw new Error(`Descarga falló: HTTP ${res.status} ${res.statusText}`);
  }
  const webStream = res.body as unknown as NodeWebReadableStream<Uint8Array>;
  await pipeline(Readable.fromWeb(webStream), bz2(), createWriteStream(dbPath));
  log("info", "download.done", { dbPath, durationMs: Date.now() - started });
  return dbPath;
}

/** Divide un array en trozos de tamaño `size`. */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

type SatCatalogoInsert = Database["public"]["Tables"]["sat_catalogos"]["Insert"];

/** Sincroniza los catálogos grandes hacia `sat_catalogos`. */
async function syncBigCatalogs(
  db: DatabaseSync,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const sources = buildBigCatalogSources(SAT_CATALOGS_VERSION);

  for (const source of sources) {
    const started = Date.now();
    const rows = db.prepare(source.query).all() as SqliteRow[];
    const records: SatCatalogoInsert[] = rows.map((row) => {
      const rec = source.toRecord(row);
      return {
        catalogo_type: source.catalogoType,
        version: SAT_CATALOGS_VERSION,
        code: rec.code,
        description: rec.description,
        parent_code: rec.parent_code,
        valid_from: rec.valid_from,
        valid_to: rec.valid_to,
        attributes: rec.attributes as SatCatalogoInsert["attributes"],
      };
    });

    if (DRY_RUN) {
      log("info", "catalog.dryRun", { catalogoType: source.catalogoType, rows: records.length });
      continue;
    }

    let upserted = 0;
    for (const batch of chunk(records, UPSERT_CHUNK_SIZE)) {
      const { error } = await supabase
        .from("sat_catalogos")
        .upsert(batch, { onConflict: "catalogo_type,version,code", ignoreDuplicates: false });
      if (error) {
        throw new Error(`Upsert ${source.catalogoType} falló: ${error.message}`);
      }
      upserted += batch.length;
    }

    // Regla de Oro #8: cerrar la vigencia de versiones anteriores de este tipo.
    const { error: expireError, count: expiredCount } = await supabase
      .from("sat_catalogos")
      .update({ valid_to: SAT_CATALOGS_VERSION }, { count: "exact" })
      .eq("catalogo_type", source.catalogoType)
      .neq("version", SAT_CATALOGS_VERSION)
      .is("valid_to", null);
    if (expireError) {
      log("warn", "catalog.expirePrevious.failed", {
        catalogoType: source.catalogoType,
        message: expireError.message,
      });
    }

    log("info", "catalog.synced", {
      catalogoType: source.catalogoType,
      upserted,
      expiredPrevious: expiredCount ?? 0,
      durationMs: Date.now() - started,
    });
  }
}

/** Todos los valores de catálogo se emiten como string (son claves SAT). */
function toTsString(value: string | number | null): string {
  return JSON.stringify(value === null ? "" : String(value));
}

/** PascalCase para el nombre del tipo derivado (TIPOS_PERMISO_SCT -> TiposPermisoSct). */
function pascalCase(snakeUpper: string): string {
  return snakeUpper.toLowerCase().replace(/(^|_)([a-z])/g, (_, __, c: string) => c.toUpperCase());
}

/** Genera el contenido de un `export const <Name> = { ... } as const`. */
function renderSmallCatalog(source: SmallCatalogSource, rows: SqliteRow[]): string {
  const entries = rows
    .map((row) => {
      const key = JSON.stringify(String(row[source.keyColumn]));
      const detail = source.detailColumns
        .map((col) => `${JSON.stringify(col)}: ${toTsString(row[col] ?? null)}`)
        .join(", ");
      return `  ${key}: { ${detail} },`;
    })
    .join("\n");
  const typeName = pascalCase(source.exportName);
  return [
    `/** ${source.doc} */`,
    `export const ${source.exportName} = {`,
    entries,
    `} as const;`,
    ``,
    `export type ${typeName}Clave = keyof typeof ${source.exportName};`,
    ``,
  ].join("\n");
}

const GENERATED_HEADER = (release: string) =>
  [
    `// Archivo generado por src/scripts/sync-catalogs-sat.ts — NO editar a mano.`,
    `// Fuente: phpcfdi/resources-sat-catalogs ${release} (catálogos SAT ${SAT_CATALOGS_VERSION}).`,
    `// Regenerar con: npm run catalogs:sync`,
    ``,
    `/* eslint-disable */`,
    ``,
  ].join("\n");

/** Genera los archivos TS de catálogos chicos. */
async function generateSmallCatalogs(db: DatabaseSync): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  const mainBlocks = SMALL_CATALOG_SOURCES.map((source) => {
    const rows = db.prepare(`SELECT * FROM ${source.sqliteTable}`).all() as SqliteRow[];
    counts[source.exportName] = rows.length;
    return renderSmallCatalog(source, rows);
  });
  await writeFile(
    path.join(CONSTANTS_DIR, "cartaPorteCatalogs.generated.ts"),
    GENERATED_HEADER(PHPCFDI_CATALOGS_RELEASE) + mainBlocks.join("\n"),
    "utf8",
  );

  // Materiales peligrosos: ~2.3k filas. Se emite como JSON (no `as const`) para
  // no crear una unión de tipos gigante ni inflar el chequeo de tipos.
  const mpRows = db
    .prepare(`SELECT * FROM ${MATERIALES_PELIGROSOS_SOURCE.sqliteTable}`)
    .all() as SqliteRow[];
  counts[MATERIALES_PELIGROSOS_SOURCE.exportName] = mpRows.length;
  const mpMap: Record<string, Record<string, string>> = {};
  for (const row of mpRows) {
    const key = String(row[MATERIALES_PELIGROSOS_SOURCE.keyColumn]);
    mpMap[key] = Object.fromEntries(
      MATERIALES_PELIGROSOS_SOURCE.detailColumns.map((col) => [col, String(row[col] ?? "")]),
    );
  }
  await writeFile(
    path.join(CONSTANTS_DIR, "materialesPeligrosos.generated.json"),
    JSON.stringify(mpMap, null, 0) + "\n",
    "utf8",
  );

  return counts;
}

async function main(): Promise<void> {
  const started = Date.now();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!DRY_RUN && (!url || !serviceKey)) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Corre con --env-file=.env.local.",
    );
  }

  const dbPath = await downloadCatalogsDb();
  const db = new DatabaseSync(dbPath, { readOnly: true });

  try {
    const supabase =
      !DRY_RUN && url && serviceKey
        ? createClient<Database>(url, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
        : null;

    if (supabase) await syncBigCatalogs(db, supabase);
    else log("warn", "bigCatalogs.skipped", { reason: "dry-run" });

    const smallCounts = await generateSmallCatalogs(db);
    log("info", "smallCatalogs.generated", { counts: smallCounts });

    log("info", "done", { durationMs: Date.now() - started, dryRun: DRY_RUN });
  } finally {
    db.close();
  }
}

main().catch((err: unknown) => {
  log("error", "failed", { message: err instanceof Error ? err.message : String(err) });
  process.exitCode = 1;
});
