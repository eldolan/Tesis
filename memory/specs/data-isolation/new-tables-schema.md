---
type: spec
title: "Creación de tablas nuevas con user_id desde el inicio (notifications, decisiones_riego, chat_sessions, documents)"
capability: data-isolation
slug: new-tables-schema
domain: feature
delta_type: schema-change
supersedes: null
superseded_by: null
status: draft
assigned_agent: null
priority: high
depends_on: [user-id-column-sensors]
change_ref: multi-tenant-sensor-isolation
acceptance_criteria:
  - Existen las tablas notifications, decisiones_riego, chat_sessions y documents con user_id uuid NOT NULL
  - Cada tabla tiene índice sobre user_id
  - RLS habilitado en cada tabla con policy auth.uid() = user_id
  - El schema mínimo de cada tabla es suficiente para el intent del sistema (IA agrícola + chat + docs)
related: [rls-policies-sensors, user-id-column-sensors]
affects:
  - supabase/migrations/002_multi_tenant.sql
adrs: []
scope: supabase/migrations/
verified_at: null
---

## Purpose

Crear las cuatro tablas del sistema que aún no existen en el codebase, incorporando `user_id` como columna obligatoria desde el inicio, evitando que hereden el patrón single-tenant de las tablas existentes.

## Requirements

- La migración SHALL crear la tabla `notifications` con columnas mínimas: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, `user_id uuid NOT NULL REFERENCES auth.users(id)`, `message text NOT NULL`, `read boolean DEFAULT false`, `created_at timestamptz DEFAULT now()`.
- La migración SHALL crear la tabla `decisiones_riego` con columnas mínimas: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, `user_id uuid NOT NULL REFERENCES auth.users(id)`, `decision text NOT NULL`, `razon text`, `sensor_data jsonb`, `created_at timestamptz DEFAULT now()`.
- La migración SHALL crear la tabla `chat_sessions` con columnas mínimas: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, `user_id uuid NOT NULL REFERENCES auth.users(id)`, `title text`, `created_at timestamptz DEFAULT now()`, `updated_at timestamptz DEFAULT now()`.
- La migración SHALL crear la tabla `documents` con columnas mínimas: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, `user_id uuid NOT NULL REFERENCES auth.users(id)`, `name text NOT NULL`, `content text`, `type text`, `created_at timestamptz DEFAULT now()`.
- Cada tabla SHOULD tener un índice `idx_<tabla>_user_id` sobre `user_id`.
- Cada tabla SHALL tener RLS habilitado desde su creación.

## Scenarios

**Scenario 1 — Tabla notifications creada correctamente**

GIVEN que la migración ha sido aplicada  
WHEN se consulta `information_schema.tables` para `notifications`  
THEN la tabla existe con las columnas `id`, `user_id`, `message`, `read`, `created_at`  
AND `user_id` tiene constraint NOT NULL y FK a `auth.users(id)`

**Scenario 2 — No es posible crear notificación sin user_id**

GIVEN que la tabla `notifications` existe  
WHEN se intenta insertar una fila sin especificar `user_id`  
THEN la base de datos rechaza la operación con error de constraint NOT NULL

**Scenario 3 — chat_sessions vincula sesiones al usuario correcto**

GIVEN que el usuario A está autenticado  
AND tiene sesiones de chat registradas en `chat_sessions` con `user_id = uuid-A`  
WHEN consulta `chat_sessions` con su JWT  
THEN solo recibe sus propias sesiones

**Scenario 4 — decisiones_riego almacena datos de sensor como JSONB**

GIVEN que el sistema de IA genera una decisión de riego con datos de sensor adjuntos  
WHEN inserta en `decisiones_riego` con `sensor_data = {"humedad": 42, "temperatura": 25}`  
THEN la fila queda almacenada con el campo JSONB correctamente

## Acceptance Criteria

- Las cuatro tablas existen en la base de datos con los schemas mínimos especificados.
- Un INSERT sin `user_id` en cualquiera de las cuatro tablas falla con error de constraint.
- Un SELECT con JWT de usuario A no retorna filas de usuario B en ninguna de las cuatro tablas.
- Las tablas tienen índice sobre `user_id` verificable en `pg_indexes`.
