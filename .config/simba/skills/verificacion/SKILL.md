---
name: verificacion
description: Cómo se trabaja y se verifica este proyecto, según `simba init --estudio`.
---

Dashboard web de riego y cultivo (paquete `tesis-nextjs`) en Next.js 16 con App Router, React 19 y TypeScript `strict`. Gestor: pnpm (`packageManager: pnpm@10.33.0`, `pnpm-lock.yaml`).

## Estructura

- `src/app/`: páginas (`page.tsx`, `login/`) y rutas API en `src/app/api/*/route.ts` (auth/rate-limit, chat, cities, cultivo, preferences, upload, weather).
- `src/components/dashboard/`: widgets del dashboard (gráfico de riego, timeline de la planta, chat, clima, estado del sistema).
- `src/components/ui/`: componentes shadcn (`components.json`), con Tailwind 4.
- `src/hooks/`, `src/contexts/`, `src/lib/` (lógica: `irrigation-detection.ts`, `cultivo.ts`, `csv-parser.ts`), `src/types/`.
- `src/lib/supabase/client.ts` y `server.ts`: clientes Supabase; `server.ts` crea `supabaseAdmin` al cargar el módulo con `SUPABASE_SERVICE_ROLE_KEY`.
- `src/proxy.ts`: proxy/middleware de Next con sesión de Supabase.
- Alias de importación: `@/*` → `./src/*`.

## Variables de entorno

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `N8N_WEBHOOK_URL`, `N8N_AUTH_TOKEN`, `OPENWEATHER_API_KEY`. Los archivos `.env*` están en `.gitignore`: no se commitean. Los comentarios del código están en español.

## Cómo se verifica

El proyecto no tiene tests. Un criterio de comportamiento se verifica leyendo el código contra el criterio y con la compuerta, sin exigir un test.

La única compuerta es el build, que además chequea los tipos:

```
env NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key SUPABASE_SERVICE_ROLE_KEY=placeholder-service-role-key pnpm run build
```

Las variables de Supabase son de relleno: sin ellas el build falla, porque los clientes se crean al cargar el módulo (`process.env.X!.trim()`). Antes hay que instalar las dependencias con `pnpm install --frozen-lockfile`.
