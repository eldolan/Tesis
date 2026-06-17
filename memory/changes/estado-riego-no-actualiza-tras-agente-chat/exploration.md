---
type: exploration
change_name: estado-riego-no-actualiza-tras-agente-chat
domain: fix
created: 2026-06-16
---

# Exploración: estado-riego-no-actualiza-tras-agente-chat

## Estado Actual

### Flujo n8n — cómo el agente abre/cierra el riego

El **Agente Agrícola** (workflow `lDKOPfa4vgBSyYwy`) tiene dos rutas de entrada:

- **Ruta chat**: Webhook Chat → Auth → Preparar Chat → Agente Chat → Post-Proceso Chat
- **Ruta autónoma**: Webhook Sensor → Verificar Cooldown → Evaluar Cooldown → Preparar Evaluación → Agente Autónomo → Post-Proceso Auto

Cuando el agente (chat o autónomo) decide abrir o cerrar el riego, invoca sub-workflows:
- `Call 'Abrir Riego'` / `Abrir Riego Auto` → workflow `Dv7HENb84Q3d2kdo`
- `Call 'Cerrar Riego'` / `Cerrar Riego Auto` → workflow `3agnzp3kKr688Qn7`

**Crítico: Los sub-workflows Abrir/Cerrar Riego SOLO controlan el enchufe físico Tuya vía API HTTP.**
No escriben ningún registro en Supabase. Su única acción es enviar `{ commands: [{ code: 'switch_1', value: true|false }] }` a la API Tuya.

Tras la acción, el Agente Autónomo pasa por `Post-Proceso Auto`, que:
1. Registra la decisión en tabla `decisiones_riego` (nodo "Guardar Decisión")
2. Inserta en `notifications` (nodo "Notificar")

**Ningún nodo del Agente Agrícola inserta filas en `sensor_riego_20`, `sensor_riego_40`, ni `sensor_riego_60`.**

El único flujo que escribe en `sensor_riego_*` es el workflow **Ingesta de Sensores** (`aauydT3T24OMOTsK`), que:
1. Recibe lecturas del hardware vía webhook POST `/webhook/sensor-data`
2. En `Validar y Procesar`: consulta el estado real del enchufe Tuya para determinar `es_evento_riego`
3. Inserta en `sensor_riego_20` y `sensor_riego_40` (con `es_evento_riego` derivado del enchufe)

### Frontend — cómo la página determina el estado de riego

#### SystemStatus (componente principal que muestra "Regando" / "Inactivo")

[fuente: código `src/components/dashboard/system-status.tsx`]

El estado de riego visible (`irrigating`) se calcula de dos maneras:

**1. Fetch inicial** (`useEffect` con dep `[user?.id]`, líneas 67-135):
- Consulta la **última fila** de `sensor_riego_20/40/60` de las últimas 24h
- Lee el campo `es_evento_riego` de esa fila
- Si cualquier sensor tiene `es_evento_riego === true` → `setIrrigating(true)`
- El fetch se ejecuta **una sola vez al montar** (dependencia solo `user?.id`)

**2. Suscripción Realtime** (`useEffect` con dep `[user?.id]`, líneas 138-219):
- Suscribe a eventos `INSERT` en `sensor_riego_20/40/60`
- Filtra por `user_id=eq.${authUser.id}`
- Handler `onSensorInsert`: `setIrrigating(row.es_evento_riego === true)` (línea 178)

#### useIrrigationData (hook para el gráfico)

[fuente: código `src/hooks/use-irrigation-data.ts`]

- Fetch inicial en Efecto 1 (deps `[period, refetchCount]`): obtiene filas de `sensor_riego_*`
- Efecto 2: red de seguridad con `visibilitychange`/`focus` → `TRIGGER_REFETCH`
- Efecto 3: suscripción Realtime a `INSERT` en `sensor_riego_*` (solo para períodos != "year")
- El estado de riego ("irrigationPeriods") se deriva de `es_evento_riego` en las filas, NO de un flag independiente

### El Gap — Causa Raíz

**El agente del chat controla el enchufe físico (Tuya) pero NO inserta filas en `sensor_riego_*`.**
**El frontend solo puede detectar el cambio de estado cuando llega una nueva fila de sensor con `es_evento_riego` actualizado.**

La cadena completa para que el frontend se actualice es:

```
Agente Chat
  → Abrir/Cerrar Riego (Tuya API)
     [enchufe cambia de estado físicamente]
        ↓
  [Esperar siguiente ciclo del hardware ESP32]
        ↓
  Ingesta de Sensores (webhook /sensor-data)
     → Validar y Procesar: consulta Tuya para es_evento_riego
     → Inserta fila en sensor_riego_20/40 con es_evento_riego=true|false
        ↓
  Supabase Realtime: INSERT en sensor_riego_20/40
        ↓
  SystemStatus: onSensorInsert → setIrrigating(row.es_evento_riego)
```

**El frontend queda "congelado" porque:**

1. **No hay INSERT inmediato**: el agente no inserta ninguna fila al abrir/cerrar el riego. La fila solo aparece cuando el hardware físico envía su próxima lectura (cada ~5 min).
2. **El fetch inicial no re-ejecuta**: `SystemStatus` solo hace refetch al montar (dep `[user?.id]`). No tiene mecanismo de refetch periódico ni reacción a eventos de `decisiones_riego` o `notifications`.
3. **La suscripción Realtime espera INSERTs**: la suscripción solo reacciona a nuevas filas en `sensor_riego_*`. Entre que el agente actúa y llega la próxima lectura del sensor, el frontend no recibe ningún evento.
4. **El campo `es_evento_riego` depende del enchufe Tuya en el momento del siguiente ciclo de ingesta**: aunque el enchufe cambie ahora, la fila con `es_evento_riego=true` solo llega con la próxima lectura del hardware.

### Hipótesis verificadas / descartadas

| Hipótesis | Estado | Evidencia |
|-----------|--------|-----------|
| n8n escribe en tabla distinta de la que lee el frontend | **CONFIRMADO** | n8n escribe en `decisiones_riego`; frontend lee `sensor_riego_*` |
| No hay INSERT inmediato al abrir/cerrar | **CONFIRMADO** | Abrir/Cerrar Riego solo llaman a Tuya API |
| Suscripción Realtime en tabla incorrecta | **DESCARTADO** | La suscripción está en `sensor_riego_*`, que es donde eventualmente llega el cambio |
| `user_id` hardcodeado distinto al del usuario autenticado | **RIESGO CONFIRMADO** | n8n tiene `user_id = "7d2cbed5-8d48-439e-b4ea-7c163ee05e59"` hardcodeado en múltiples nodos; si el usuario autenticado es otro, el filtro Realtime no coincide |
| Frontend deriva estado por detección sin recalcular | **PARCIALMENTE CONFIRMADO** | `SystemStatus` lee `es_evento_riego` de la última fila (sin recalcular), lo que es correcto pero depende de que llegue una fila nueva |
| Falta refetch tras evento realtime | **CONFIRMADO** | No hay re-fetch al recibir `INSERT`; solo se appenda la fila y se evalúa `es_evento_riego` de esa fila individual |

## Archivos Afectados

| Archivo | Rol | Impacto |
|---------|-----|---------|
| `src/components/dashboard/system-status.tsx` | Muestra estado de riego "Regando/Inactivo" | **Principal**: aquí vive el fetch y la suscripción que no refleja el cambio a tiempo |
| `src/hooks/use-irrigation-data.ts` | Hook del gráfico de humedad | **Secundario**: tiene red de seguridad con visibilitychange pero el gráfico también puede tardar |
| n8n workflow `lDKOPfa4vgBSyYwy` / nodo "Post-Proceso Auto" | Registra decisión en `decisiones_riego` | Podría emitir una señal al frontend, actualmente no lo hace |
| n8n workflow `lDKOPfa4vgBSyYwy` / nodos "Abrir Riego Auto", "Cerrar Riego Auto", "Call Abrir/Cerrar Riego" | Controlan enchufe Tuya | No interactúan con Supabase; serían candidatos a insertar una fila de estado |

## Approaches Posibles

### Approach A: Insertar fila sintética en sensor_riego_* tras acción del agente (n8n side)

Modificar los sub-workflows Abrir/Cerrar Riego (o el Post-Proceso del Agente) para insertar una fila en `sensor_riego_20` con `es_evento_riego=true|false` inmediatamente tras la acción Tuya.

- **Pros**: El Realtime del frontend detecta el INSERT inmediatamente. No requiere cambio en el frontend. Compatible con la arquitectura actual.
- **Contras**: Inserta datos "sintéticos" en tablas de sensores (no provienen del hardware real). Puede afectar al cálculo de humedad si no se maneja `es_valido` correctamente.
- **Esfuerzo**: S

### Approach B: Escribir en tabla dedicada `estado_riego` y suscribir el frontend

Crear una tabla `estado_riego` con `user_id`, `estado` (activo/inactivo), `updated_at`. n8n escribe ahí tras Abrir/Cerrar. El frontend suscribe a `UPDATE`/`INSERT` en esa tabla.

- **Pros**: Separación de concerns clara. No contamina datos de sensores.
- **Contras**: Requiere migración de Supabase + cambio en frontend + cambio en n8n. Mayor esfuerzo.
- **Esfuerzo**: M

### Approach C: Polling periódico en SystemStatus

Agregar un `setInterval` (p.ej. 30s) en `SystemStatus` que re-fetchea la última fila de `sensor_riego_*` para refrescar `irrigating`.

- **Pros**: Solo cambia el frontend. Simple.
- **Contras**: No es tiempo real; hay latencia de hasta 30s + el ciclo del sensor (~5 min). No resuelve la causa raíz.
- **Esfuerzo**: XS

### Approach D: Suscribir frontend a `decisiones_riego` o `notifications`

El Agente ya escribe en `decisiones_riego` y `notifications`. El frontend podría suscribirse a INSERTs en esas tablas y, al recibir uno, hacer refetch de `sensor_riego_*` o inferir el estado desde `decision.decision`.

- **Pros**: No requiere cambio en n8n. El mecanismo ya existe en Supabase.
- **Contras**: `decisiones_riego` solo se escribe en la ruta autónoma, no en la ruta chat. Para la ruta chat no hay evento en Supabase. `notifications` sí podría servir para ambas rutas si el Agente Chat también las emite (verificar).
- **Esfuerzo**: S

## Recomendación

**Approach A** como solución inmediata (más directa, menor esfuerzo, no requiere migración de schema).

Justificación: el problema es fundamentalmente que el cambio de estado del enchufe no se refleja en Supabase hasta el próximo ciclo del hardware (~5 min). La solución más directa es que n8n inserte una fila sintética inmediatamente. Para evitar contaminar los datos de humedad, la fila puede llevar `es_valido=false` (o un campo `es_sintetica=true`) y `humedad=null`, con solo `es_evento_riego=true|false` relevante para el frontend.

**Approach D** como complemento para la ruta autónoma (bajo esfuerzo adicional).

## Riesgos Identificados

- **user_id hardcodeado en n8n**: todos los nodos usan `user_id = "7d2cbed5-8d48-439e-b4ea-7c163ee05e59"`. Si el usuario autenticado tiene un ID diferente, el filtro Realtime (`user_id=eq.${authUser.id}`) nunca coincide con las filas que n8n inserta. Este es un riesgo de aislamiento multi-tenant.
- **Nodo "Insertar sensor_riego_40" deshabilitado**: en el workflow de Ingesta, el nodo que inserta en `sensor_riego_40` está marcado como `disabled: true`. Solo `sensor_riego_20` recibe datos activamente del workflow de ingesta.
