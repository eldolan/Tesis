---
type: spec
title: "Integración @supabase/ssr para clientes browser y server con propagación de sesión"
capability: auth-integration
slug: ssr-supabase-client
domain: feature
delta_type: code-change
supersedes: null
superseded_by: null
status: completed
assigned_agent: null
priority: critical
depends_on: []
change_ref: multi-tenant-sensor-isolation
acceptance_criteria:
  - El paquete @supabase/ssr está instalado en package.json
  - src/lib/supabase/client.ts usa createBrowserClient de @supabase/ssr
  - src/lib/supabase/server.ts usa createServerClient de @supabase/ssr con manejo de cookies
  - Las queries desde hooks de browser envían JWT de sesión y RLS aplica correctamente
related: [rls-policies-sensors, middleware-auth, hooks-user-filter]
affects:
  - package.json
  - src/lib/supabase/client.ts
  - src/lib/supabase/server.ts
adrs: []
scope: src/lib/supabase/
verified_at: 2026-05-23
---

## Purpose

Reemplazar el cliente Supabase actual (que no propaga la sesión de usuario) por los helpers de `@supabase/ssr`, permitiendo que las policies RLS filtren automáticamente los datos según el usuario autenticado tanto en el browser como en el servidor Next.js.

## Requirements

- El proyecto SHALL instalar `@supabase/ssr` como dependencia en `package.json`.
- El archivo `src/lib/supabase/client.ts` SHALL exportar un cliente browser creado con `createBrowserClient` de `@supabase/ssr`, que propague las cookies de sesión automáticamente.
- El archivo `src/lib/supabase/server.ts` SHALL exportar una función `createSupabaseServerClient()` que use `createServerClient` de `@supabase/ssr` con acceso a `cookies()` de Next.js para propagar la sesión en Server Components y API Routes.
- El cliente browser MUST usar las mismas variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` que el cliente actual.
- El cliente server SHOULD diferenciar entre el cliente con sesión de usuario (para queries RLS-aware) y el cliente admin con service role key (para operaciones privilegiadas como la ingesta).

## Scenarios

**Scenario 1 — Cliente browser propaga JWT en queries**

GIVEN que el usuario A ha iniciado sesión en el browser  
AND el cliente Supabase usa `createBrowserClient`  
WHEN se ejecuta una query desde un hook de React (`useIrrigationData`)  
THEN la query incluye el JWT de sesión en el header de Authorization  
AND RLS filtra automáticamente retornando solo filas con `user_id = uuid-A`

**Scenario 2 — Cliente server propaga cookies de sesión**

GIVEN que el usuario A tiene una sesión activa con cookies en el browser  
WHEN un Server Component ejecuta una query usando `createSupabaseServerClient()`  
THEN el cliente lee las cookies de sesión y propaga el JWT  
AND la query retorna solo datos del usuario A

**Scenario 3 — Sin sesión activa el cliente retorna conjunto vacío**

GIVEN que no hay usuario autenticado (sesión expirada o no iniciada)  
WHEN un hook de React ejecuta una query a `sensor_riego_20`  
THEN RLS retorna 0 filas (no hay sesión activa, `auth.uid()` es null)  
AND la aplicación muestra un estado de no autenticado o redirige al login

**Scenario 4 — Cliente admin (service role) funciona independientemente**

GIVEN que el endpoint `/api/upload` usa `supabaseAdmin` con service role key  
AND NO usa `createBrowserClient` ni `createServerClient`  
WHEN inserta datos de sensores con `user_id` resuelto desde API key  
THEN la inserción es exitosa sin depender de cookies de sesión

## Acceptance Criteria

- `package.json` lista `@supabase/ssr` como dependencia.
- `src/lib/supabase/client.ts` usa `createBrowserClient` importado de `@supabase/ssr`.
- `src/lib/supabase/server.ts` usa `createServerClient` importado de `@supabase/ssr` con `cookies()`.
- Una query desde el hook `useIrrigationData` con usuario autenticado retorna solo las filas del usuario.
- `npx tsc --noEmit` pasa sin errores en los archivos de cliente Supabase.
