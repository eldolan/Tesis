---
type: spec
title: "Tabla device_api_keys para mapeo API key a user_id"
capability: data-isolation
slug: device-api-keys-table
domain: feature
delta_type: schema-change
supersedes: null
superseded_by: null
status: completed
assigned_agent: null
priority: high
depends_on: [user-id-column-sensors]
change_ref: multi-tenant-sensor-isolation
acceptance_criteria:
  - Existe tabla device_api_keys con columnas key_hash text NOT NULL, user_id uuid NOT NULL REFERENCES auth.users(id), device_id text, created_at
  - key_hash es PRIMARY KEY o tiene constraint UNIQUE
  - La tabla NO está expuesta a RLS de usuario (solo service role puede leer)
  - Dado un key_hash, se puede obtener el user_id correspondiente en una sola consulta
related: [user-id-column-sensors, rls-policies-sensors, api-upload-user-resolution]
affects:
  - supabase/migrations/002_multi_tenant.sql
adrs: []
scope: supabase/migrations/
verified_at: 2026-05-23
---

## Purpose

Permitir que el endpoint de ingesta `/api/upload` resuelva el `user_id` del propietario del dispositivo IoT a partir de la API key enviada en el header `X-API-Key`, sin requerir que el firmware del dispositivo conozca o envíe el `user_id` directamente.

## Requirements

- La migración SHALL crear la tabla `device_api_keys` con columnas: `key_hash text PRIMARY KEY`, `user_id uuid NOT NULL REFERENCES auth.users(id)`, `device_id text`, `created_at timestamptz DEFAULT now()`.
- El campo `key_hash` SHALL almacenar el hash SHA-256 de la API key real (nunca la key en texto plano) para proteger las credenciales en caso de breach de base de datos.
- La tabla SHALL tener RLS habilitado pero sin policy de usuario — solo el `service_role` podrá acceder a ella.
- La migración SHOULD incluir un comentario indicando que el `key_hash` se calcula como `encode(sha256(key::bytea), 'hex')`.
- La tabla SHOULD tener un índice sobre `user_id` para facilitar lookups inversos (dado user_id, encontrar su API key).

## Scenarios

**Scenario 1 — Registro de nueva API key para un usuario**

GIVEN que el administrador quiere vincular la API key `abc123` al usuario con id `uuid-A`  
WHEN inserta en `device_api_keys` con `key_hash = sha256('abc123')` y `user_id = uuid-A`  
THEN el registro queda almacenado con el hash de la key y el user_id correcto

**Scenario 2 — Resolución de user_id desde API key en ingesta**

GIVEN que el dispositivo IoT envía una petición con header `X-API-Key: abc123`  
AND existe un registro en `device_api_keys` con `key_hash = sha256('abc123')` y `user_id = uuid-A`  
WHEN el endpoint `/api/upload` calcula el hash de la API key y consulta `device_api_keys`  
THEN obtiene `user_id = uuid-A` y lo usa para los inserts de sensores

**Scenario 3 — API key desconocida rechaza la ingesta**

GIVEN que el dispositivo envía una petición con `X-API-Key: desconocida`  
AND no existe ningún registro en `device_api_keys` con ese hash  
WHEN el endpoint `/api/upload` busca en `device_api_keys`  
THEN retorna HTTP 401 y no inserta ningún dato

**Scenario 4 — Usuario no puede leer device_api_keys via RLS**

GIVEN que el usuario A está autenticado con su JWT en el cliente browser  
WHEN intenta consultar `device_api_keys` directamente  
THEN no recibe ninguna fila (RLS bloquea acceso sin service role)

## Acceptance Criteria

- La tabla `device_api_keys` existe con el schema especificado verificable vía `\d device_api_keys`.
- Una consulta SELECT con JWT de usuario no retorna filas de `device_api_keys`.
- Una consulta con service role y `key_hash = sha256('key-de-prueba')` retorna el `user_id` correspondiente.
- Un INSERT sin `user_id` válido en `device_api_keys` falla con error de FK.
