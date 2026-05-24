---
type: spec
title: "Endpoint /api/upload escribe datos onboard en sensor_onboard en vez de columnas de riego"
capability: sensor-ingestion
slug: api-upload-onboard-write
domain: feature
delta_type: code-change
supersedes: null
superseded_by: null
status: completed
assigned_agent: null
priority: high
depends_on: [api-upload-user-resolution, sensor-onboard-table]
change_ref: multi-tenant-sensor-isolation
acceptance_criteria:
  - El endpoint /api/upload extrae temperatura y humedad onboard del CSV y las escribe en sensor_onboard
  - El endpoint NO intenta insertar en columnas temperatura_onboard ni humedad_onboard de las tablas de riego
  - Los datos onboard en sensor_onboard tienen el user_id resuelto desde la API key
  - Los datos de humedad del suelo siguen insertándose correctamente en las tablas de riego correspondientes
related: [sensor-onboard-table, api-upload-user-resolution]
affects:
  - src/app/api/upload/route.ts
adrs: []
scope: src/app/api/upload/
verified_at: 2026-05-23
---

## Purpose

Actualizar el endpoint `/api/upload` para que los datos de temperatura y humedad del sensor onboard del dispositivo IoT se escriban en la tabla `sensor_onboard`, separándolos de los datos de humedad del suelo que van a las tablas `sensor_riego_*`, y eliminando cualquier referencia a las columnas `temperatura_onboard`/`humedad_onboard` que han sido eliminadas del schema.

## Requirements

- El endpoint SHALL parsear los datos de temperatura y humedad onboard del CSV recibido del dispositivo IoT.
- Los datos de temperatura y humedad onboard SHALL insertarse en la tabla `sensor_onboard` con el `user_id` y `device_id` correspondientes.
- El endpoint SHALL NO incluir los campos `temperatura_onboard` ni `humedad_onboard` en los objetos de insert para las tablas `sensor_riego_20`, `sensor_riego_40` y `sensor_riego_60`.
- Los datos de humedad del suelo SHALL seguir insertándose en las tablas de riego correspondientes según su tipo (`sensor_riego_20`, `sensor_riego_40`, `sensor_riego_60`) y en `sensor_fertilizante`.
- Si el CSV no incluye datos onboard en un lote particular, el endpoint SHALL omitir el insert en `sensor_onboard` sin error.
- El `device_id` enviado por el dispositivo SHALL incluirse en la fila de `sensor_onboard` si está disponible en la payload.

## Scenarios

**Scenario 1 — CSV con datos onboard genera insert en sensor_onboard**

GIVEN que el dispositivo envía un CSV que incluye columnas de temperatura y humedad onboard  
AND el `user_id` ha sido resuelto como `uuid-A` desde la API key  
WHEN el endpoint parsea el CSV y procesa el lote  
THEN inserta una fila en `sensor_onboard` con `user_id = uuid-A`, `temperatura = <valor>`, `humedad = <valor>`  
AND los datos de humedad del suelo se insertan en `sensor_riego_20`, `sensor_riego_40` o la tabla correspondiente  
AND no hay ningún intento de insertar en columnas `temperatura_onboard`/`humedad_onboard`

**Scenario 2 — CSV sin datos onboard no genera error**

GIVEN que el dispositivo envía un CSV que no incluye columnas de temperatura/humedad onboard  
WHEN el endpoint procesa el lote  
THEN inserta solo en las tablas de riego/fertilizante según corresponda  
AND no genera error al intentar insertar en `sensor_onboard`  
AND no hay filas huérfanas en `sensor_onboard`

**Scenario 3 — Datos de humedad de suelo y onboard separados correctamente**

GIVEN que el CSV contiene tanto datos de humedad del suelo (riego) como datos onboard  
WHEN el endpoint procesa el CSV completo  
THEN las tablas `sensor_riego_*` tienen las nuevas filas de humedad del suelo  
AND la tabla `sensor_onboard` tiene la nueva fila de temperatura/humedad del dispositivo  
AND no se mezclan los tipos de datos entre tablas

**Scenario 4 — Error en insert onboard no bloquea insert de datos de suelo**

GIVEN que ocurre un error al insertar en `sensor_onboard` (e.g., constraint violation)  
WHEN el endpoint maneja el error  
THEN registra el error en logs  
AND continúa con el insert de los datos de humedad del suelo (o viceversa, según la política de transacción definida en diseño)

## Acceptance Criteria

- Después de una ingesta exitosa con datos onboard, `sensor_onboard` tiene nuevas filas con el `user_id` correcto.
- Las tablas `sensor_riego_20`, `sensor_riego_40`, `sensor_riego_60` NO tienen columnas `temperatura_onboard` ni `humedad_onboard` en los inserts del endpoint.
- Los datos de humedad del suelo siguen llegando correctamente a las tablas de riego tras la actualización del endpoint.
- `grep -n "temperatura_onboard\|humedad_onboard" src/app/api/upload/route.ts` no retorna resultados.
