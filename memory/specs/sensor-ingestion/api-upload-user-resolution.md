---
type: spec
title: "Endpoint /api/upload resuelve user_id desde API key antes de insertar"
capability: sensor-ingestion
slug: api-upload-user-resolution
domain: feature
delta_type: code-change
supersedes: null
superseded_by: null
status: completed
assigned_agent: null
priority: critical
depends_on: [device-api-keys-table, user-id-column-sensors]
change_ref: multi-tenant-sensor-isolation
acceptance_criteria:
  - El endpoint calcula sha256 de X-API-Key y busca en device_api_keys para obtener user_id
  - Si la API key no está registrada, retorna HTTP 401
  - Todos los inserts de sensores incluyen el user_id resuelto
  - El firmware del dispositivo IoT no necesita cambios (sigue enviando X-API-Key como antes)
related: [device-api-keys-table, api-upload-onboard-write, user-id-column-sensors]
affects:
  - src/app/api/upload/route.ts
adrs: []
scope: src/app/api/upload/
verified_at: 2026-05-23
---

## Purpose

Modificar el endpoint `/api/upload` para que, a partir de la API key existente del dispositivo IoT, resuelva el `user_id` del propietario consultando la tabla `device_api_keys`, y propague ese `user_id` en todos los inserts de datos de sensores, sin requerir cambios en el firmware del dispositivo.

## Requirements

- El endpoint SHALL calcular el hash SHA-256 del valor de `X-API-Key` antes de consultar `device_api_keys`.
- El endpoint SHALL consultar la tabla `device_api_keys` usando `supabaseAdmin` para obtener el `user_id` correspondiente al hash de la API key.
- Si no se encuentra el hash en `device_api_keys`, el endpoint SHALL retornar `HTTP 401 Unauthorized` y no insertar ningún dato.
- Todos los inserts en `sensor_riego_20`, `sensor_riego_40`, `sensor_riego_60` y `sensor_fertilizante` SHALL incluir el campo `user_id` con el valor resuelto.
- El endpoint MUST seguir usando `supabaseAdmin` (service role) para los inserts, ya que RLS con service role bypass permite insertar con `user_id` arbitrario (resuelto por el backend, no por el JWT del dispositivo).
- El lookup de `device_api_keys` SHOULD realizarse una sola vez por request (no por cada fila del CSV).

## Scenarios

**Scenario 1 — API key válida resuelve user_id e inserta datos**

GIVEN que el dispositivo IoT envía un CSV a `/api/upload` con header `X-API-Key: abc123`  
AND existe en `device_api_keys` el registro `{key_hash: sha256('abc123'), user_id: uuid-A}`  
WHEN el endpoint procesa la request  
THEN calcula `sha256('abc123')` y obtiene `user_id = uuid-A`  
AND inserta todas las filas del CSV con `user_id = uuid-A` en las tablas de sensores  
AND retorna HTTP 200 con el conteo de filas insertadas

**Scenario 2 — API key desconocida retorna 401**

GIVEN que el dispositivo envía `X-API-Key: desconocida`  
AND no existe ningún registro en `device_api_keys` con ese hash  
WHEN el endpoint intenta resolver el `user_id`  
THEN retorna HTTP 401  
AND no inserta ninguna fila en ninguna tabla de sensores

**Scenario 3 — Ausencia de X-API-Key retorna 401**

GIVEN que la request a `/api/upload` no incluye el header `X-API-Key`  
WHEN el endpoint procesa la request  
THEN retorna HTTP 401 inmediatamente  
AND no realiza ninguna consulta a `device_api_keys`

**Scenario 4 — Un lookup por request, no por fila del CSV**

GIVEN que el CSV contiene 100 filas de datos de sensores  
WHEN el endpoint procesa la request  
THEN realiza exactamente una consulta a `device_api_keys` para resolver el `user_id`  
AND usa el mismo `user_id` resuelto para los 100 inserts del batch

## Acceptance Criteria

- Una request con `X-API-Key` registrada en `device_api_keys` resulta en inserts con `user_id` correcto en las tablas de sensores.
- Una request con `X-API-Key` no registrada retorna HTTP 401 sin realizar inserts.
- Los logs del endpoint muestran el `user_id` resuelto para cada request exitosa.
- El firmware del dispositivo IoT no requiere modificaciones de protocolo.
