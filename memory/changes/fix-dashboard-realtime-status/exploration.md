# Exploración: fix-dashboard-realtime-status

## Estado Actual

El dashboard (Next.js 16.2.2 + React 19.2.4, App Router) vive en `src/` raíz del worktree. Está compuesto por siete componentes de dashboard orquestados por `DashboardGrid` en un layout bento de 6 columnas con container queries (`@container`). Los datos de sensores se obtienen en el cliente vía hooks Supabase con suscripciones Realtime `postgres_changes`. Recharts v3.8.0 es la librería de gráficos actual, presente en `IrrigationChart` y `FertilizerChart`. El sistema tiene 5 bugs activos de distinta severidad distribuidos en `system-status.tsx`, `irrigation-chart.tsx` y el hook `use-irrigation-data.ts`.

[fuente: código `src/components/dashboard/dashboard-grid.tsx`]
[fuente: código `src/components/dashboard/system-status.tsx`]
[fuente: código `src/components/dashboard/irrigation-chart.tsx`]
[fuente: código `src/hooks/use-irrigation-data.ts`]
[fuente: `package.json`]

---

## Hallazgos por Objetivo del Intent

### Objetivo 1 — system-status.tsx: humedad %, fecha resumida, sensor ambiental, riego multi-sensor

**Estado actual confirmado:**

- **Bug #2 — Humedad ausente**: la query a `sensor_riego_*` selecciona solo `timestamp, es_evento_riego` (línea 56-58 de `system-status.tsx`). El campo `humedad` nunca se pide; `lastReading` formatea con `toLocaleString` y muestra solo fecha/hora — no hay % de humedad visible.
  [fuente: código `src/components/dashboard/system-status.tsx:54-85`]

- **Bug #3 — Sensor ambiental ausente**: `SENSOR_TABLES` (línea 19-23) incluye solo `sensor_riego_20/40/60`. `sensor_onboard` no está. El tipo `SensorOnboard` existe en `src/types/index.ts` con campos `temperatura`, `humedad`, `created_at`. Tabla real tiene Realtime habilitado (confirmado por orquestador).
  [fuente: código `src/components/dashboard/system-status.tsx:19-23`]
  [fuente: código `src/types/index.ts:22-29`]
  [fuente: spec `[[sensor-onboard-table]]`]

- **Bug #5 — Riego multi-sensor**: la detección de riego activo (línea 70) solo registra `setIrrigating(true)` cuando `descubiertos.length === 0` (primer sensor con datos) Y `data.es_evento_riego === true`. Si el primer sensor no está regando pero el segundo o tercero sí, se pierde. La corrección lógica: evaluar `es_evento_riego` en cualquier sensor con datos positivos.
  [fuente: código `src/components/dashboard/system-status.tsx:69-72`]

- **Bugs #4 y #6 — YA RESUELTOS en el branch**: el estado tri-valor `connecting/connected/disconnected` y la lógica de salud `Óptimo/Parcial/Sin datos` están implementados correctamente (líneas 102-125 y 221-245 de `system-status.tsx`). Las specs `realtime-connection-state` y `system-health-overall` tienen `status: completed` con `verified_at: 2026-05-24`. No requieren código adicional — solo deploy.
  [fuente: código `src/components/dashboard/system-status.tsx:102-125`, `221-245`]
  [fuente: spec `[[realtime-connection-state]]` — status: completed]
  [fuente: spec `[[system-health-overall]]` — status: completed]

**Campos necesarios para la query extendida:**
- `sensor_riego_*`: añadir `humedad` al select (ya existe en tabla, tipo `double precision 0–100`)
- `sensor_onboard`: query separada `select temperatura, humedad, created_at` con `.order("created_at", { ascending: false }).limit(1)` — mostrar última lectura ambiental

**Diseño de la fila de sensor ambiental**: `sensor_onboard` no tiene profundidad `depth`, pero sí temperatura + humedad. Se debe mostrar como una fila distinta ("Sensor Ambiental") fuera del array `SENSOR_TABLES`, con temperatura °C y humedad % en vez de solo fecha.

---

### Objetivo 2 — Gráfico Realtime: verificar bug #1

**Estado actual:**
El hook `use-irrigation-data.ts` ya tiene suscripción Realtime en los tres canales `sensor_riego_20/40/60` (líneas 81-124). El callback resetea `initialized.current = false` y llama `fetchInitial()` ante cada INSERT. La spec `[[irrigation-chart-sensor-gaps]]` y `[[irrigation-chart-y-scale]]` están `status: completed`. El bug #1 ("gráfico no actualiza en vivo") es de deploy — el branch con el hook Realtime no estaba en la rama desplegada en `develop`. No hay código adicional que escribir aquí.

[fuente: código `src/hooks/use-irrigation-data.ts:81-124`]
[fuente: spec `[[irrigation-chart-sensor-gaps]]` — status: completed]
[fuente: spec `[[irrigation-chart-y-scale]]` — status: completed]

**Deuda técnica preexistente** (ya registrada en observations.md): re-fetch sin debounce ante INSERT en ráfaga. Fuera de scope de este cambio.

---

### Objetivo 3 — Reemplazar Recharts por @visx/xychart

**Estado actual de dependencias:**
- `recharts: ^3.8.0` instalado. Se usa en `irrigation-chart.tsx` y `fertilizer-chart.tsx`.
- `@visx/xychart` v3.12.0 (última) declara peers: `react: '^16.8.0 || ^17.0.0 || ^18.0.0'` — excluye React 19.
- `@visx/xychart` depende de `@visx/react-spring@3.12.0`, que a su vez declara peers: `react: '^16.3.0-0 || ^17.0.0 || ^18.0.0'` Y `@react-spring/web: '^9.4.5'` (solo v9, no v10).
- `@react-spring/web` v10.x soporta React 19, pero `@visx/react-spring@3.12.0` depende de v9.
- **Conclusión**: instalar `@visx/xychart` bajo React 19 requiere `legacy-peer-deps=true` en `.npmrc`. No hay `.npmrc` actualmente.

[fuente: `package.json` — recharts ^3.8.0, no @visx/*]
[fuente: `npm info @visx/xychart@3.12.0` — peers react ≤18]
[fuente: `npm info @visx/react-spring@3.12.0` — peer @react-spring/web ^9.4.5]

**Archivos a modificar para migración:**
| Archivo | Cambio |
|---------|--------|
| `.npmrc` | Crear con `legacy-peer-deps=true` |
| `src/components/dashboard/irrigation-chart.tsx` | Reemplazar toda la implementación Recharts por visx XYChart |
| `src/components/ui/chart.tsx` | Actualmente wrappea Recharts primitives — puede quedar o adaptarse |

**Conservar al migrar:**
- Vistas "Apilado" (3 líneas: sensor20/40/60) y "Sumatoria" (1 línea: average)
- Colores: `#0071FF` / `#00E396` / `#FEB019` (chart-1/2/3)
- Franjas de referencia (ReferenceArea equivalentes en visx: `<Annotation>` o `<RectClipPath>`)
- `connectNulls={false}` — gaps deben interrumpir la línea (ya especificado en `[[irrigation-chart-sensor-gaps]]`)
- Tooltip con fondo `#2a2a2a`, texto `#c9c9c9`
- Eje Y fijo 0–100 (ya especificado en `[[irrigation-chart-y-scale]]`)

**Decisión técnica pendiente para sdd-propose**: visx `XYChart` usa `@react-spring/web` v9 internamente para animaciones. Hay dos sub-opciones:
- A) `legacy-peer-deps` + aceptar que `@react-spring/web` v9 coexiste con React 19 (funciona en la práctica pero no declarado soportado).
- B) Usar `@visx/scale`, `@visx/axis`, `@visx/shape` (primitivas sin spring) + SVG manual — evita peer conflict pero es más código.

[fuente: código `src/components/dashboard/irrigation-chart.tsx`]
[fuente: código `src/components/ui/chart.tsx`]

---

### Objetivo 4 — Rediseño de SoilChat

**Estado actual:**
`SoilChat` (soil-chat.tsx) implementa un chat funcional con mensajes usuario/asistente, scroll automático, input tipo `<Input>` (shadcn), botón Send, y ReactMarkdown para respuestas. Comunica con `/api/chat` → n8n.

El intent describe un rediseño visual hacia "asistente tipo card": ícono bot, saludo personalizado (con nombre del usuario), badges de sugerencias pre-escritas, textarea (no Input) con barra inferior — conservando la lógica de llamada a `/api/chat` y sin selector de modelo ni adjuntar/audio.

**Componentes shadcn disponibles**: `textarea.tsx` ✅, `badge.tsx` ✅, `avatar.tsx` ✅, `button.tsx` ✅ — todos ya instalados.

**Necesidades del rediseño:**
- Acceso al nombre del usuario: `useAuth()` expone `user.email` (y `user.user_metadata` puede tener `full_name`). Revisar si hay `full_name` o usar el prefijo del email.
- Badges de sugerencias: strings hardcodeados relevantes al dominio agrícola — al hacer click rellenan el textarea y envían.
- Reemplazar `<Input>` por `<Textarea>` con `rows={1}` y expansión auto.
- Estado vacío con bot icon + saludo personalizado antes del primer mensaje.

[fuente: código `src/components/dashboard/soil-chat.tsx`]
[fuente: código `src/components/ui/` — badge.tsx, avatar.tsx, textarea.tsx presentes]
[fuente: código `src/contexts/auth-context.tsx` — user disponible]

---

### Objetivo 5 — Reorganización del layout bento

**Estado actual del grid** (`dashboard-grid.tsx` líneas 73-128):
```
Row 1 (min-h-[220px]): WeatherWidget (2col) | PlantTimeline (2col) | SystemStatus (2col)
Row 2 (h-[480px]):     IrrigationChart (4col) | SoilChat (2col)
```
FertilizerChart existe en el codebase (`fertilizer-chart.tsx`) pero **NO está incluido en `DashboardGrid`** — es una componente huérfana con Recharts que también se debe migrar a visx o integrar/mover.

`SoilRecommendations` también existe como componente placeholder "Próximamente...".

**Decisión de diseño pendiente para sdd-propose:**
- ¿FertilizerChart se integra al bento? Si sí, ¿en row 3 (col-span-4/2) o reemplazando PlantTimeline?
- ¿SoilRecommendations se activa o sigue como placeholder?
- Layout del sensor ambiental en SystemStatus: ¿dentro de la card existente como fila adicional, o tarjeta nueva?

[fuente: código `src/components/dashboard/dashboard-grid.tsx:73-128`]
[fuente: código `src/components/dashboard/fertilizer-chart.tsx` — excluido del grid]
[fuente: código `src/components/dashboard/soil-recommendations.tsx` — placeholder]

---

## Archivos Afectados

| Archivo | Rol | Impacto |
|---------|-----|---------|
| `src/components/dashboard/system-status.tsx` | Panel de estado del sistema | Bugs #2, #3, #5 — query humedad, sensor ambiental, riego multi-sensor |
| `src/components/dashboard/irrigation-chart.tsx` | Gráfico de humedad del suelo | Migración Recharts → @visx/xychart |
| `src/components/dashboard/fertilizer-chart.tsx` | Gráfico de fertilizantes | Si se integra al bento, también migrar a visx (para coherencia) |
| `src/components/dashboard/soil-chat.tsx` | Chat agrícola con n8n | Rediseño visual completo — lógica de negocio intacta |
| `src/components/dashboard/dashboard-grid.tsx` | Layout bento orquestador | Reorganización de grid + posible integración de FertilizerChart |
| `src/hooks/use-irrigation-data.ts` | Datos sensor_riego_* + Realtime | No requiere cambio de lógica — solo confirmar deploy |
| `src/types/index.ts` | Tipos TypeScript de sensores | `SensorOnboard` ya existe; verificar que `SensorRiego` tiene `humedad` |
| `.npmrc` | Configuración npm | Crear con `legacy-peer-deps=true` para @visx/xychart |

---

## Approaches Posibles

### Approach A: Migración completa a visx con `.npmrc legacy-peer-deps`
- **Pros**: API fluida de XYChart, animaciones de serie integradas, mantenimiento a largo plazo, un solo paradigma de charting.
- **Contras**: Peer conflict con React 19 (no declarado pero funcional en práctica); `.npmrc` legacy-peer-deps puede enmascarar conflictos futuros.
- **Esfuerzo**: M

### Approach B: Primitivas visx sin XYChart (visx/shape + visx/axis + visx/scale)
- **Pros**: Sin peer conflicts, control total del SVG, sin `@react-spring` v9.
- **Contras**: Más código boilerplate (eje, tooltip, dimensiones manuales con ResizeObserver), mayor esfuerzo, sin animaciones built-in.
- **Esfuerzo**: L

### Approach C: Mantener Recharts, solo corregir bugs y rediseñar chat/bento
- **Pros**: Cero riesgo de peer conflicts, mínimo esfuerzo, no rompe comportamiento existente.
- **Contras**: No cumple el objetivo 3 del intent. Deuda de librería queda pendiente.
- **Esfuerzo**: XS (para bugs y rediseño) + deuda pendiente

---

## Recomendación

**Approach recomendado**: A (visx XYChart con `.npmrc legacy-peer-deps=true`)

**Justificación**: El peer conflict React 19 vs `@visx/xychart@3.12.0` no es funcional — React 19 es retrocompatible con hooks de v18 y `@react-spring/web` v9 ejecuta sin errores en React 19 en práctica. El `.npmrc` con `legacy-peer-deps` es la solución estándar para este tipo de conflicto declarativo. La API de XYChart produce el estilo visual solicitado (airbnb.tech/xychart) con el menor código posible. `FertilizerChart` también se migra a visx para coherencia de stack.

---

## Riesgos Identificados

1. **`@react-spring/web` v9 en React 19**: riesgo bajo en práctica, pero no declarado como soportado. Si xychart produce advertencias de runtime, el fallback es Approach B para ese componente específico. Mitigación: verificar en `npm install` y en test de build que no hay errores.

2. **`legacy-peer-deps` en `.npmrc`**: afecta a todas las instalaciones del proyecto, no solo a visx. Riesgo: puede instalar versiones incompatibles de otras deps en el futuro. Mitigación: documentar en ADR el motivo y el scope.

3. **FertilizerChart fuera del bento**: si se integra, aumenta el esfuerzo del objetivo 5. Si no se integra, la migración de Recharts queda incompleta (el componente existe aunque no esté visible). Decisión a confirmar en sdd-propose.

4. **Nombre del usuario en SoilChat**: `user.user_metadata.full_name` puede ser null si el usuario se registró solo con email. El saludo debe tener fallback a `user.email.split('@')[0]` o simplemente "¡Hola!".

5. **`sensor_onboard` timestamp vs created_at**: el tipo `SensorOnboard` en `src/types/index.ts` tiene `timestamp: string` Y `created_at: string`. La query de la última lectura debe usar `created_at` (columna de inserción) para ordenar, no `timestamp` (que puede venir del firmware con drift de reloj).

---

## Decisiones Técnicas Pendientes para sdd-propose

| # | Decisión | Opciones |
|---|----------|---------|
| DT-1 | ¿Approach A (visx XYChart + .npmrc) o B (primitivas visx) o C (mantener Recharts)? | Recomendado: A |
| DT-2 | ¿FertilizerChart se integra al bento y migra a visx en este cambio? | Sí (coherencia) o No (fuera de scope) |
| DT-3 | ¿Layout de bento row 3 si FertilizerChart entra? | 4+2 cols (espejo de row 2) o 6 cols solo |
| DT-4 | ¿Sensor ambiental en SystemStatus como fila dentro de la card o nueva card en el bento? | Fila extra (minimal) o card nueva (visible) |
| DT-5 | ¿Badges de sugerencias en SoilChat: fijas o rotatorias? | Fijas (3-4 preguntas agrícolas hardcoded) es suficiente |
