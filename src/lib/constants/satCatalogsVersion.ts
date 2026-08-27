/**
 * Versión activa de los catálogos SAT y metadatos de la fuente.
 *
 * Fuente: `phpcfdi/resources-sat-catalogs` (licencia Unlicense), que republica
 * los catálogos oficiales del SAT (CFDI 4.0 + Complemento Carta Porte 3.1) como
 * una base SQLite. Ver Regla de Oro #12 (verificar vigencia antes de codear).
 *
 * - Complemento Carta Porte 3.1: única versión vigente desde 2024-07-17.
 * - Catálogos SAT del complemento: última actualización 2026-01-15.
 */

/** Fecha de publicación del catálogo SAT que representa el snapshot actual. */
export const SAT_CATALOGS_VERSION = "2026-01-15";

/** Release de `phpcfdi/resources-sat-catalogs` de la que se sincronizó. */
export const PHPCFDI_CATALOGS_RELEASE = "v10.15.20260821";

/** Descarga del SQLite comprimido (bzip2, ~25 MB) del último release. */
export const PHPCFDI_CATALOGS_DB_URL =
  "https://github.com/phpcfdi/resources-sat-catalogs/releases/latest/download/catalogs.db.bz2";

/** Versión del complemento Carta Porte soportada. */
export const CARTA_PORTE_VERSION = "3.1";

/** Versión del CFDI soportada. */
export const CFDI_VERSION = "4.0";
