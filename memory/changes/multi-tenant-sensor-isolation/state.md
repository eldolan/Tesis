# State — multi-tenant-sensor-isolation

## Metadata

| Campo | Valor |
|-------|-------|
| change_name | multi-tenant-sensor-isolation |
| domain | feature |
| fast_path | full |
| tier | standard |
| model | sonnet |
| feature_branch | feature/multi-tenant-sensor-isolation |
| integration_target | develop |
| created | 2026-05-23 |
| updated | 2026-05-23 |

## Intent

Aislar datos de sensores por usuario individual (`auth.users`). Cada usuario tiene su propio dispositivo IoT. Separar lecturas onboard (temperatura/humedad del dispositivo) a tabla dedicada `sensor_onboard`.

**Tablas a modificar:**
- `sensor_riego_20`, `sensor_riego_40`, `sensor_riego_60` — agregar `user_id` + eliminar columnas `temperatura_onboard`, `humedad_onboard`
- `sensor_fertilizante` — agregar `user_id`
- `notifications` — agregar `user_id`
- `decisiones_riego` — agregar `user_id`
- `chat_sessions` — agregar `user_id`
- `documents` — agregar `user_id`

**Tablas nuevas:**
- `device_api_keys` — mapeo API key a `user_id`
- `sensor_onboard` — lecturas de temperatura y humedad del sensor onboard del dispositivo IoT

**Alcance del cambio:**
1. Migraciones SQL: agregar columna `user_id uuid references auth.users(id)` + índices + crear `sensor_onboard` + eliminar columnas onboard
2. RLS policies: enable RLS en cada tabla + policy `user_id = auth.uid()`
3. Ingesta: actualizar escrituras de sensores para incluir `user_id` y separar datos onboard
4. Frontend queries: filtrar por usuario autenticado en hooks + apuntar datos onboard a nueva tabla
5. Supabase client: pasar JWT en cliente para que RLS funcione correctamente
6. API chat: vincular `session_id` a `auth.uid()`

## Phases

| Fase | Status | Completada |
|------|--------|-----------|
| sdd-init | done | 2026-05-23 |
| sdd-explore | done | 2026-05-23 |
| sdd-propose | done | 2026-05-23 |
| sdd-spec | done | 2026-05-23 |
| sdd-design | done | 2026-05-23 |
| sdd-tasks | done | 2026-05-23 |
| sdd-apply | done | 2026-05-23 |
| sdd-verify | done | 2026-05-23 |
| sdd-archive | pending | — |

## Tracking

```yaml
phases_completed:
  - sdd-init
  - sdd-explore
  - sdd-propose
  - sdd-spec
  - sdd-design
  - sdd-tasks
  - sdd-apply
  - sdd-verify
current_phase: sdd-archive
status: active
spec_refs:
  - data-isolation/user-id-column-sensors
  - data-isolation/rls-policies-sensors
  - data-isolation/device-api-keys-table
  - data-isolation/new-tables-schema
  - onboard-normalization/sensor-onboard-table
  - onboard-normalization/frontend-onboard-query
  - auth-integration/ssr-supabase-client
  - auth-integration/middleware-auth
  - auth-integration/hooks-user-filter
  - sensor-ingestion/api-upload-user-resolution
  - sensor-ingestion/api-upload-onboard-write
updated: 2026-05-23T18:00:00
adrs:
  - 0001-api-key-auth-via-sha256-hash-lookup
  - 0002-supabase-ssr-client-pattern
  - 0003-rls-user-id-per-row-isolation
```
