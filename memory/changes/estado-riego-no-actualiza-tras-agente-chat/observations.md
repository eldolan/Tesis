---
type: observations
change_name: estado-riego-no-actualiza-tras-agente-chat
phase: sdd-apply
created: "2026-06-17"
---

# Observaciones — sdd-apply

## T1: Abrir Riego (`Dv7HENb84Q3d2kdo`)

### Nodo nuevo agregado
- **Nombre**: `Registrar Señal Abrir Riego`
- **Tipo**: `n8n-nodes-base.supabase` v1
- **Posición**: `[480, 0]` (inmediatamente tras `Tuya Abrir Riego` en `[240, 0]`)
- **Credencial auto-asignada**: `Supabase account` (tipo `supabaseApi`) — misma credencial usada por el workflow "Ingesta de Sensores"
- **continueOnFail**: `true`
- **Campos configurados**:
  - `timestamp`: `={{ $now.toISO() }}`
  - `user_id`: `7d2cbed5-8d48-439e-b4ea-7c163ee05e59`
  - `es_evento_riego`: `true`
  - `humedad`: `0`
  - `es_valido`: `false`

### Resultados de las operaciones MCP
- `validate_workflow`: ✅ válido, 3 nodos
- `update_workflow`: ✅ `nodeCount: 3`, credencial auto-asignada `Supabase account`
- `publish_workflow`: ✅ `success: true`, `activeVersionId: f803ca53-5099-4ab7-9669-9c21c24b9bc4`

---

## T2: Cerrar Riego (`3agnzp3kKr688Qn7`)

### Nodo nuevo agregado
- **Nombre**: `Registrar Señal Cerrar Riego`
- **Tipo**: `n8n-nodes-base.supabase` v1
- **Posición**: `[480, 0]` (inmediatamente tras `Tuya Cerrar Riego` en `[240, 0]`)
- **Credencial auto-asignada**: `Supabase account` (tipo `supabaseApi`) — misma credencial usada por el workflow "Ingesta de Sensores"
- **continueOnFail**: `true`
- **Campos configurados**:
  - `timestamp`: `={{ $now.toISO() }}`
  - `user_id`: `7d2cbed5-8d48-439e-b4ea-7c163ee05e59`
  - `es_evento_riego`: `false`  ← diferencia crítica respecto a T1
  - `humedad`: `0`
  - `es_valido`: `false`

### Resultados de las operaciones MCP
- `validate_workflow`: ✅ válido, 3 nodos
- `update_workflow`: ✅ `nodeCount: 3`, credencial auto-asignada `Supabase account`
- `publish_workflow`: ✅ `success: true`, `activeVersionId: 408c1031-b500-4fb8-beca-9adc68e9da71`

---

## Nota sobre credenciales

Los workflows "Abrir Riego" y "Cerrar Riego" originalmente no usaban ninguna credencial Supabase (usaban JS nativo con `httpRequest` y la clave de servicio hardcodeada en el código del nodo "Ingesta de Sensores"). El nodo Supabase nativo requiere la credencial `supabaseApi`. n8n auto-asignó `"Supabase account"` — la misma que usa el nodo `Insertar sensor_riego_` en "Ingesta de Sensores". No fue necesaria intervención manual.

---

## T3: Pendiente (smoke test manual)

El procedimiento de smoke test está documentado en `tasks.md` (sección "Tarea 3"). Requiere ejecución por parte del usuario/sdd-verify:
1. Abrir dashboard → enviar "abre el riego" al chat del agente → verificar cambio a "Regando" en <2s
2. Enviar "cierra el riego" → verificar cambio a "Inactivo" en <2s
3. Verificar filas en Supabase Table Editor (`sensor_riego_20`)
4. Verificar no-regresión en gráfico de humedad
