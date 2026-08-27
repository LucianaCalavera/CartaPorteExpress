/**
 * Log estructurado JSON para Server Actions/Route Handlers (Regla de Oro #9).
 * Nunca pasar XML completos, CSD, ni tokens PAC/WhatsApp en `entry` (Regla #1).
 */
export function logEvent(entry: Record<string, unknown>): void {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), ...entry }));
}
