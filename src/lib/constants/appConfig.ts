/** Límites operativos de la app (V1). Ver Regla de Oro #7. */
export const APP_CONFIG = {
  /** Tamaño máximo del Excel subido (MB). Se valida en cliente y servidor. */
  MAX_EXCEL_FILE_SIZE_MB: 10,
  /**
   * Filas máximas que `procesar` acepta de forma síncrona (Server Action /
   * Route Handler, Node.js Runtime). Por encima de esto se rechaza con un
   * mensaje claro; mover a Edge Function/QStash queda para cuando se necesite.
   */
  MAX_ROWS_SYNC: 2000,
} as const;
