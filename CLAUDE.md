# 🎯 CONTEXTO DE NEGOCIO (PARA QUE LA IA TOME DECISIONES DE PRODUCTO, NO SOLO CÓDIGO)
**Producto:** CartaPorteExpress - Micro-SaaS B2B para automatización y validación de CFDI 4.0 con Complemento Carta Porte 3.1 para pequeños transportistas (flotillas 5-50 unidades) en México.
**Usuario Core:** Gerente de Tráfico / Operaciones / Dueño de flotilla chica. **NO es contador ni dev.** Usa Excel, WhatsApp, celular. Odia el SAT, los rechazos y las multas.
**Dolor Crítico:** "Me rechazan timbres por CP destino inválido, vigencia expirada, clave producto mal. Pierdo horas corrigiendo en el portal del PAC o pagando contador. Me urge timbrar y que el chofer/cliente tenga el PDF en WhatsApp YA."
**Propuesta de Valor:** **Valida tu Excel ANTES de timbrar -> Corrige errores en UI -> Timbra masivo (PAC) -> Entrega XML/PDF + Link WhatsApp chofer/cliente en segundos.**
**Modelo Ingreso:** Suscripción mensual/RFC emisor + Fee por CFDI timbrado (Margen sobre costo PAC).
**Stack Decidido (Inamovible):**
- **Framework:** Next.js 14 (App Router, TypeScript strict, Server Components by default).
- **Deploy:** Vercel (Hobby/Pro) + Subdominio `app.tudominio.mx`.
- **DB/Auth/Storage:** Supabase (Postgres, Auth Magic Link, Storage S3-compatible para XML/PDF/Plantillas, **Vault para secretos**).
- **UI:** Shadcn/ui (Radix + Tailwind), Lucide Icons, `clsx`/`tailwind-merge`.
- **Validación/Forms:** Zod + React Hook Form (`@hookform/resolvers/zod`).
- **Parsing Excel:** `xlsx` (SheetJS Community) - **Solo Server Side**. ⚠️ Ver Regla de Oro #11 (fuente del paquete).
- **PAC Integración:** **Factura.com API** (Sandbox -> Prod). Endpoint `/stamp/batch` para masivo — **verificar contra documentación vigente antes de codear el mapper** (ver Regla #12). Webhooks para status.
- **WhatsApp:** Meta Cloud API (Node SDK `whatsapp-cloud-api` o fetch nativo). Plantillas (HSM): `cfdi_listo`, `error_validacion` — **solicitar aprobación en Sprint 0**, no en Sprint 4.
- **Pagos:** **Conekta** (Cuenta Persona Física Actividad Empresarial / Honorarios) - **Solo Link de Pago / Checkout simple al inicio**. Sin suscripciones automáticas complejas v1.
- **Dominio Base:** `tudominio.mx` (Config DNS: CNAME `app` -> `cname.vercel-dns.com`, TXT `_verification` Vercel, MX/SPF/DKIM Resend/SendGrid).
- **Email Transaccional:** Resend (Dominio verificado `tudominio.mx`). Magic Link Auth + Recibos de pago + Alertas sistema.

# 🧱 ARQUITECTURA TÉCNICA Y ESTRUCTURA DE CARPETAS (SINGLE REPO MONOREPO LIGERO)
carta-porte-express/
├── .github/workflows/          # CI: Lint, Typecheck, Test, Deploy Preview
├── public/                     # Favicon, robots.txt, plantilla_excel_cpe.xlsx (descarga pública)
├── src/
│   ├── app/                    # Next.js App Router (Rutas, Layouts, Server Actions)
│   │   ├── (auth)/             # Route Group: Login, Callback (Magic Link)
│   │   ├── (dashboard)/        # Route Group: Protegido por Middleware (RLS User)
│   │   │   ├── dashboard/      # Page: Dropzone, Tabla Historial, Stats cards
│   │   │   ├── proceso/[id]/   # Page: Detalle resultado (Tabs: Exitos/Errores), Acciones (Descargar ZIP, Reintentar fila, Share WA)
│   │   │   ├── config/         # Page: Datos RFC, PAC Config (Keys vía Vault), Plantilla WhatsApp, Webhooks URLs, Aviso de Privacidad
│   │   │   └── layout.tsx      # Sidebar/Nav fija (Shadcn Sidebar)
│   │   ├── api/                # Server Actions / Route Handlers (Edge donde sea posible)
│   │   │   ├── auth/           # Supabase Auth Helpers (SSR)
│   │   │   ├── procesar/       # POST: Recibe FormData (file) -> Valida -> Returns JSON {procesoId}
│   │   │   ├── timbrar/        # POST: {procesoId, indicesFila[]} -> Llama PAC Batch (con idempotency key) -> Guarda XML/PDF -> Dispara WA
│   │   │   ├── webhooks/       # POST: Factura.com (status timbrado), Meta WA (status msg), Conekta (pago)
│   │   │   ├── descargar/      # GET: Signed URL Supabase Storage (XML/PDF/ZIP) - Expiración 1h
│   │   │   └── catalogos/      # GET: Search CPs, ClaveProdServ, Unidades (Autocomplete UI) - Cached
│   │   ├── login/page.tsx      # Magic Link Form (Email) -> Supabase Auth
│   │   ├── globals.css         # Tailwind + Shadcn CSS Variables (Tema "Transporte": Azul Oscuro/Amber/Naranja Alerta)
│   │   ├── layout.tsx          # Root Layout: Providers (Supabase, React Query, Toaster), Font (Inter/Geist)
│   │   └── page.tsx            # Landing Pública (Hero, Demo Video/Gif, Beneficios, Form Lead Magnet -> DB)
│   ├── components/
│   │   ├── ui/                 # Shadcn components (Button, Table, Tabs, Dropzone, Progress, Badge, Toaster, Sidebar, Avatar, DropdownMenu, Tooltip, Skeleton)
│   │   ├── dashboard/          # Componentes compuestos: DropzoneValidator, ResultsTable, ErrorRowEditor, StatsCards, WhatsAppShareButton
│   │   ├── auth/               # MagicLinkForm
│   │   └── providers/          # SupabaseProvider, QueryProvider, ThemeProvider
│   ├── lib/
│   │   ├── supabase/           # Clients: `server.ts` (SSR), `browser.ts` (Client), `admin.ts` (Service Role - Solo Server Actions/Webhooks), `vault.ts` (helpers leer/escribir secretos PAC/WA)
│   │   ├── validators/         # **CORE IP**: `cartaPorte31Schemas.ts` (Zod Schemas completos por sección: Ubicaciones, Mercancías, Figuras, Autotransporte). `excelRowToCpeSchema.ts` (Mapeo Excel -> Zod). `validationEngine.ts` (Función pura: `validateRows(rows[]) -> {valid: [], errors: []}`). **100% Testable.**
│   │   ├── catalogos/          # `catalogoService.ts` (Carga CSVs SAT -> Supabase/JSON estático). `search.ts` (Fuzzy search PGTrgm / Fuse.js).
│   │   ├── pac/                # `facturacomClient.ts` (Typed Fetch wrapper: stamp, stampBatch, getStatus, cancel — payload validado contra doc oficial vigente). `pacMapper.ts` (Internal Validated Object -> Factura.com JSON Payload).
│   │   ├── whatsapp/           # `metaClient.ts` (Send Template, Send Media/Document). `templates.ts` (Constantes nombres plantillas + vars mapping).
│   │   ├── payments/           # `conektaClient.ts` (Create Payment Link). `webhookHandler.ts` (Verify sig, Update Plan/Status en DB).
│   │   ├── excel/              # `parser.ts` (Buffer -> JSON[] usando `xlsx` con opciones: `raw: false, dateNF: 'YYYY-MM-DD'`, tamaño máximo, sin fórmulas). `templateGenerator.ts` (Genera .xlsx plantilla válida con data validation lists).
│   │   ├── utils/               # `cn.ts` (clsx+twMerge), `formatters.ts` (Moneda MXN, Fechas SAT, RFC Mask), `errors.ts` (Clases Error tipadas: ValidationError, PacError, WhatsAppError).
│   │   └── constants/          # `satCatalogsVersion.ts`, `appConfig.ts` (Precios, Límites Free Tier, Max Rows Sync/Async).
│   ├── hooks/                  # `useProceso.ts` (React Query: fetch, mutate, poll status), `useCatalogSearch.ts`, `useWhatsAppShare.ts`
│   ├── types/                  # `database.ts` (Supabase Generated Types), `cpe.ts` (Internal Domain Types: Proceso, FilaValidada, TimbreResult), `api.ts` (Request/Response Shapes).
│   ├── middleware.ts           # **CRITICAL**: Protege `(dashboard)/*`. Verifica Session Supabase (JWT). Redirige a `/login`. Refresca Token.
│   └── scripts/                # `sync-catalogs-sat.ts` (Node script para correr manual/Cron: Baja CSVs SAT -> Upsert Supabase).
├── supabase/                   # Migraciones SQL (Schema, RLS Policies, Functions, Indexes, Storage Buckets Policies, Vault setup).
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   ├── 003_storage_buckets.sql
│   │   └── 004_catalogs_tables.sql
│   └── seed.sql                # Datos iniciales: Planes, Catálogos SAT (versión ligera), Usuario Demo.
├── tests/
│   ├── unit/validators/        # Vitest: `cartaPorte31Schemas.test.ts` (Casos SAT reales: CP inexistente, Fecha pasada, Peso 0, RFC genérico).
│   ├── unit/mappers/           # `pacMapper.test.ts`.
│   └── e2e/                    # Playwright: Flujo Login -> Subir Excel -> Ver Errores -> Corregir -> Timbrar -> Descargar.
├── .env.example                # Todas las keys necesarias (NEXT_PUBLIC_, SUPABASE_, FACTURACOM_, META_, CONEKTA_, RESEND_).
├── next.config.mjs             # Config: Images (Dominios Supabase/Meta), Headers Security, Transpile Packages.
├── package.json                # Scripts: dev, build, start, lint, typecheck, test, test:watch, db:push, db:studio, catalogs:sync.
├── tsconfig.json               # Strict: true, Path Aliases (@/*), Plugins: next.
├── tailwind.config.ts          # Theme: Colors (Primary: Azul Marino, Accent: Amber/Naranja), FontFamily.
└── README.md                   # Instrucciones: Setup Local (Supabase CLI, Vercel CLI), Variables, Cómo testear PAC Sandbox, Deploy.

# 🛡️ REGLAS DE ORO (CONSTITUCIÓN DEL CÓDIGO - LA IA DEBE OBEDECER ESTO SIEMPRE)
1.  **SEGURIDAD ANTE TODO:** NUNCA loguees XML completos, CSD, Tokens PAC, `service_role` keys. Usa `supabaseAdmin` SOLO en Server Actions/Webhooks. RLS **OBLIGATORIO** en TODAS las tablas (`auth.uid() = user_id` o `owner_id`).
2.  **VALIDACIÓN TEMPRANA:** Valida con Zod **ANTES** de llamar PAC. Si Zod pasa y PAC falla -> Error PAC manejado. Si Zod falla -> **NUNCA** llamas PAC. Ahorra dinero y tiempo.
3.  **IDEMPOTENCIA:** `procesar` crea `Proceso` + `Filas` (status: `pending_validation`). `timbrar` actualiza filas a `stamping` -> `stamped`/`error`. Reintentos seguros. **Cada llamada a `timbrar` genera/usa un `idempotency_key` por fila** (columna `filas_proceso.idempotency_key`, único), de modo que un doble clic o un retry de red no genere doble timbre ni doble cobro.
4.  **OFFLINE-FIRST MENTALITY (UI):** UI no se traba. `react-query` + `optimistic updates` para corrección de filas. Loading states esqueléticos (Shadcn Skeleton) en TODAS las tablas/listas.
5.  **MÓVIL PRIMERO:** `lg:` breakpoint es secundario. `base` (mobile) es donde vive el gerente de tráfico. Tablas: `overflow-x-auto` + `min-w-[800px]` o Card view en mobile.
6.  **TIPADO ESTRICTO:** `any` **PROHIBIDO**. `unknown` + Type Guards. Genera types de Supabase (`supabase gen types typescript`) y úsalos en `src/types/database.ts`.
7.  **SUPABASE EDGE FUNCTIONS (OPCIONAL V1):** Para `procesar` archivos > 5k filas o `timbrar` batches grandes. V1: **Server Actions Next.js (Node.js Runtime)** son suficientes y más simples. Si timeout -> Mover a Edge Function/Upstash QStash.
8.  **CATÁLOGOS SAT VERSIONADOS:** Tabla `sat_catalogos` con `version`, `type` (cp, producto, unidad), `code`, `description`, `valid_from`, `valid_to`. Script de sync actualiza `valid_to` viejos e inserta nuevos.
9.  **OBSERVABILIDAD BÁSICA:** `console.log` estructurado (JSON) en Server Actions: `{level, timestamp, userId, procesoId, action, durationMs, status}`. Vercel Logs / Axiom / Logtail gratis.
10. **NO OVER-ENGINEERING:** V1 = **Un RFC Emisor por Usuario (Owner)**. Multi-RFC/Equipos = V2. Un Plan (Piloto -> Pago). Stripe/Conekta Subscription = V2. Admin Panel = V2.
11. **SECRETOS SIEMPRE CIFRADOS:** Los tokens PAC y WhatsApp (`pac_api_key`, `pac_api_secret`, `whatsapp_access_token`) se guardan usando **Supabase Vault** desde V1, no texto plano. RLS por sí sola no es suficiente cuando el dato es una credencial que permite timbrar o enviar mensajes a nombre del cliente. Acceso solo vía `lib/supabase/vault.ts`, nunca directo desde componentes.
12. **PAQUETES DE TERCEROS — VERIFICAR VIGENCIA:** Antes de codear contra una API externa (Factura.com, Meta Cloud API, Conekta), **confirmar el contrato actual (endpoint, payload, auth) contra la documentación oficial vigente**, no asumir de memoria. Para `xlsx` (SheetJS), usar la fuente y versión recomendada actualmente por el proyecto (no simplemente "latest" de npm sin revisar advisories), limitar tamaño de archivo, y nunca evaluar fórmulas del Excel subido por el usuario.

# 🗄️ ESQUEMA DE BASE DE DATOS SUPABASE (POSTGRES) - CLAVE PARA LA IA
-- EJECUTAR EN SUPABASE SQL EDITOR (Migraciones)
-- Habilitar: `uuid-ossp`, `pg_trgm` (búsqueda CPs), `pgcrypto`, `supabase_vault`.

-- 1. Perfiles (Extiende Auth)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    full_name TEXT,
    company_name TEXT, -- Razón Social
    rfc_emisor TEXT UNIQUE NOT NULL, -- RFC Emisor Principal (V1: 1:1 User:RFC)
    regimen_fiscal_id TEXT, -- Clave SAT
    cp_emisor TEXT, -- Código Postal Emisor (Para validar Origen rápido)
    pac_provider TEXT DEFAULT 'facturacom', -- 'facturacom' | 'sapien' | 'multifacturas'
    pac_api_key_secret_id UUID, -- Referencia a Supabase Vault (secrets), NO texto plano
    pac_api_secret_secret_id UUID, -- Referencia a Supabase Vault
    whatsapp_business_account_id TEXT,
    whatsapp_phone_number_id TEXT,
    whatsapp_access_token_secret_id UUID, -- Referencia a Supabase Vault
    wa_template_cfdi_listo TEXT DEFAULT 'cfdi_listo',
    wa_template_error_validacion TEXT DEFAULT 'error_validacion',
    plan_status TEXT DEFAULT 'trial', -- 'trial', 'active', 'past_due', 'cancelled'
    trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
    privacy_notice_accepted_at TIMESTAMPTZ, -- Aviso de Privacidad (LFPDPPP) para datos de terceros (choferes/clientes)
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own profile" ON public.profiles FOR ALL USING (auth.uid() = id);

-- 2. Procesos de Carga (Batch)
CREATE TABLE public.procesos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    original_filename TEXT,
    total_rows INT DEFAULT 0,
    valid_rows INT DEFAULT 0,
    error_rows INT DEFAULT 0,
    stamped_rows INT DEFAULT 0,
    failed_rows INT DEFAULT 0,
    status TEXT DEFAULT 'uploaded', -- 'uploaded', 'validating', 'validated', 'stamping', 'completed', 'failed'
    error_summary JSONB, -- Resumen conteo errores por tipo/campo
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_procesos_user_created ON public.procesos (user_id, created_at DESC);
ALTER TABLE public.procesos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User owns procesos" ON public.procesos FOR ALL USING (auth.uid() = user_id);

-- 3. Filas Individuales (El grano fino)
CREATE TABLE public.filas_proceso (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proceso_id UUID NOT NULL REFERENCES public.procesos ON DELETE CASCADE,
    row_number INT NOT NULL, -- Fila original Excel (1-based)
    raw_data JSONB NOT NULL, -- Datos crudos Excel (Para reintentar/editar)
    validated_data JSONB, -- Datos limpios + enriquecidos (CP names, etc) - Listo para PAC Mapper
    validation_errors JSONB, -- Array {field, code, message, value} - VACÍO = VÁLIDO
    status TEXT DEFAULT 'pending', -- 'pending', 'valid', 'invalid', 'stamping', 'stamped', 'failed', 'cancelled'
    idempotency_key UUID DEFAULT uuid_generate_v4(), -- Previene doble-timbrado por doble clic/retry
    uuid_timbre TEXT, -- UUID SAT
    xml_url TEXT, -- Supabase Storage Signed URL Path
    pdf_url TEXT,
    sat_status TEXT, -- 'vigente', 'cancelado', 'no_encontrado'
    last_pac_response JSONB, -- Respuesta cruda PAC (Errores/Exito)
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX idx_filas_proceso_idempotency ON public.filas_proceso (idempotency_key);
CREATE INDEX idx_filas_proceso_status ON public.filas_proceso (proceso_id, status);
ALTER TABLE public.filas_proceso ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User owns filas via proceso" ON public.filas_proceso FOR ALL USING (
    EXISTS (SELECT 1 FROM public.procesos p WHERE p.id = filas_proceso.proceso_id AND p.user_id = auth.uid())
);

-- 4. Catálogos SAT (Versionados - pg_trgm para búsqueda)
CREATE TABLE public.sat_catalogos (
    id BIGSERIAL PRIMARY KEY,
    catalogo_type TEXT NOT NULL, -- 'cp', 'clave_prod_serv', 'unidad', 'aduanas', 'monedas', 'regimen_fiscal'
    version TEXT NOT NULL, -- '2024-01-15'
    code TEXT NOT NULL,
    description TEXT NOT NULL,
    parent_code TEXT, -- Para jerarquías (ProdServ)
    valid_from DATE NOT NULL,
    valid_to DATE, -- NULL = Vigente
    search_vector TSVECTOR GENERATED ALWAYS AS (to_tsvector('spanish', code || ' ' || description)) STORED
);
CREATE INDEX idx_sat_catalogos_type_version ON public.sat_catalogos (catalogo_type, version);
CREATE INDEX idx_sat_catalogos_search ON public.sat_catalogos USING GIN (search_vector);
-- RLS: Public Read (Anon Key) para Autocompletados UI. Service Role Write (Script Sync).

-- 5. Storage Buckets (Supabase Dashboard -> Storage)
-- Bucket: `cfdi-xml` (Private, RLS: User folder `user_id/`)
-- Bucket: `cfdi-pdf` (Private, RLS: User folder `user_id/`)
-- Bucket: `plantillas` (Public Read: `plantilla_cpe_v31.xlsx`)

-- 6. Secretos (Supabase Vault)
-- Los valores de pac_api_key, pac_api_secret y whatsapp_access_token se insertan vía
-- `select vault.create_secret(...)` y solo se referencian por su secret_id en `profiles`.
-- Lectura solo desde `lib/supabase/vault.ts` con Service Role, nunca desde el cliente.

# 🧪 PLAN DE SPRINTS (LA IA EJECUTA ESTE ORDEN, CONFIRMA AL TERMINAR CADA UNO)

## SPRINT 0: FUNDACIÓN (Día 1-2) - "Hola Mundo Seguro"
- [ ] Init Repo Next.js + TS + Tailwind + Shadcn + ESLint/Prettier + Husky.
- [ ] Config Supabase CLI local (`supabase init`, `supabase link`, `supabase db push` migraciones arriba, habilitar Vault).
- [ ] Config Vercel Project + GitHub Repo + Env Vars (`.env.local`).
- [ ] **Auth Magic Link Funcional:** `/login` -> Email -> Supabase -> Callback -> `/dashboard` (Middleware protege).
- [ ] **Layout Dashboard:** Sidebar (Nav: Dashboard, Config, Ayuda), Header (User Avatar, Plan Status Badge), Theme Toggle.
- [ ] **Landing Page (`/`):** Hero, Captura Email (Inserta en `leads` table o Resend Audience), Link `/login`.
- [ ] **Solicitar plantillas WhatsApp (HSM) en Meta Business Manager:** `cfdi_listo` y `error_validacion` — **enviar a revisión ahora**, la aprobación puede tardar días y no bloquea el resto del desarrollo mientras se espera.
- [ ] **Verificar contrato vigente de Factura.com** (`/stamp/batch`: auth, payload, límites) contra su documentación actual antes de diseñar `pacMapper.ts` en Sprint 3.
- [ ] **Deploy Preview Vercel OK.** `app.tudominio.mx` responde.

## SPRINT 1: MOTOR DE VALIDACIÓN PURO (Día 3-7) — *ampliado de 3 a 5 días: es el cuello de botella real del proyecto* - "El Cerebro Sin UI"
- [ ] **Catálogos SAT:** Script `scripts/sync-catalogs-sat.ts` baja CSVs oficiales (GitHub Gist SAT / Repo público) -> Upsert `sat_catalogos`. **Corre y verifica conteos.**
- [ ] **Zod Schemas (`lib/validators/cartaPorte31Schemas.ts`):** Modela **TODO** el Complemento Carta Porte 3.1 (Ubicaciones: Origen, Destino, Intermedios; Mercancías: Cantidad, ClaveUnidad, ClaveProdServ, PesoBruto, Descripcion, Valor, Moneda; Autotransporte: PermisoSCT, NumPermisoSCT, Placas, AnioModelo, ConfigVehicular, Carga, Seguros; Figuras: Propietario, Operador, etc.). **Usa `zod.preprocess` para limpiar strings (trim, upperCase RFC/CP).**
- [ ] **Mapeo Excel -> Schema (`lib/validators/excelRowToCpeSchema.ts`):** Define `PLANTILLA_COLUMNAS_MAP` (Constante: Columna Excel -> Path Zod). Función `mapRowToSchema(row, map)`.
- [ ] **Motor Validación (`lib/validators/validationEngine.ts`):** `validateBatch(rows[], userProfile)` -> Itera, Mapea, Valida Zod, Enriquece (Busca Nombre CP/ProdServ en Catálogos), Retorna `{ valid: FilasValida[], invalid: FilaError[] }`. **Puro TS, Sin Side Effects.**
- [ ] **TESTS UNITARIOS CRÍTICOS (Vitest):** Mínimo 20 casos: RFC válido/inválido, CP inexistente, CP Origen=Destino, Fecha Vigencia < Hoy, Fecha Vigencia > 30 días, Peso 0, ClaveProdServ no existe, Placas formato, Permiso SCT longitud. **CI debe pasar 100%.**

## SPRINT 2: FLUJO CARGA Y UI RESULTADOS (Día 8-11) - "La Experiencia Mágica"
- [ ] **Server Action `procesar` (`app/api/procesar/route.ts` o `actions/procesar.ts`):** Recibe `FormData` -> `xlsx.parse` (con límite de tamaño, sin evaluar fórmulas) -> `validationEngine` -> **Transacción Supabase:** Inserta `Proceso` + `Filas_Proceso` (Bulk Insert `validated_data` / `validation_errors`). Retorna `{procesoId, redirectUrl: /proceso/[id]}`.
- [ ] **UI Dropzone (`components/dashboard/DropzoneValidator.tsx`):** `react-dropzone` + Validación cliente (solo .xlsx/.csv, max 10MB) -> `startTransition` -> Submit Form -> Loading Overlay -> Router Push `/proceso/[id]`.
- [ ] **Página Resultados (`app/(dashboard)/proceso/[id]/page.tsx`):** **Server Component** (Fetch `Proceso` + `Filas` con `status != 'pending'`). Renderiza **Tabs Shadcn**:
    - Tab "✅ Listos para Timbrar" (Count). Tabla: Fila, RFC Receptor, Origen -> Destino, Mercancía, Peso, **Acciones**.
    - Tab "❌ Errores de Validación" (Count). **Tabla Editable Crítica:** Columnas: Fila, Campo Error, Valor Actual (Input editable), Mensaje Error, **Botón "Guardar y Re-validar Fila"**.
- [ ] **Server Action `revalidarFila(procesoId, filaId, correctedData)`:** Actualiza `raw_data` -> Vuelve a `validationEngine` solo esa fila -> Actualiza `Filas_Proceso` (validated_data/errors/status). **React Query Invalidate** -> UI actualiza instantáneo.
- [ ] **Descarga ZIP (`app/api/descargar/route.ts`):** Recibe `procesoId`, `tipo` (`xml`|`pdf`|`zip_todos`). Genera ZIP en memoria (`archiver`/`fflate`) con archivos de Supabase Storage -> Stream Response. **Sin guardar ZIP en disco.**

## SPRINT 3: TIMBRADO MASIVO Y ENTREGA (Día 12-15) - "Donde cae el Dinero"
- [ ] **PAC Mapper (`lib/pac/pacMapper.ts`):** `buildFacturaComPayload(filaValidada, profileConfig)` -> JSON Exacto Factura.com `/stamp/batch` (contrato ya verificado en Sprint 0). **Maneja: CfdiRelacionados, Complemento Carta Porte 3.1 anidado, Impuestos, Totales.**
- [ ] **Server Action `timbrarProceso(procesoId, filaIds[])`:**
    1.  Fetch filas `status='valid'`.
    2.  **Lock optimista:** marca filas como `stamping` con su `idempotency_key` antes de llamar al PAC, para bloquear doble envío por doble clic/retry.
    3.  Build Payload Batch (incluye `idempotency_key` por fila si el PAC lo soporta).
    4.  Call `facturacomClient.stampBatch(payload)`.
    5.  **Procesa Respuesta:** Itera resultados PAC.
        - Éxito: Guarda XML/PDF en Storage (`user_id/procesoId/uuid.xml`) -> Actualiza Fila (`status='stamped'`, `xml_url`, `pdf_url`, `uuid_timbre`).
        - Error PAC: Actualiza Fila (`status='failed'`, `last_pac_response`).
    6.  Actualiza `Proceso` contadores.
    7.  **Dispara WhatsApp (Fire & Forget / Background):** `metaClient.sendTemplate(...)` para cada fila `stamped` (Chofer/Cliente si hay tel en datos).
- [ ] **UI Botón "Timbrar Seleccionados" / "Timbrar Todos Válidos":** Confirmación Modal (Shadcn AlertDialog) -> Botón deshabilitado tras el primer clic (evita doble submit) -> Llama Action -> Polling Status (React Query `refetchInterval: 3000`) -> Toast "¡Listo! 45 timbrados, 2 errores".
- [ ] **Webhook Factura.com (`app/api/webhooks/facturacom/route.ts`):** Recibe callback status (Por si batch async) -> Actualiza Fila/Proceso. **Verifica Firma HMAC.**

## SPRINT 4: WHATSAPP, PAGOS Y PULIDO (Día 16-19)
- [ ] **Config WhatsApp (`app/(dashboard)/config/page.tsx`):** Formulario: WABA ID, Phone ID, Token (guardado vía Vault), Nombres Plantillas (Inputs + Test Button "Enviar Msg Prueba a Mi Número"). Confirma que las plantillas solicitadas en Sprint 0 ya fueron aprobadas; si no, dar seguimiento con Meta.
- [ ] **Conekta Payment Link (`lib/payments/conektaClient.ts`):** `createPaymentLink(amount, currency='MXN', customerInfo, metadata{userId, plan})` -> Returns `url`.
- [ ] **Página Config Plan (`app/(dashboard)/config/plan/page.tsx`):** Muestra Status (Trial Días Restantes / Activo). Botón "Pagar Suscripción" -> Llama Server Action -> Crea Link Conekta -> Redirect.
- [ ] **Webhook Conekta (`app/api/webhooks/conekta/route.ts`):** `payment.paid` -> Actualiza `Profile.plan_status='active'`, `trial_ends_at = now() + 1 year` (o mes). **Verifica Firma.**
- [ ] **Plantilla Excel Descargable (`public/plantilla_cpe_v31.xlsx`):** Generada por `lib/excel/templateGenerator.ts` (Headers exactos, Listas Validación Datos para CP, ClaveProdServ, Unidad, ConfigVehicular). Link en Dashboard y Landing.
- [ ] **Aviso de Privacidad (LFPDPPP):** Página simple cubriendo datos de terceros (choferes, clientes) capturados vía Excel. Checkbox de aceptación en onboarding (`profiles.privacy_notice_accepted_at`).
- [ ] **Pulido UX:** Toasts (Sonner), Empty States ilustrados, Error Boundaries, Loading Skeletons, Confirmaciones destructivas, Responsive Mobile Check (iPhone SE / Android pequeño).

## SPRINT 5: PILOTO Y LAUNCH (Día 20-22)
- [ ] **Onboarding Pilotos (Manual):** Crea Users en Supabase Auth (Invite Link) -> Ellos entran, configuran PAC Keys (vía Vault), Suben su Excel real.
- [ ] **Soporte Reactivo:** Logs Vercel + Supabase Logs abiertos. Fix bugs **en caliente** (Hotfix -> Push -> Vercel Deploy < 3 min).
- [ ] **Cierre Piloto -> Cobro:** Genera Link Conekta manual si webhook falla. **Factura 4.0 Honorarios (Tu RFC) -> Envía XML/PDF al Cliente.**
- [ ] **Documentación Mínima (`/docs` o Notion):** "Cómo llenar plantilla", "Cómo configurar PAC", "Significado de Errores Comunes".

# 📝 INSTRUCCIONES DE INTERACCIÓN PARA LA IA
1.  **NO ESCRIBAS CÓDIGO HASTA QUE YO DIGA "ADELANTE CON SPRINT X".**
2.  Preséntame **Plan de Archivos a Crear/Modificar** antes de codear cada Sprint.
3.  **Pregunta si hay ambigüedad** en mapeo Excel->SAT o Payload PAC. No asumas.
4.  **Genera Tests** para toda lógica pura (`lib/validators`, `lib/pac/mapper`, `lib/excel/parser`).
5.  **Commits Atómicos y Convencionales:** `feat(validators): add carta porte 3.1 zod schemas`, `fix(api): handle pac batch timeout`.
6.  **Output:** Código completo, compilable, con imports correctos, comentarios JSDoc en funciones públicas complejas.
7.  **Idioma:** Código/Comentarios/Variables en **Inglés**. UI/User-facing Strings en **Español (México)**. Commits en Inglés.
8.  **Antes de codear contra Factura.com, Meta Cloud API o Conekta, confirma el contrato vigente (endpoint/payload/auth) contra documentación oficial actual** — no asumas de memoria de entrenamiento.

# 🚀 PRIMERA TAREA INMEDIATA
**Genera la estructura de carpetas completa (`tree` output), `package.json` con dependencias exactas (versiones latest compatibles), `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `.env.example`, `middleware.ts` (Auth Guard), `supabase/client` (server/browser/admin/vault), `src/types/database.ts` (Tipos generados supabase - placeholders), y el `README.md` con instrucciones de setup local.**
**ESPERA MI "ADELANTE CON SPRINT 1" PARA EMPEZAR LA LÓGICA DE NEGOCIO.**
