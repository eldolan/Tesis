---
type: spec
title: "Hooks useIrrigationData y useFertilizerData filtran datos por usuario autenticado"
capability: auth-integration
slug: hooks-user-filter
domain: feature
delta_type: code-change
supersedes: null
superseded_by: null
status: completed
assigned_agent: null
priority: high
depends_on: [ssr-supabase-client, rls-policies-sensors]
change_ref: multi-tenant-sensor-isolation
acceptance_criteria:
  - useIrrigationData y useFertilizerData usan el cliente browser con sesión (createBrowserClient)
  - Las suscripciones Realtime incluyen filtro user_id=eq.<uuid> para recibir solo eventos del usuario
  - Los tipos de retorno de los hooks incluyen user_id en las entidades SensorRiego y SensorFertilizante
  - Con RLS activo, los hooks no pueden recibir datos de otros usuarios aunque modifiquen la query
related: [ssr-supabase-client, rls-policies-sensors, frontend-onboard-query]
affects:
  - src/hooks/use-irrigation-data.ts
  - src/hooks/use-fertilizer-data.ts
  - src/types/index.ts
adrs: []
scope: src/hooks/
verified_at: 2026-05-23
---

## Purpose

Actualizar los hooks de datos de sensores para que utilicen el cliente Supabase con sesión de usuario, de modo que tanto las queries iniciales como las suscripciones Realtime filtren automáticamente los datos del usuario autenticado, sin exponer datos de otros usuarios.

## Requirements

- Los hooks `useIrrigationData` y `useFertilizerData` SHALL usar el cliente browser creado con `createBrowserClient` de `@supabase/ssr` en vez del cliente actual sin sesión.
- Las suscripciones Realtime en ambos hooks SHALL incluir un filtro de canal con `filter: 'user_id=eq.<user_id>'` para recibir únicamente eventos de inserción del usuario autenticado.
- Los hooks SHALL obtener el `user_id` del usuario autenticado llamando a `supabase.auth.getUser()` antes de establecer la suscripción Realtime.
- El tipo `SensorRiego` en `src/types/index.ts` SHALL agregar el campo `user_id: string`.
- El tipo `SensorFertilizante` en `src/types/index.ts` SHALL agregar el campo `user_id: string`.
- Si el usuario no está autenticado, los hooks SHOULD retornar arrays vacíos y no establecer suscripciones Realtime.

## Scenarios

**Scenario 1 — Hook retorna solo datos del usuario autenticado**

GIVEN que el usuario A está autenticado en el browser  
AND tiene 5 registros en `sensor_riego_20` con `user_id = uuid-A`  
AND existen 3 registros de otro usuario en la misma tabla  
WHEN `useIrrigationData` ejecuta su query inicial  
THEN retorna exactamente 5 registros correspondientes al usuario A  
AND no incluye registros de otros usuarios

**Scenario 2 — Suscripción Realtime recibe solo eventos del usuario**

GIVEN que el usuario A está autenticado y tiene la suscripción Realtime activa  
WHEN el dispositivo IoT del usuario A inserta un nuevo registro en `sensor_riego_20`  
THEN el hook recibe el evento de inserción y actualiza el estado local  
WHEN otro usuario inserta en `sensor_riego_20`  
THEN el hook NO recibe ese evento

**Scenario 3 — Hook sin usuario autenticado retorna vacío**

GIVEN que no hay usuario autenticado en el browser  
WHEN se renderiza un componente que usa `useIrrigationData`  
THEN el hook retorna un array vacío  
AND no intenta establecer suscripción Realtime  
AND no genera errores de runtime

**Scenario 4 — Tipo SensorRiego incluye user_id**

GIVEN que `src/types/index.ts` ha sido actualizado  
WHEN TypeScript compila los hooks  
THEN puede acceder a `data[0].user_id` sin error de tipo en `useIrrigationData`

## Acceptance Criteria

- `useIrrigationData` y `useFertilizerData` importan el cliente desde `@supabase/ssr` (o wrapper que lo use).
- Los canales Realtime tienen `filter: 'user_id=eq.<user_id>'` en su configuración.
- Con usuario A autenticado, los hooks no retornan datos de usuario B aunque existan en la tabla.
- `npx tsc --noEmit` no reporta errores en los archivos de hooks tras los cambios de tipos.
