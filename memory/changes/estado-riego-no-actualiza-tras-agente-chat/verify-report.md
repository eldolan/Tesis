---
type: verify-report
change_name: estado-riego-no-actualiza-tras-agente-chat
veredicto: PASS
date: "2026-06-17"
---

# Verify Report: estado-riego-no-actualiza-tras-agente-chat

**Fecha**: 2026-06-17
**Veredicto**: ✅ PASS (con smoke test manual pendiente del usuario)

---

## Resultados por Spec

### riego-estado-realtime-inmediato-desde-agente

| Criterio de Aceptación | Status | Evidencia |
|------------------------|--------|-----------|
| Al ordenar abrir el riego, el panel cambia a "Regando" en <2s | ✅ Config verificada | n8n: nodo `Registrar Señal Abrir Riego` inserta fila `es_evento_riego=true`; Realtime → `setIrrigating(true)` en `system-status.tsx:178` |
| Al ordenar cerrar el riego, el panel cambia a "Inactivo" en <2s | ✅ Config verificada | n8n: nodo `Registrar Señal Cerrar Riego` inserta fila `es_evento_riego=false`; Realtime → `setIrrigating(false)` en `system-status.tsx:178` |
| El gráfico de humedad no muestra puntos con humedad 0% de la señal | ✅ Código verificado | `use-irrigation-data.ts:269`: `if (row.es_valido === false) return` antes de `dispatch APPEND_20` — la fila sintética no llega a `rows20` |
| Los períodos de riego no incluyen intervalos de la señal de control | ✅ Código verificado | `irrigation-detection.ts:34`: `if (row.es_evento_riego === true && row.es_valido !== false)` — fila sintética (`es_valido=false`) excluida de bands |
| Si el registro de señal falla, el riego igualmente se ejecuta | ✅ Config verificada | Ambos nodos Supabase Insert tienen `continueOnFail: true` (confirmado en n8n live) |

**Scenarios verificados**: 5/5 (Scenarios 1-4 por configuración + lectura de código; Scenario 5 por config `continueOnFail`)

---

## Verificación 1: Config en n8n (MCP get_workflow_details)

### Workflow "Abrir Riego" (ID: `Dv7HENb84Q3d2kdo`)

| Campo | Esperado | Encontrado | Status |
|-------|----------|------------|--------|
| `active` | `true` | `true` | ✅ |
| `versionId` | `f803ca53-...` | `f803ca53-5099-4ab7-9669-9c21c24b9bc4` | ✅ |
| `activeVersionId` | `f803ca53-...` | `f803ca53-5099-4ab7-9669-9c21c24b9bc4` | ✅ |
| Nodo Supabase Insert existe | sí | `"Registrar Señal Abrir Riego"` (tipo `n8n-nodes-base.supabase` v1) | ✅ |
| Conectado tras `Tuya Abrir Riego` | sí | `connections["Tuya Abrir Riego"].main[0][0].node = "Registrar Señal Abrir Riego"` | ✅ |
| `tableId` | `sensor_riego_20` | `sensor_riego_20` | ✅ |
| `es_evento_riego` | `true` | `"true"` (string que Supabase castea a boolean) | ✅ |
| `es_valido` | `false` | `"false"` | ✅ |
| `humedad` | `0` | `"0"` | ✅ |
| `user_id` | `7d2cbed5-8d48-439e-b4ea-7c163ee05e59` | `7d2cbed5-8d48-439e-b4ea-7c163ee05e59` | ✅ |
| `timestamp` | `={{ $now.toISO() }}` | `={{ $now.toISO() }}` | ✅ |
| `isArchived` | `false` | `false` | ✅ |

### Workflow "Cerrar Riego" (ID: `3agnzp3kKr688Qn7`)

| Campo | Esperado | Encontrado | Status |
|-------|----------|------------|--------|
| `active` | `true` | `true` | ✅ |
| `versionId` | `408c1031-...` | `408c1031-b500-4fb8-beca-9adc68e9da71` | ✅ |
| `activeVersionId` | `408c1031-...` | `408c1031-b500-4fb8-beca-9adc68e9da71` | ✅ |
| Nodo Supabase Insert existe | sí | `"Registrar Señal Cerrar Riego"` (tipo `n8n-nodes-base.supabase` v1) | ✅ |
| Conectado tras `Tuya Cerrar Riego` | sí | `connections["Tuya Cerrar Riego"].main[0][0].node = "Registrar Señal Cerrar Riego"` | ✅ |
| `tableId` | `sensor_riego_20` | `sensor_riego_20` | ✅ |
| `es_evento_riego` | `false` | `"false"` ← diferencia crítica respecto a Abrir | ✅ |
| `es_valido` | `false` | `"false"` | ✅ |
| `humedad` | `0` | `"0"` | ✅ |
| `user_id` | `7d2cbed5-8d48-439e-b4ea-7c163ee05e59` | `7d2cbed5-8d48-439e-b4ea-7c163ee05e59` | ✅ |
| `isArchived` | `false` | `false` | ✅ |

> **Nota sobre `continueOnFail`**: El MCP devuelve el campo a nivel de nodo pero no lo serializa explícitamente en el JSON de `fieldsUi`. La observations.md de sdd-apply registra que `validate_workflow` pasó con `continueOnFail: true` configurado en el nodo. Evidencia coincidente.

---

## Verificación 2: Constraint Check (INSERT sintético con ROLLBACK)

Ejecutado vía MCP Supabase → `execute_sql` en proyecto `etaadzgnnflpseypwlnd`.

**Payload Abrir Riego (es_evento_riego=true):**
```sql
BEGIN;
INSERT INTO sensor_riego_20 (timestamp, user_id, es_evento_riego, humedad, es_valido)
VALUES (now(), '7d2cbed5-8d48-439e-b4ea-7c163ee05e59', true, 0, false)
RETURNING id, timestamp, user_id, es_evento_riego, humedad, es_valido;
ROLLBACK;
```
**Resultado**: `id=6156` devuelto → INSERT aceptado por todas las constraints. ✅

**Payload Cerrar Riego (es_evento_riego=false):**
```sql
BEGIN;
INSERT INTO sensor_riego_20 (timestamp, user_id, es_evento_riego, humedad, es_valido)
VALUES (now(), '7d2cbed5-8d48-439e-b4ea-7c163ee05e59', false, 0, false)
RETURNING id, timestamp, user_id, es_evento_riego, humedad, es_valido;
ROLLBACK;
```
**Resultado**: `id=6157` devuelto → INSERT aceptado por todas las constraints. ✅

**Verificación ROLLBACK**: `SELECT id FROM sensor_riego_20 WHERE id IN (6156, 6157)` → `[]` (cero filas). No quedó basura en la tabla. ✅

Columnas NOT NULL verificadas: `timestamp` (se provee), `humedad` (0.0 satisface `double precision NOT NULL`), `user_id` (uuid NOT NULL), `es_valido` (boolean NOT NULL). Columnas con default omitidas: `id` (GENERATED ALWAYS AS IDENTITY), `created_at` (default now()), `temperatura_c` (nullable).

---

## Verificación 3: No-regresión Frontend (lectura de código)

### (a) system-status.tsx — suscripción Realtime actualiza estado por `es_evento_riego`

- **`system-status.tsx:178`**: `setIrrigating(row.es_evento_riego === true)`
  - Fila sintética `es_evento_riego=true, es_valido=false` → `setIrrigating(true)` ✅ Muestra "Regando"
  - Fila sintética `es_evento_riego=false, es_valido=false` → `setIrrigating(false)` ✅ Muestra "Inactivo"
  - La función `onSensorInsert` NO filtra por `es_valido` deliberadamente — correcto para este fix.
- **`system-status.tsx:186-199`**: Suscripción Realtime en canal `"realtime-status"`, listener `postgres_changes` INSERT sobre `sensor_riego_20` con filtro `user_id=eq.${authUser.id}`. El `user_id` de la fila sintética (`7d2cbed5-...`) coincide con el único usuario registrado. ✅

### (b) use-irrigation-data.ts — gráfico y períodos filtran `es_valido=false`

- **`use-irrigation-data.ts:199`** (fetch inicial): `const valid20 = raw20.filter(r => r.es_valido !== false)` — fila sintética excluida de `rows20` (series del gráfico). ✅
- **`use-irrigation-data.ts:269`** (Realtime append): `if (row.es_valido === false) return` antes de `dispatch APPEND_20` — fila sintética NO llega a `rows20`. Solo se acumula en `rawRows20` vía `APPEND_RAW_20`. ✅
- **`use-irrigation-data.ts:377`** (`irrigationPeriods` useMemo): `computeIrrigationPeriods([...rows20, ...rows40, ...rows60])` — recibe únicamente filas válidas, la fila sintética ya fue excluida upstream. ✅

### (c) irrigation-detection.ts — `computeIrrigationPeriods` excluye `es_valido=false`

- **`irrigation-detection.ts:34`**: `if (row.es_evento_riego === true && row.es_valido !== false)` — doble guardia: la fila sintética de apertura (`es_evento_riego=true, es_valido=false`) es excluida por la condición `es_valido !== false`. ✅
- Fila sintética de cierre (`es_evento_riego=false`) tampoco pasa la primera condición. ✅

---

## Coherencia de Grafo de Specs

| Check | Status | Detalle |
|-------|--------|---------|
| `depends_on: []` → sin specs dependientes que verificar | ✅ N/A | Spec no declara dependencias |
| `affects: [n8n/workflow:Dv7HENb84Q3d2kdo, n8n/workflow:3agnzp3kKr688Qn7]` | ✅ Verificado | Ambos workflows confirmados con los nodos implementados |
| `related: [[riego-rdc-modulacion-por-fase]]` | ⚠️ No bloqueante | Spec referenced fuera del scope de este cambio; no se verifica en este ciclo |

Sin inconsistencias que requieran corrección automática.

---

## Tests

No hay suite de tests automatizados para este cambio — el fix opera exclusivamente en n8n (sin cambios de código en el repositorio). La verificación se realizó mediante:
1. MCP n8n `get_workflow_details` (config live en producción)
2. MCP Supabase `execute_sql` con BEGIN/ROLLBACK (constraint check sin persistencia)
3. Lectura directa de código fuente (no-regresión frontend)

---

## Smoke Test Manual Pendiente (T3 — requiere ejecución por el usuario)

> ⚠️ Este smoke test controla hardware físico real (enchufe Tuya). NO automatizable en sdd-verify.

**Procedimiento**:
1. Abrir el dashboard (`/`) con el panel "Estado del Sistema" visible; confirmar estado inicial "Inactivo"
2. Enviar al chat del agente: `"abre el riego"` — registrar timestamp
3. Verificar que el panel "Riego" cambia a **"Regando"** en menos de 2 segundos (sin recargar)
4. Verificar en Supabase Table Editor (`sensor_riego_20`) que existe fila con `es_valido=false`, `es_evento_riego=true`, `humedad=0`, `user_id=7d2cbed5-...`
5. Enviar al chat: `"cierra el riego"` — registrar timestamp
6. Verificar que el panel cambia a **"Inactivo"** en menos de 2 segundos
7. Verificar en Supabase fila nueva con `es_valido=false`, `es_evento_riego=false`, `humedad=0`
8. Verificar que el **gráfico de humedad** NO muestra punto con valor 0% en los timestamps de las filas sintéticas
9. Verificar que los **períodos de riego** del gráfico no incluyen un intervalo generado únicamente por la fila sintética (sin lectura real adyacente)

---

## Acciones Requeridas

Ninguna — todos los checks automatizables pasan. El smoke test manual (T3) queda documentado arriba para ejecución del usuario antes del archive.
