---
type: proposal
change_name: "fix-dashboard-frontend"
domain: "fix"
status: approved
iteration: 2
created: "2026-05-24"
updated: "2026-05-24"
tags: [proposal]
effort: M
risks:
  - riesgo: "Supabase puede no confirmar SUBSCRIBED en un canal sin listeners reales"
    probabilidad: Media
  - riesgo: "El hook use-notifications ejecuta UPDATE read=true; debe quedar acotado por RLS a auth.uid()=user_id"
    probabilidad: Baja
---

# Propuesta: fix-dashboard-frontend

## Intent

Corregir 5 bugs del dashboard que degradan la lectura de datos y el estado del sistema: gráficos de riego con dominio Y incorrecto, notificaciones sin UI pese a existir la tabla, indicador de realtime siempre "desconectado", y salud del sistema atascada en "Parcial". El objetivo es que el dashboard refleje fielmente el estado real de sensores y conexión, y exponga las notificaciones ya persistidas. Todo el trabajo es **frontend-only** sobre el repo `eldolan/Tesis` desplegado en Vercel.

## Scope

**Incluye (frontend-only):**
- **Bug 1a/1b (charts de riego)**: fijar dominio Y explícito `domain={[0,100]}` en AMBAS vistas (sumatoria y apilado) de `irrigation-chart.tsx`, reemplazando `[40,100]` (sumatoria) y `["auto","auto"]` (apilado). **Sin normalización ni factor de escala**: la columna `humedad` ya está en la unidad correcta (escala 0–100 %, verificado contra BD). Manejo de gaps por nulls al alinear timestamps de los 3 sensores. Las `ReferenceArea` 40–100 se conservan (siguen en escala %).
- **Bug 2 (notificaciones)**: crear `use-notifications.ts` (lee tabla `notifications` + ejecuta `UPDATE read=true WHERE id=... AND user_id=auth.uid()` para marcar como leídas; no crea ni elimina filas; RLS por `auth.uid()=user_id`) + `notifications-popover.tsx` (badge de no-leídas, lista, acción marcar-como-leída), integrados en el header de `DashboardGrid` (`dashboard-grid.tsx:52-65`).
- **Bug 3 (realtime "desconectado")**: reescribir la suscripción de `system-status.tsx` para usar un canal con listener real (o broadcast con `.on(...)`) y manejar todos los estados del callback de `channel.subscribe()` (`SUBSCRIBED`, `JOINING`, `TIMED_OUT`, `CHANNEL_ERROR`, `CLOSED`).
- **Bug 5 (salud "Parcial")**: se resuelve automáticamente al corregir Bug 3 (`realtimeConnected` pasa a `true` → `todosOnline && realtimeConnected` → "Óptimo"). Validación, sin cambio de lógica propio.

**Excluye explícitamente:**
- Cualquier cambio a la base de datos, migraciones o al endpoint/ingesta de datos (vive en otro repo / n8n — fuera de este repo Vercel).
- Normalizar o escalar la humedad: el dato ya está en % (0–100). Los valores actuales 0–4 son lecturas reales bajas (sensores al aire, sin calibrar), no un problema de unidad.
- **Bug 4 (sensores)**: el descubrimiento dinámico (`system-status.tsx:49-85`) ya funciona — SIN CAMBIOS.
- Navbar legacy (`navbar.tsx:56`, campana decorativa `<a href="#">`): no se toca; la UI de notificaciones va en el header de `DashboardGrid`.
- Refactor del posible re-fetch infinito en hooks realtime por ráfagas de eventos → registrado como **debt candidate**, fuera de scope.

## Approach Propuesto

Cambio focalizado en 4 archivos (1 modificado, 2 nuevos, 1 reescritura parcial), sin tocar la capa de datos. Para los charts: fijar `domain={[0,100]}` explícito en ambas vistas de `irrigation-chart.tsx` (la humedad ya es %, sin normalización), manejando gaps por nulls al alinear los 3 sensores. Para notificaciones: hook `use-notifications.ts` que lee `notifications` y permite marcar como leída vía `UPDATE read=true` acotado por RLS, más un `notifications-popover.tsx` (badge, lista, acción) montado en el header. Para realtime: sustituir el canal vacío `"status-check"` por una suscripción con listener real y una máquina de estados que mapee todos los retornos de `subscribe()` a un booleano `realtimeConnected` correcto, lo que arregla Bug 5 como efecto colateral. Bug 4 se deja intacto.

## Esfuerzo Estimado

**M** — 4 archivos afectados (1 edición acotada de chart, 2 componentes/hooks nuevos para notificaciones, 1 reescritura de la suscripción realtime). Sin migraciones ni backend. El grueso del esfuerzo es la UI de notificaciones (con la acción marcar-como-leída) y la correcta máquina de estados de realtime; los charts son cambios mínimos (solo el dominio Y, sin normalización). La unidad de humedad quedó resuelta y verificada contra BD, eliminando la iteración de verificación que antes inflaba la incertidumbre.

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Supabase puede no confirmar `SUBSCRIBED` en un canal sin listeners reales | Media | Suscribir a una tabla real (postgres_changes) o broadcast con `.on(...)`; manejar timeouts y estados intermedios para no quedar en `false` indefinido. |
| El hook `use-notifications` ejecuta `UPDATE read=true`; debe quedar acotado por RLS a `auth.uid()=user_id` | Baja | El `UPDATE` lleva `WHERE id=... AND user_id=auth.uid()`; RLS impide tocar filas de otros usuarios. No crea ni elimina filas. |
| Re-fetch infinito en hooks realtime por ráfagas de eventos | Baja | Fuera de scope; registrado como debt candidate para un cambio futuro. |

## Trade-offs

- **A favor**: cambio acotado, frontend-only, sin riesgo sobre la capa de datos ni el pipeline de ingesta; arregla 5 bugs (4 con trabajo directo + 1 colateral) en 4 archivos; no toca el navbar legacy ni el descubrimiento de sensores que ya funcionan; con la unidad de humedad verificada, el fix de charts se reduce a fijar el dominio Y.
- **En contra**: los valores de humedad seguirán mostrándose bajos (0–4 %) porque reflejan lecturas reales de sensores sin calibrar — el dashboard será fiel al dato, pero la calibración/ingesta es un follow-up en otro repo.

## Follow-up fuera de scope

Corregir la **ingesta de datos** (firmware / serial-bridge / n8n — otro repo, no este Vercel) para:
- Calibración de sensores de humedad (lecturas actuales 0–4 % por sensores al aire, sin calibrar).
- `temperatura_c` llega NULL en BD.
- `sensor_riego_60` sin datos (tabla vacía).

Estos no son bugs de frontend; el dashboard ya refleja fielmente lo que la BD contiene.

## Notas de iteración

**Iteración 2 (2026-05-24)** — Resueltas las clarifications:
- Unidad de humedad **verificada contra BD** (escala 0–100 %; r20 ∈ {0,2,3,4} n=309, r40 ∈ {0,1} n=308, r60 vacía, temperatura_c NULL). El dato ya está en %. **Eliminada toda normalización**; Bug 1 = solo fijar `domain={[0,100]}`. Riesgo "Alta" de normalización incorrecta **ELIMINADO**.
- Notificaciones: confirmado que el hook permite **marcar como leídas** (`UPDATE read=true` acotado por RLS). Riesgo asociado se mantiene **Baja**.
- **Re-evaluación high-risk**: ya no hay ningún riesgo de probabilidad Alta; `effort` permanece en **M**. → El cambio **NO es high-risk** (no dispara `sdd-judgment` automático).
