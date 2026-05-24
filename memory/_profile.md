# Project Profile

> Generado por sdd-init — actualizar en cada re-ejecución (upsert, no duplicar)
> Última actualización: 2026-05-23

## Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.2 |
| Lenguaje | TypeScript | ^5 |
| Runtime UI | React | 19.2.4 |
| Base de datos | Supabase (PostgreSQL + RLS + Realtime) | @supabase/supabase-js ^2.101.1 |
| Auth | Supabase Auth (`auth.users`) | via `@supabase/ssr ^0.10.0` |
| Estilos | Tailwind CSS | ^4 |
| Componentes | shadcn/ui + Base UI | shadcn ^4.1.2, @base-ui/react ^1.3.0 |
| Charts | Recharts | ^3.8.0 |
| Animaciones | Framer Motion | ^12.38.0 |
| Deploy | Vercel | — |
| Orquestación IA | n8n (webhook) | externo |
| Linter | ESLint (eslint-config-next) | ^9 |
| Bundler | Next.js built-in (webpack/turbopack) | — |

## Arquitectura del proyecto

```
src/
  app/                    # App Router de Next.js
    api/
      auth/rate-limit/   # Rate limiting auth
      chat/              # Proxy → n8n webhook (agente agrícola)
      cities/            # Ciudades chilenas
      weather/           # OpenWeather API
    layout.tsx           # Root layout con AuthProvider
    page.tsx             # SPA: login → dashboard
  components/
    auth/                # LoginForm
    dashboard/           # DashboardGrid, IrrigationChart, FertilizerChart,
                         # SoilChat, SystemStatus, WeatherWidget, PlantTimeline
    ui/                  # Componentes base (shadcn)
    layout/              # Navbar, MobileSidebar
  contexts/
    auth-context.tsx     # AuthProvider + useAuth (Supabase Auth)
  hooks/
    use-irrigation-data.ts    # Queries sensor_riego_20/40/60 + Realtime
    use-fertilizer-data.ts    # Queries sensor_fertilizante + Realtime
  lib/
    supabase/
      client.ts          # Singleton cliente browser (anon key)
      server.ts          # Singleton cliente server (anon key — pendiente service_role)
    utils.ts
  types/
    index.ts             # SensorRiego, SensorFertilizante, IrrigationData, FertilizerData
```

## Tablas Supabase relevantes al cambio

| Tabla | Estado actual | Necesita user_id |
|-------|--------------|-----------------|
| `sensor_riego_20` | Sin user_id, sin RLS | Sí |
| `sensor_riego_40` | Sin user_id, sin RLS | Sí |
| `sensor_riego_60` | Sin user_id, sin RLS | Sí |
| `sensor_fertilizante` | Sin user_id, sin RLS | Sí |
| `notifications` | Desconocido | Sí |
| `decisiones_riego` | Desconocido | Sí |
| `chat_sessions` | Desconocido | Sí |
| `documents` | Desconocido | Sí |

## Variables de entorno

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anon (browser + server actual) |
| `OPENWEATHER_API_KEY` | API clima |
| `SENSOR_API_KEY` | Ingesta de sensores (n8n o externo) |
| `N8N_WEBHOOK_URL` | Webhook n8n para chat agrícola |
| `N8N_AUTH_TOKEN` | Token auth n8n |

## Patrones de código existentes

- **Auth**: `useAuth()` hook desde `AuthContext` — expone `user: User | null`
- **Supabase client**: singleton `getSupabase()` — cliente browser con anon key
- **Realtime**: suscripciones `postgres_changes` en hooks `use-*-data.ts`
- **Queries actuales**: sin filtro `user_id` — datos compartidos entre todos los usuarios
- **API routes**: proxy a n8n, session_id generado en cliente (no vinculado a `auth.uid()`)

## Notas de arquitectura

- El cliente Supabase usa `anon key` tanto en browser como en server — para RLS debe pasarse el JWT del usuario autenticado
- No existe `supabase/migrations/` detectado — migraciones a aplicar vía MCP o SQL directo
- `server.ts` actualmente no usa `@supabase/ssr` cookieStore — pendiente corrección para SSR auth
- La rama feature ya existe: `feature/multi-tenant-sensor-isolation`
