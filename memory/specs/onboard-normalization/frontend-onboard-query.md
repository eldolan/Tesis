---
type: spec
title: "Frontend lee datos onboard desde sensor_onboard en vez de columnas eliminadas"
capability: onboard-normalization
slug: frontend-onboard-query
domain: feature
delta_type: code-change
supersedes: null
superseded_by: null
status: draft
assigned_agent: null
priority: high
depends_on: [sensor-onboard-table, ssr-supabase-client]
change_ref: multi-tenant-sensor-isolation
acceptance_criteria:
  - Ningún componente o hook referencia columnas temperatura_onboard o humedad_onboard
  - Los datos de temperatura y humedad del dispositivo se obtienen desde la tabla sensor_onboard
  - Los componentes que muestran datos onboard reciben datos filtrados por usuario autenticado
related: [sensor-onboard-table, hooks-user-filter]
affects:
  - src/hooks/use-irrigation-data.ts
  - src/components/
adrs: []
scope: src/
verified_at: 2026-05-23
---

## Purpose

Eliminar todas las referencias a las columnas `temperatura_onboard` y `humedad_onboard` en el código frontend y redirigir las queries y presentación de datos onboard a la nueva tabla `sensor_onboard`, manteniendo la experiencia de usuario sin degradación.

## Requirements

- El código frontend SHALL eliminar cualquier referencia a `temperatura_onboard` y `humedad_onboard` en hooks, componentes y tipos TypeScript.
- Los componentes que muestran temperatura y humedad del dispositivo SHALL obtener esos datos consultando la tabla `sensor_onboard` filtrada por el usuario autenticado.
- Los tipos TypeScript (en `src/types/index.ts`) SHALL reflejar la eliminación de `temperatura_onboard`/`humedad_onboard` de `SensorRiego` y la adición del tipo `SensorOnboard`.
- Las queries a `sensor_onboard` SHOULD ordenarse por `created_at DESC LIMIT 1` para obtener la lectura más reciente del dispositivo.
- Los componentes SHOULD manejar el estado de carga y el caso donde aún no hay lecturas onboard disponibles para el usuario.

## Scenarios

**Scenario 1 — Componente muestra temperatura del dispositivo desde sensor_onboard**

GIVEN que el usuario A está autenticado  
AND tiene lecturas en `sensor_onboard` con `temperatura = 24.5`  
WHEN el componente que muestra la temperatura del dispositivo se renderiza  
THEN muestra `24.5°C` obtenido desde `sensor_onboard`  
AND no referencia columnas `temperatura_onboard` de tablas de riego

**Scenario 2 — Sin lecturas onboard el componente muestra estado vacío**

GIVEN que el usuario A está autenticado  
AND no tiene filas en `sensor_onboard`  
WHEN el componente de datos onboard se renderiza  
THEN muestra un estado vacío o placeholder apropiado  
AND no genera error de runtime por columna inexistente

**Scenario 3 — Tipo SensorRiego ya no incluye campos onboard**

GIVEN que el archivo `src/types/index.ts` ha sido actualizado  
WHEN TypeScript compila el proyecto  
THEN no existen campos `temperatura_onboard` ni `humedad_onboard` en el tipo `SensorRiego`  
AND existe el tipo `SensorOnboard` con campos `temperatura`, `humedad`, `device_id`, `user_id`, `created_at`

## Acceptance Criteria

- `grep -r "temperatura_onboard\|humedad_onboard" src/` no retorna ningún resultado.
- Los componentes que muestran temperatura/humedad del dispositivo renderizan datos provenientes de `sensor_onboard`.
- `npx tsc --noEmit` no reporta errores relacionados a campos onboard.
- La interfaz de usuario muestra datos de temperatura y humedad onboard correctos para el usuario autenticado.
