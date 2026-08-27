# CartaPorteExpress

Micro-SaaS B2B para validar y timbrar CFDI 4.0 con Complemento Carta Porte 3.1, pensado para
flotillas chicas (5-50 unidades) en México. Ver `CLAUDE.md` para el contexto de producto completo,
el stack decidido y las reglas de oro del proyecto.

## Stack

Next.js 14 (App Router, TS strict) · Supabase (Postgres, Auth, Storage, Vault) · Shadcn/ui
(Tailwind v4 + Base UI) · Zod + React Hook Form · React Query · Factura.com (PAC) · Meta Cloud API
(WhatsApp) · Conekta (pagos).

## Setup local

### Requisitos

- Node 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`supabase --version`)
- Docker Desktop corriendo (lo usa `supabase start` para levantar Postgres/Auth/Storage local)

### 1. Instalar dependencias

```bash
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Para desarrollo contra un proyecto Supabase local, corre `npm run db:start` y copia la `API URL`,
`anon key` y `service_role key` que imprime al terminar (también disponibles con `npm run db:studio`,
que en realidad ejecuta `supabase status`). Para desarrollo contra un proyecto Supabase en la nube,
usa las keys de **Project Settings -> API** del dashboard.

### 3. Base de datos

```bash
npm run db:start   # levanta Supabase local (Docker) y aplica supabase/migrations + seed.sql
# o, contra un proyecto ya linkeado (`supabase link`):
npm run db:push
```

Regenerar los tipos de TypeScript después de cualquier cambio de esquema:

```bash
npm run db:types
```

### 4. Levantar la app

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Scripts

| Script                  | Qué hace                                                            |
| ----------------------- | ------------------------------------------------------------------- |
| `npm run dev`           | Servidor de desarrollo Next.js                                      |
| `npm run build`         | Build de producción                                                 |
| `npm run lint`          | ESLint                                                              |
| `npm run typecheck`     | `tsc --noEmit`                                                      |
| `npm test`              | Vitest (una vez)                                                    |
| `npm run test:watch`    | Vitest en modo watch                                                |
| `npm run format`        | Prettier (escribe)                                                  |
| `npm run db:start`      | Levanta Supabase local y aplica migraciones                         |
| `npm run db:push`       | Aplica migraciones a un proyecto Supabase linkeado                  |
| `npm run db:types`      | Regenera `src/types/database.ts` desde el esquema local             |
| `npm run catalogs:sync` | Sincroniza catálogos SAT (`sat_catalogos`) — disponible en Sprint 1 |

## Integraciones externas (verificar antes de codear)

Por Regla de Oro #12 del `CLAUDE.md`: antes de tocar código contra Factura.com, Meta Cloud API o
Conekta, confirmar el contrato vigente (endpoint/payload/auth) contra su documentación oficial
actual — no asumir de memoria. Las plantillas de WhatsApp (`cfdi_listo`, `error_validacion`) deben
solicitarse en Meta Business Manager desde Sprint 0, ya que la aprobación puede tardar días.

## Deploy

Proyecto pensado para Vercel. Configura las mismas variables de `.env.example` como Environment
Variables del proyecto en Vercel (Production y Preview), y apunta el dominio `app.tudominio.mx`
como subdominio del proyecto.
