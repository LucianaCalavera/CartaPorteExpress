/**
 * Índice de catálogos SAT mínimo para tests del motor de validación.
 * Construido con `buildCatalogIndex` (la misma función que en producción).
 */
import { buildCatalogIndex } from "@/lib/catalogos/catalogIndex";

type Row = Parameters<typeof buildCatalogIndex>[0][number];

const rows: Row[] = [
  // --- Códigos postales ---
  {
    catalogo_type: "cp",
    code: "44100",
    description: "Guadalajara, Jalisco",
    attributes: { estado: "JAL" },
  },
  {
    catalogo_type: "cp",
    code: "64000",
    description: "Monterrey, Nuevo León",
    attributes: { estado: "NLE" },
  },
  {
    catalogo_type: "cp",
    code: "06000",
    description: "Cuauhtémoc, Ciudad de México",
    attributes: { estado: "CMX" },
  },
  {
    catalogo_type: "cp",
    code: "01000",
    description: "Álvaro Obregón, Ciudad de México",
    attributes: { estado: "CMX" },
  },

  // --- Concepto de flete (c_ClaveProdServ completo) ---
  {
    catalogo_type: "clave_prod_serv",
    code: "78101802",
    description: "Transporte de carga por carretera regional/nacional",
    attributes: {},
  },
  {
    catalogo_type: "clave_prod_serv",
    code: "78101800",
    description: "Transporte de carga por carretera",
    attributes: {},
  },

  // --- Mercancías (c_ClaveProdServCP) ---
  {
    catalogo_type: "clave_prod_serv_cp",
    code: "11121600",
    description: "Madera",
    attributes: { material_peligroso: "0" },
  },
  {
    catalogo_type: "clave_prod_serv_cp",
    code: "50202301",
    description: "Agua",
    attributes: { material_peligroso: "0,1" },
  },
  {
    catalogo_type: "clave_prod_serv_cp",
    code: "12141901",
    description: "Nitrato de amonio",
    attributes: { material_peligroso: "1" },
  },
  {
    catalogo_type: "clave_prod_serv_cp",
    code: "15101514",
    description: "Gasolina",
    attributes: { material_peligroso: "1" },
  },

  // --- Unidades (c_ClaveUnidad) ---
  { catalogo_type: "unidad", code: "E48", description: "Unidad de servicio", attributes: {} },
  { catalogo_type: "unidad", code: "H87", description: "Pieza", attributes: {} },
  { catalogo_type: "unidad", code: "KGM", description: "Kilogramo", attributes: { simbolo: "kg" } },

  // --- Régimen fiscal ---
  {
    catalogo_type: "regimen_fiscal",
    code: "601",
    description: "General de Ley Personas Morales",
    attributes: { aplica_fisica: false, aplica_moral: true },
  },
  {
    catalogo_type: "regimen_fiscal",
    code: "612",
    description: "PF con Actividades Empresariales y Profesionales",
    attributes: { aplica_fisica: true, aplica_moral: false },
  },

  // --- Uso CFDI ---
  {
    catalogo_type: "uso_cfdi",
    code: "G03",
    description: "Gastos en general",
    attributes: { aplica_fisica: true, aplica_moral: true },
  },
  {
    catalogo_type: "uso_cfdi",
    code: "S01",
    description: "Sin efectos fiscales",
    attributes: { aplica_fisica: true, aplica_moral: true },
  },

  // --- Moneda ---
  {
    catalogo_type: "moneda",
    code: "MXN",
    description: "Peso Mexicano",
    attributes: { decimales: 2 },
  },
  {
    catalogo_type: "moneda",
    code: "USD",
    description: "Dólar americano",
    attributes: { decimales: 2 },
  },

  // --- Aduana ---
  { catalogo_type: "aduana", code: "240", description: "Nuevo Laredo, Tamaulipas", attributes: {} },
];

export const testCatalogs = buildCatalogIndex(rows);
