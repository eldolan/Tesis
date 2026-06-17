---
type: proposal
change_name: estado-riego-no-actualiza-tras-agente-chat
domain: fix
status: pending-approval
iteration: 1
created: "2026-06-16"
updated: "2026-06-16"
tags: [proposal]
---

# Propuesta: estado-riego-no-actualiza-tras-agente-chat

## Intent

Eliminar el gap de hasta ~5 minutos entre que el agente de chat activa/desactiva el riego y que el dashboard refleja el cambio en tiempo real. La causa raíz es que los sub-workflows de n8n que controlan el enchufe Tuya no escriben ningún evento en Supabase, por lo que el frontend solo se actualiza cuando el hardware físico envía su próxima lectura de sensor.

## Scope

**Incluye:**
- Modificación de los sub-workflows n8n **Abrir Riego** (`Dv7HENb84Q3d2kdo`) y **Cerrar Riego** (`3agnzp3kKr688Qn7`) para insertar una fila de señal inmediatamente tras la acción Tuya
- Verificación/corrección del filtro Realtime del frontend ante el `user_id` hardcodeado en n8n
- Asegurar que la fila sintética no distorsione métricas de humedad (uso de `es_valido=false` o campo equivalente)

**Excluye explícitamente:**
- Refactorización del `user_id` hardcodeado en todos los nodos (candidato a deuda separada: `fix-user-id-hardcoded-n8n`)
- Rehabilitación del nodo "Insertar sensor_riego_40" deshabilitado (candidato a deuda separada: `fix-ingesta-sensor40-disabled`)
- Cambios de schema nuevos (no se crea tabla nueva)
- Polling periódico como solución principal

## Approach Propuesto

**Approach A (principal)** — Insertar fila sintética en `sensor_riego_20` tras la acción Tuya en n8n.

Inmediatamente después de que los sub-workflows Abrir/Cerrar Riego envíen el comando al enchufe Tuya, agregar un nodo Supabase que inserte una fila en `sensor_riego_20` con:
- `user_id`: el `user_id` que ya usan todos los demás nodos (`7d2cbed5-...`)
- `es_evento_riego`: `true` (Abrir) o `false` (Cerrar)
- `es_valido`: `false` (marca la fila como sintética para excluirla de cálculos de humedad)
- `humedad`: `null`
- `timestamp`: `now()`

Esto dispara la suscripción Realtime en `SystemStatus`, que llama a `onSensorInsert` con `es_evento_riego` correcto y actualiza el estado visualmente de forma inmediata.

**Complemento de robustez** — verificar que `user_id` del JWT de n8n coincide con el del usuario autenticado en el frontend. Si hay discrepancia, documentarla como bloqueante y escalarla al cambio de deuda separado. Para este cambio, el `user_id` usado en la fila sintética debe ser el mismo que usa el resto de nodos.

La suscripción Realtime del frontend (`system-status.tsx`) **no requiere cambios**: ya filtra por `user_id=eq.${authUser.id}` y ya procesa el campo `es_evento_riego` del INSERT.

## Esfuerzo Estimado

**S** — Cambio en dos sub-workflows n8n (agregar nodo Supabase insert en cada uno) + validación de `user_id`. No requiere cambio de schema ni modificación del frontend. Sin despliegue de infraestructura nueva.

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| `user_id` hardcodeado en n8n no coincide con el `authUser.id` del frontend, el INSERT sintético no dispara el Realtime del usuario correcto | Media | Verificar en Supabase que el `user_id` hardcodeado es el mismo del usuario de prueba antes de implementar; documentar como deuda si hay multi-tenant |
| Fila sintética con `es_valido=false` no es respetada por queries de humedad actuales (podría aparecer en el gráfico) | Baja | Auditar las queries en `use-irrigation-data.ts` para confirmar que filtran por `es_valido=true`; ajustar si no lo hacen |
| El hardware puede insertar una fila real poco después y sobreescribir el estado (race condition de lectura seguida de fila real) | Baja | El estado derivado de la fila real es siempre más preciso; si llega después, simplemente sobreescribe al correcto. No es problema. |
| Sub-workflow falla al insertar (Supabase down o credenciales expiradas) y el riego opera pero el estado queda incorrecto | Baja | Añadir manejo de error en el nodo de inserción; la acción Tuya ya se ejecutó, el dashboard refrescará en el próximo ciclo de sensor |

## Trade-offs

**A favor:**
- Tiempo real: latencia cae de ~5 min a <1 s para el dashboard
- Sin cambio de schema: usa tabla existente `sensor_riego_20`
- Sin cambio de frontend: la suscripción ya procesa lo que necesita
- Esfuerzo mínimo: 2 nodos nuevos en n8n

**En contra:**
- Introduce filas "sintéticas" en tablas de datos de sensores (mezcla señales de control con mediciones de hardware)
- Acoplamiento implícito: si el frontend alguna vez agrega lógica que asuma que toda fila en `sensor_riego_20` proviene del hardware, puede haber confusión futura

**Alternativa descartada — Approach B** (tabla dedicada `estado_riego`): preferible arquitectónicamente a largo plazo, pero requiere migración de schema + cambio en frontend + cambio en n8n; esfuerzo M sin beneficio adicional en esta etapa.

**Alternativa descartada — Approach C** (polling 30s): no resuelve la causa raíz y aún tiene latencia de 30s + el ciclo del sensor.

**Alternativa descartada — Approach D** (suscribir frontend a `decisiones_riego`): `decisiones_riego` solo se escribe en la ruta autónoma, no en la ruta chat (que es precisamente la afectada por este bug).

## Archivos / Recursos Afectados

| Recurso | Tipo | Cambio |
|---------|------|--------|
| n8n workflow `Abrir Riego` (`Dv7HENb84Q3d2kdo`) | n8n | Agregar nodo Supabase insert tras acción Tuya |
| n8n workflow `Cerrar Riego` (`3agnzp3kKr688Qn7`) | n8n | Agregar nodo Supabase insert tras acción Tuya |
| `src/components/dashboard/system-status.tsx` | Frontend | Solo validación — no se espera cambio de código |
| Supabase tabla `sensor_riego_20` | DB | Recibe filas sintéticas con `es_valido=false`; sin migración |
