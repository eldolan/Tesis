# Project Profile

> Generado por sdd-init — actualizar en cada re-ejecución (upsert, no duplicar)
> Última actualización: 2026-05-24 (actualizado por sdd-init: fix-notifications-scroll-native)

## Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.2 |
| Lenguaje | TypeScript | ^5 |
| Runtime UI | React | 19.2.4 |
| Base de datos | Supabase (PostgreSQL + RLS + Realtime) | @supabase/supabase-js ^2.101.1 |
| Auth + SSR | Supabase Auth + `@supabase/ssr` (`createBrowserClient`/`createServerClient`) | `@supabase/ssr ^0.10.0` |
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

## Tablas Supabase (estado post multi-tenant-sensor-isolation)

| Tabla | user_id | RLS | Notas |
|-------|---------|-----|-------|
| `sensor_riego_20` | NOT NULL FK auth.users | PASS auth.uid()=user_id | Eliminadas cols temperatura_onboard/humedad_onboard |
| `sensor_riego_40` | NOT NULL FK auth.users | PASS auth.uid()=user_id | Eliminadas cols temperatura_onboard/humedad_onboard |
| `sensor_riego_60` | NOT NULL FK auth.users | PASS auth.uid()=user_id | Eliminadas cols temperatura_onboard/humedad_onboard |
| `sensor_fertilizante` | NOT NULL FK auth.users | PASS auth.uid()=user_id | — |
| `notifications` | NOT NULL FK auth.users | PASS auth.uid()=user_id | Nueva |
| `decisiones_riego` | NOT NULL FK auth.users | PASS auth.uid()=user_id | Nueva |
| `chat_sessions` | NOT NULL FK auth.users | PASS auth.uid()=user_id | Nueva |
| `documents` | NOT NULL FK auth.users | PASS auth.uid()=user_id | Nueva |
| `device_api_keys` | NOT NULL FK auth.users | service_role only | Nueva — mapeo API key → user |
| `sensor_onboard` | NOT NULL FK auth.users | PASS auth.uid()=user_id | Nueva — temp/hum dispositivo IoT |

## Variables de entorno

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anon (browser + server actual) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role — usada en supabaseAdmin para device_api_keys |
| `OPENWEATHER_API_KEY` | API clima |
| `SENSOR_API_KEY` | (obsoleta — reemplazada por device_api_keys SHA-256) |
| `N8N_WEBHOOK_URL` | Webhook n8n para chat agrícola |
| `N8N_AUTH_TOKEN` | Token auth n8n |

## Patrones de código existentes

- **Auth**: `useAuth()` hook desde `AuthContext` — expone `user: User | null`
- **Supabase browser client**: `createBrowserClient` de `@supabase/ssr` en `src/lib/supabase/client.ts`
- **Supabase server client**: `createServerClient` de `@supabase/ssr` con `await cookies()` en `src/lib/supabase/server.ts`
- **Supabase admin**: `supabaseAdmin` con `service_role` key — usada solo en API routes server-side
- **Auth proxy**: `src/proxy.ts` — Next.js 16 proxy (equivalente a middleware.ts) con refresh de sesión y protección de rutas
- **Realtime**: suscripciones `postgres_changes` con filtro `user_id=eq.<uuid>` en hooks `use-*-data.ts`
- **Ingesta IoT**: `/api/upload` resuelve `user_id` desde X-API-Key header via SHA-256 lookup en `device_api_keys`
- **Migrations**: `supabase/migrations/` — 001_initial.sql (base) + 002_multi_tenant.sql (este cambio)

## Notas de arquitectura

- RLS activo en todas las tablas de datos — policies `auth.uid() = user_id` para browser, `service_role` para ingesta
- `device_api_keys` solo accesible por service_role (sin policy browser)
- La función `proxy` (Next.js 16) excluye `/api/upload` del matcher para permitir ingesta sin cookie de sesión
- Los hooks implementan doble defensa: RLS en DB + `.eq("user_id", user.id)` en query explícita
- `@supabase/ssr ^0.10.0` incorporado al stack como dependencia de producción
