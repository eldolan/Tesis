---
type: adr
number: "0003"
title: "Aislamiento multi-tenant via user_id por fila con RLS auth.uid() = user_id"
status: accepted
date: "2026-05-23"
change_ref: multi-tenant-sensor-isolation
decision_ref: DT-1, DT-2, DT-8
supersedes: null
superseded_by: null
tags: [security, database, multi-tenant]
---

# ADR-0003: Aislamiento multi-tenant via user_id por fila con RLS

## Contexto

El sistema es single-tenant implícito: las tablas de sensores no tienen `user_id` y las policies RLS son `USING(true)`. Para soportar múltiples usuarios con dispositivos IoT independientes, cada fila debe pertenecer a un usuario y el acceso debe restringirse via RLS.

## Decisión

1. Agregar `user_id uuid NOT NULL REFERENCES auth.users(id)` a todas las tablas de datos del sistema.
2. Reemplazar todas las policies `USING(true)` por `USING(auth.uid() = user_id)`.
3. Mantener policy de service role para INSERT (bypass de RLS) para la ingesta via `/api/upload`.
4. Cambiar constraints UNIQUE de `(timestamp)` a `(user_id, timestamp)` para permitir timestamps compartidos entre usuarios.
5. Todas las tablas nuevas nacen con `user_id NOT NULL` desde el inicio.

## Consecuencias

**Positivas:**
- Aislamiento de datos a nivel de base de datos, no de aplicación — imposible de bypassear desde frontend
- Modelo simple: una columna `user_id` + una regla RLS cubre lectura y escritura
- Compatible con Supabase Realtime (respeta RLS automáticamente con JWT)
- Escalable a N usuarios sin cambios de schema

**Negativas:**
- Cada query y cada insert debe incluir `user_id` — el service role lo provee explícitamente, el browser client lo obtiene vía JWT
- Sin usuario autenticado, las queries retornan 0 filas (comportamiento correcto pero puede confundir durante desarrollo)
- TRUNCATE de datos existentes necesario en la migración (aceptable solo en desarrollo)

## Alternativas Descartadas

- **Tenant por organización con tabla intermedia**: over-engineering para el modelo 1 usuario = 1 dispositivo
- **user_id nullable con backfill**: período de transición complejo con policies duales
- **Filtrado solo en aplicación (sin RLS)**: inseguro, un bug en frontend expondría datos de otros usuarios
