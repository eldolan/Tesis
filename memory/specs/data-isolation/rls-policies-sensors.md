---
type: spec
title: "RLS policies auth.uid() = user_id en todas las tablas multi-tenant"
capability: data-isolation
slug: rls-policies-sensors
domain: feature
delta_type: schema-change
supersedes: null
superseded_by: null
status: draft
assigned_agent: null
priority: critical
depends_on: [user-id-column-sensors, device-api-keys-table, new-tables-schema]
change_ref: multi-tenant-sensor-isolation
acceptance_criteria:
  - Cada tabla de sensores y tablas nuevas tiene RLS habilitado con policy USING(auth.uid() = user_id)
  - Un usuario autenticado solo puede SELECT filas donde user_id coincide con su auth.uid()
  - Un usuario autenticado solo puede INSERT filas donde user_id coincide con su auth.uid()
  - Consultas con usuario diferente no retornan filas ajenas
related: [user-id-column-sensors, new-tables-schema]
affects:
  - supabase/migrations/002_multi_tenant.sql
adrs: []
scope: supabase/migrations/
verified_at: 2026-05-23
---

## Purpose

Aplicar Row Level Security con la regla `auth.uid() = user_id` en todas las tablas del sistema multi-tenant, garantizando que cada usuario solo acceda a sus propios datos de sensores, notificaciones, decisiones, sesiones de chat y documentos, sin posibilidad de leer o escribir datos ajenos.

## Requirements

- La migración SHALL crear policy SELECT con `USING (auth.uid() = user_id)` en las tablas `sensor_riego_20`, `sensor_riego_40`, `sensor_riego_60`, `sensor_fertilizante`, `sensor_onboard`, `notifications`, `decisiones_riego`, `chat_sessions` y `documents`.
- La migración SHALL crear policy INSERT con `WITH CHECK (auth.uid() = user_id)` en las mismas tablas para inserciones desde el cliente browser.
- La migración SHALL mantener una policy separada para el `service_role` que permita INSERT sin restricción de `auth.uid()` (para la ingesta desde `/api/upload` con service role).
- RLS MUST estar habilitado (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) en cada tabla antes de crear las policies.
- Las policies SHOULD tener nombres descriptivos con el patrón `<accion>_own_<tabla>` para auditabilidad.

## Scenarios

**Scenario 1 — Usuario A no ve datos de usuario B**

GIVEN que existe el usuario A con id `uuid-A` y el usuario B con id `uuid-B`  
AND cada uno tiene filas en `sensor_riego_20` con su propio `user_id`  
WHEN el usuario A realiza `SELECT * FROM sensor_riego_20` con su JWT  
THEN solo recibe las filas donde `user_id = uuid-A`  
AND no recibe ninguna fila con `user_id = uuid-B`

**Scenario 2 — Usuario no puede insertar fila con user_id ajeno**

GIVEN que el usuario A está autenticado con su JWT  
WHEN intenta insertar en `sensor_riego_20` con `user_id = uuid-B` (de otro usuario)  
THEN la base de datos rechaza la operación con error de violación de RLS policy

**Scenario 3 — Service role puede insertar datos sin restricción auth.uid()**

GIVEN que el endpoint `/api/upload` usa el cliente `supabaseAdmin` con service role key  
WHEN inserta una fila en `sensor_riego_20` con `user_id = uuid-A` (resuelto desde API key)  
THEN la inserción es exitosa aunque no haya sesión JWT de usuario activa

**Scenario 4 — RLS activo en tablas nuevas también**

GIVEN que las tablas `notifications`, `decisiones_riego`, `chat_sessions` y `documents` han sido creadas  
AND tienen RLS habilitado con policy `auth.uid() = user_id`  
WHEN el usuario A consulta `notifications`  
THEN solo recibe las notificaciones con `user_id = uuid-A`

## Acceptance Criteria

- `pg_policies` muestra policies con `using_expression = (auth.uid() = user_id)` para cada una de las 9 tablas.
- Una consulta SELECT con JWT de usuario A no retorna filas de usuario B en ninguna tabla.
- Un INSERT con `user_id` distinto a `auth.uid()` falla con error RLS.
- El `supabaseAdmin` (service role) puede insertar en cualquier tabla sin restricción de RLS.
