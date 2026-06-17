---
type: tasks
change_name: estado-riego-no-actualiza-tras-agente-chat
domain: fix
status: applied
spec_refs:
  - "[[riego-estado-realtime-inmediato-desde-agente]]"
created: "2026-06-16"
updated: "2026-06-17"
---

# Tasks: estado-riego-no-actualiza-tras-agente-chat

## Orden de ejecución

Este cambio opera **exclusivamente en n8n** — no hay modificaciones en el repositorio de código.

El flujo de trabajo con MCP n8n sigue este orden para cada sub-workflow:
`get_workflow_details` → construir JSON del nodo nuevo → `validate_workflow` → `update_workflow` → `publish_workflow`

Dependencias entre tareas:
- **T1** y **T2** son independientes entre sí (cada una edita un workflow diferente) y pueden ejecutarse en cualquier orden.
- **T3** (verificación end-to-end) requiere que **T1** y **T2** estén completadas.

---

## Spec: riego-estado-realtime-inmediato-desde-agente

### Tarea 1: Agregar nodo Supabase Insert en el sub-workflow "Abrir Riego"

- **Recurso n8n**: Workflow `Abrir Riego` — ID `Dv7HENb84Q3d2kdo`
- **Qué hacer**:
  1. Obtener la definición actual del workflow con `get_workflow_details(workflowId: "Dv7HENb84Q3d2kdo")`.
  2. Identificar el nodo HTTP Request a Tuya (el último nodo activo del workflow).
  3. Agregar un nuevo nodo de tipo **Supabase > Insert** posicionado inmediatamente después del nodo HTTP Request Tuya, conectado en su salida principal.
  4. Configurar el nodo con los siguientes campos exactos:
     - `table`: `sensor_riego_20`
     - `fields` (Define Below):
       - `timestamp`: `={{ $now.toISO() }}`
       - `user_id`: `7d2cbed5-8d48-439e-b4ea-7c163ee05e59`
       - `es_evento_riego`: `true`
       - `humedad`: `0`
       - `es_valido`: `false`
     - `continueOnFail`: `true`
  5. Validar el workflow con `validate_workflow`.
  6. Actualizar el workflow con `update_workflow(workflowId: "Dv7HENb84Q3d2kdo", ...)`.
  7. Publicar el workflow con `publish_workflow(workflowId: "Dv7HENb84Q3d2kdo")`.
- **Criterio de completado**: El workflow `Abrir Riego` está activo/publicado y contiene el nuevo nodo Supabase Insert como último nodo en la cadena, con `continueOnFail: true`.

- [x] Llamar `get_workflow_details` con ID `Dv7HENb84Q3d2kdo` y registrar el nombre del nodo HTTP Request Tuya y sus coordenadas de posición
- [x] Construir la configuración del nodo Supabase Insert con todos los campos del esquema sintético (`timestamp`, `user_id`, `es_evento_riego=true`, `humedad=0`, `es_valido=false`)
- [x] Verificar que `continueOnFail: true` está activado en el nodo nuevo
- [x] Conectar la salida del nodo HTTP Request Tuya a la entrada del nuevo nodo Supabase Insert
- [x] Llamar `validate_workflow` con el código actualizado y confirmar que no hay errores
- [x] Llamar `update_workflow` con el ID `Dv7HENb84Q3d2kdo` y el código validado
- [x] Llamar `publish_workflow` para activar el workflow actualizado
- [x] Confirmar en la respuesta de n8n que el workflow está en estado `active` — activeVersionId: `f803ca53-5099-4ab7-9669-9c21c24b9bc4`

---

### Tarea 2: Agregar nodo Supabase Insert en el sub-workflow "Cerrar Riego"

- **Recurso n8n**: Workflow `Cerrar Riego` — ID `3agnzp3kKr688Qn7`
- **Qué hacer**:
  1. Obtener la definición actual del workflow con `get_workflow_details(workflowId: "3agnzp3kKr688Qn7")`.
  2. Identificar el nodo HTTP Request a Tuya (el último nodo activo del workflow).
  3. Agregar un nuevo nodo de tipo **Supabase > Insert** posicionado inmediatamente después del nodo HTTP Request Tuya, conectado en su salida principal.
  4. Configurar el nodo con los siguientes campos exactos (igual que T1 excepto `es_evento_riego`):
     - `table`: `sensor_riego_20`
     - `fields` (Define Below):
       - `timestamp`: `={{ $now.toISO() }}`
       - `user_id`: `7d2cbed5-8d48-439e-b4ea-7c163ee05e59`
       - `es_evento_riego`: `false`  ← diferencia crítica respecto a T1
       - `humedad`: `0`
       - `es_valido`: `false`
     - `continueOnFail`: `true`
  5. Validar el workflow con `validate_workflow`.
  6. Actualizar el workflow con `update_workflow(workflowId: "3agnzp3kKr688Qn7", ...)`.
  7. Publicar el workflow con `publish_workflow(workflowId: "3agnzp3kKr688Qn7")`.
- **Criterio de completado**: El workflow `Cerrar Riego` está activo/publicado y contiene el nuevo nodo Supabase Insert como último nodo en la cadena, con `continueOnFail: true`.

- [x] Llamar `get_workflow_details` con ID `3agnzp3kKr688Qn7` y registrar el nombre del nodo HTTP Request Tuya y sus coordenadas de posición
- [x] Construir la configuración del nodo Supabase Insert con `es_evento_riego=false` (señal de cierre de riego)
- [x] Verificar que todos los demás campos coinciden con T1 (`timestamp` expression, `user_id`, `humedad=0`, `es_valido=false`, `continueOnFail=true`)
- [x] Conectar la salida del nodo HTTP Request Tuya a la entrada del nuevo nodo Supabase Insert
- [x] Llamar `validate_workflow` con el código actualizado y confirmar que no hay errores
- [x] Llamar `update_workflow` con el ID `3agnzp3kKr688Qn7` y el código validado
- [x] Llamar `publish_workflow` para activar el workflow actualizado
- [x] Confirmar en la respuesta de n8n que el workflow está en estado `active` — activeVersionId: `408c1031-b500-4fb8-beca-9adc68e9da71`

---

### Tarea 3: Verificación end-to-end (smoke test manual)

- **Requiere**: Tarea 1 y Tarea 2 completadas
- **Recurso**: Dashboard del proyecto en producción + Supabase Table Editor (`sensor_riego_20`)
- **Qué hacer**: Ejecutar el flujo completo de apertura y cierre de riego desde el chat del agente, observando el dashboard en tiempo real y verificando las filas insertadas en Supabase.
- **Criterio de completado**: Todos los acceptance criteria de la spec `riego-estado-realtime-inmediato-desde-agente` se cumplen de forma observada.

**Escenario 1 — Abrir el riego (Scenario: Agente abre el riego y el dashboard refleja el cambio de inmediato):**
- [ ] Abrir el dashboard con la pestaña de estado del sistema visible; confirmar que el estado inicial muestra "Inactivo"
- [ ] Enviar al chat del agente el mensaje "abre el riego" y registrar el timestamp exacto
- [ ] Verificar que el panel "Riego" cambia a "Regando" en menos de 2 segundos sin recargar la página
- [ ] Verificar en Supabase Table Editor que existe una fila nueva en `sensor_riego_20` con `es_valido=false`, `es_evento_riego=true`, `humedad=0`, `user_id=7d2cbed5-8d48-439e-b4ea-7c163ee05e59`

**Escenario 2 — Cerrar el riego (Scenario: Agente cierra el riego y el dashboard refleja el cambio de inmediato):**
- [ ] Con el estado "Regando" activo, enviar al chat del agente "cierra el riego" y registrar el timestamp
- [ ] Verificar que el panel "Riego" cambia a "Inactivo" en menos de 2 segundos sin recargar la página
- [ ] Verificar en Supabase Table Editor que existe una fila nueva con `es_valido=false`, `es_evento_riego=false`, `humedad=0`

**Escenario 3 — No-regresión: señal no aparece en el gráfico (Scenario: La señal de control no aparece en el gráfico de humedad):**
- [ ] Verificar que el gráfico de humedad en el dashboard NO muestra ningún punto con valor 0% para los timestamps de las filas sintéticas insertadas en los escenarios anteriores
- [ ] Verificar que el gráfico sigue mostrando exclusivamente las mediciones reales del hardware (filas con `es_valido=true`)

**Escenario 4 — No-regresión: señal no altera períodos de riego (Scenario: La señal de control no altera los períodos de riego del gráfico):**
- [ ] Verificar que los períodos de riego visualizados en el gráfico histórico no incluyen un intervalo generado únicamente por la fila sintética (sin fila real adyacente)

**Escenario 5 — Continue on Error (Scenario: Fallo en el registro de señal no interrumpe el riego):**
- [ ] Confirmar en la configuración de los nodos Supabase Insert de T1 y T2 que `Continue on Error` está habilitado — este escenario se verifica por configuración, no requiere inducir fallo en producción
