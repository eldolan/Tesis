---
type: spec
title: "Tabla sensor_onboard para lecturas de temperatura y humedad del dispositivo IoT"
capability: onboard-normalization
slug: sensor-onboard-table
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
  - Existe tabla sensor_onboard con columnas user_id, device_id, temperatura, humedad, created_at
  - user_id es NOT NULL con FK a auth.users(id)
  - Las columnas temperatura_onboard y humedad_onboard han sido eliminadas de sensor_riego_20, sensor_riego_40 y sensor_riego_60
  - RLS habilitado en sensor_onboard con policy auth.uid() = user_id
related: [user-id-column-sensors, rls-policies-sensors, api-upload-onboard-write]
affects:
  - supabase/migrations/002_multi_tenant.sql
adrs: []
scope: supabase/migrations/
verified_at: 2026-05-23
---

## Purpose

Separar las lecturas de temperatura y humedad del sensor onboard del dispositivo IoT (Arduino/Raspberry Pi) de las lecturas de humedad del suelo, creando una tabla dedicada `sensor_onboard` que normaliza conceptualmente estos dos tipos de datos distintos.

## Requirements

- La migración SHALL crear la tabla `sensor_onboard` con columnas: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, `user_id uuid NOT NULL REFERENCES auth.users(id)`, `device_id text`, `temperatura numeric(5,2)`, `humedad numeric(5,2)`, `created_at timestamptz DEFAULT now()`.
- La migración SHALL eliminar las columnas `temperatura_onboard` y `humedad_onboard` de las tablas `sensor_riego_20`, `sensor_riego_40` y `sensor_riego_60` usando `ALTER TABLE ... DROP COLUMN`.
- La tabla `sensor_onboard` SHALL tener RLS habilitado con policy `auth.uid() = user_id` para lectura y una policy separada para service role insert.
- La migración SHALL crear índice `idx_sensor_onboard_user_id` sobre `user_id` en `sensor_onboard`.
- La migración SHOULD crear índice `idx_sensor_onboard_created_at` para soportar queries de lecturas recientes.

## Scenarios

**Scenario 1 — Tabla sensor_onboard creada con schema correcto**

GIVEN que la migración ha sido aplicada  
WHEN se describe la tabla `sensor_onboard`  
THEN tiene columnas `id`, `user_id`, `device_id`, `temperatura`, `humedad`, `created_at`  
AND `user_id` es NOT NULL con FK a `auth.users(id)`

**Scenario 2 — Columnas onboard eliminadas de tablas de riego**

GIVEN que la migración ha sido aplicada  
WHEN se describe `sensor_riego_20`  
THEN no existe columna `temperatura_onboard` ni `humedad_onboard`  
AND la tabla conserva el resto de sus columnas intactas

**Scenario 3 — Lectura de temperatura/humedad onboard aislada por usuario**

GIVEN que el usuario A tiene lecturas en `sensor_onboard` con `user_id = uuid-A`  
WHEN consulta `sensor_onboard` con su JWT  
THEN solo recibe sus propias lecturas onboard  
AND no puede ver lecturas de otros usuarios

**Scenario 4 — Inserción de lectura onboard via service role**

GIVEN que el endpoint `/api/upload` procesa un CSV con datos onboard  
WHEN inserta en `sensor_onboard` con `user_id = uuid-A`, `temperatura = 25.3`, `humedad = 60.1`  
THEN la fila queda almacenada correctamente en `sensor_onboard`  
AND no se intenta insertar en columnas `temperatura_onboard`/`humedad_onboard` de las tablas de riego

## Acceptance Criteria

- La tabla `sensor_onboard` existe con el schema correcto verificable vía `\d sensor_onboard`.
- Las tablas `sensor_riego_20`, `sensor_riego_40`, `sensor_riego_60` no tienen columnas `temperatura_onboard` ni `humedad_onboard`.
- Una lectura con JWT de usuario A desde `sensor_onboard` retorna solo sus filas.
- Un INSERT en `sensor_onboard` via service role con datos válidos es exitoso.
