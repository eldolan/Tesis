---
type: spec
title: "Columna user_id obligatoria en tablas de sensores existentes"
capability: data-isolation
slug: user-id-column-sensors
domain: feature
delta_type: schema-change
supersedes: null
superseded_by: null
status: completed
assigned_agent: null
priority: critical
depends_on: []
change_ref: multi-tenant-sensor-isolation
acceptance_criteria:
  - Las tablas sensor_riego_20, sensor_riego_40, sensor_riego_60 y sensor_fertilizante tienen columna user_id uuid NOT NULL con FK a auth.users(id)
  - Existe índice sobre user_id en cada una de las cuatro tablas
  - Las policies públicas anteriores (USING true) han sido eliminadas
  - No es posible insertar una fila sin un user_id válido en ninguna de las cuatro tablas
related: [rls-policies-sensors, device-api-keys-table]
affects:
  - supabase/migrations/002_multi_tenant.sql
adrs: []
scope: supabase/migrations/
verified_at: 2026-05-23
---

## Purpose

Garantizar que cada lectura de sensor en las cuatro tablas existentes quede vinculada de forma obligatoria al usuario propietario del dispositivo IoT que generó el dato. Sin esta columna, las policies RLS multi-tenant no pueden aplicarse.

## Requirements

- La migración SQL SHALL agregar la columna `user_id uuid NOT NULL REFERENCES auth.users(id)` a las tablas `sensor_riego_20`, `sensor_riego_40`, `sensor_riego_60` y `sensor_fertilizante`.
- La migración SHALL crear un índice `idx_<tabla>_user_id` sobre `user_id` en cada una de las cuatro tablas para optimizar queries filtradas por usuario.
- La migración SHALL eliminar las policies RLS existentes de tipo `USING (true)` en esas tablas antes de crear las nuevas.
- La migración SHOULD ejecutar un `TRUNCATE` previo en las tablas si pueden contener datos sin `user_id`, para evitar fallos de constraint en entorno de desarrollo.

## Scenarios

**Scenario 1 — Migración aplicada exitosamente**

GIVEN que la base de datos tiene las tablas `sensor_riego_20`, `sensor_riego_40`, `sensor_riego_60` y `sensor_fertilizante` sin columna `user_id`  
WHEN se ejecuta la migración `002_multi_tenant.sql`  
THEN las cuatro tablas tienen la columna `user_id uuid NOT NULL` con foreign key a `auth.users(id)`  
AND cada tabla tiene el índice `idx_<tabla>_user_id` creado  
AND las policies `Allow public read` y `Service role insert` han sido eliminadas

**Scenario 2 — Inserción sin user_id rechazada por constraint**

GIVEN que la migración ha sido aplicada  
WHEN se intenta insertar una fila en cualquiera de las cuatro tablas sin proporcionar `user_id`  
THEN la base de datos rechaza la operación con error de violación de constraint NOT NULL

**Scenario 3 — Inserción con user_id válido aceptada**

GIVEN que la migración ha sido aplicada  
AND existe un usuario con id `<uuid>` en `auth.users`  
WHEN se inserta una fila en `sensor_riego_20` con `user_id = <uuid>` y los demás campos requeridos  
THEN la inserción es exitosa y la fila queda almacenada con el `user_id` correcto

## Acceptance Criteria

- Las cuatro tablas tienen columna `user_id uuid NOT NULL REFERENCES auth.users(id)` verificable vía `\d` en psql o `information_schema.columns`.
- Existe índice sobre `user_id` en cada tabla verificable vía `\di` en psql.
- Un INSERT sin `user_id` en cualquiera de las cuatro tablas retorna error de constraint.
- Las policies `USING(true)` ya no existen en ninguna de las cuatro tablas.
