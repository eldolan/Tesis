# Exploración: fix-dashboard-frontend

## Estado Actual

### Punto 1 — Gráfico de Riego: vista "sumatoria" y "apilado" con valores incorrectos

[fuente: código src/components/dashboard/irrigation-chart.tsx]
[fuente: código src/hooks/use-irrigation-data.ts]
[fuente: código src/types/index.ts]

#### Vista "sumatoria" — humedad en 0 con saltos extraños

El componente `IrrigationChart` (líneas 34–51) construye `chartData` mapeando arrays `data.sensor1/sensor2/sensor3` provenientes del hook `useIrrigationData`. En vista `"sum"` grafica el campo `average` (línea 108), que es el promedio de los valores no-nulos de `[s1, s2, s3]`.

**Causa raíz de valores en 0 con saltos**: el hook `useIrrigationData` alinea los datos de las tres tablas por timestamp **exacto** (líneas 49–57 del hook). Si un sensor no registró lectura para un timestamp, se inserta `null` en ese índice del array. El `average` en `chartData` filtra nulos (`filter((v): v is number => v !== null)`), pero si los tres sensores tienen null para un punto, `avg` resulta `null`. Recharts renderiza `null` como un gap en la línea — el `average` nunca llega a 0 a menos que la columna `humedad` tenga valores reales de 0 en la BD.

**Problema real de "humedad en 0"**: el endpoint de ingesta en `route.ts` (línea 163) aplica `Math.max(parsed.hum_20!, 0)` antes de insertar — valores negativos del sensor se convierten en 0. Si el hardware produce lecturas erróneas o fuera de rango, se persiste 0 como humedad válida. El hook después propaga esos 0s al chart.

**Problema de "escala 0–100 pero dominio hardcodeado"**: el dominio del eje Y en vista `"sum"` está fijado en `[40, 100]` (línea 95). Si los datos reales de humedad del suelo están en un rango diferente (p. ej., 0–4 porque el sensor devuelve valores fraccionarios en m³/m³ en vez de porcentaje), la curva quedará comprimida en la parte baja o invisible.

#### Vista "apilado" — escala 0–4 en vez de 0–100

En vista `"stacked"` el eje Y usa `domain={["auto", "auto"]}` (hereda el default de Recharts cuando no se especifica dominio). Los valores que llegan de BD son los almacenados directamente desde el CSV del hardware: si el firmware envía humedad volumétrica (m³/m³, rango 0–0.5) o un rango 0–4 por calibración del sensor, esos valores se persisten sin normalización a porcentaje. El hook no transforma ni normaliza la humedad; entrega los valores "crudos" de la BD.

**Causa raíz definitiva**: la transformación `Math.max(parsed.hum_X!, 0)` en `route.ts` garantiza no-negativo pero NO normaliza a escala 0–100. Si el sensor entrega valores en 0–4 (posiblemente unidades de conductividad de humedad en cS/m o escala volumétrica), esos llegan al chart sin conversión. El `"auto"` del eje Y escala al rango de los datos reales, que es 0–4 en vez de 0–100.

**Diferencia con FertilizerChart**: `fertilizer-chart.tsx` no tiene este problema porque los valores NPK no tienen expectativa de escala porcentual.

---

### Punto 2 — Notificaciones en Supabase sin UI

[fuente: código src/types/index.ts línea 31]
[fuente: código src/components/dashboard/dashboard-grid.tsx]
[fuente: código src/components/layout/navbar.tsx]

#### Confirmación: NO hay componente que consuma `notifications`

Búsqueda exhaustiva en `src/`: **cero referencias** a la tabla `notifications` fuera de `src/types/index.ts`. El tipo `Notification` existe (campos: `id`, `user_id`, `title`, `message`, `read`, `created_at`) pero ningún hook, componente ni route handler lo usa.

El `navbar.tsx` tiene un ícono estático de campana (`/images/bell.svg`, línea 56) que es solo un `<a href="#">` decorativo — sin lógica de notificaciones, sin badge de conteo, sin dropdown.

`DashboardGrid` (header, línea 52–65) tiene zona de acciones con el email del usuario y botón de LogOut pero sin notificaciones.

#### Dónde debería integrarse

El punto de integración más natural es el header del `DashboardGrid` (zona de acciones, línea 52–65), dado que el `Navbar` en `src/components/layout/navbar.tsx` está infrautilizado (links sin funcionalidad, no se usa en el dashboard principal). El dashboard usa su propio header inline.

---

### Punto 3 — Indicador Realtime "desconectado"

[fuente: código src/components/dashboard/system-status.tsx líneas 93–98]

#### Definición de "conectado/desconectado"

`SystemStatus` crea un canal Supabase Realtime llamado `"status-check"` (línea 93) y registra el callback `.subscribe((status) => { setRealtimeConnected(status === "SUBSCRIBED") })`. Solo se considera conectado si el estado del canal es exactamente `"SUBSCRIBED"`.

**Causa raíz de "desconectado"**: el canal `"status-check"` es un canal **vacío** — no tiene listeners `.on(...)`. Supabase Realtime puede tomar tiempo en confirmar la suscripción (latencia de red), o en ciertos entornos (dev local, red inestable, Supabase pausado) el canal nunca alcanza `"SUBSCRIBED"` y queda en `"JOINING"` o `"TIMED_OUT"`. Además, el estado inicial del hook es `false` (línea 38), así que mientras el canal no confirme suscripción, el indicador muestra "Desconectado".

**Problema adicional**: el componente usa `createClient()` en dos lugares dentro del mismo `useEffect` — una instancia para `descubrirSensores()` (línea 50) y otra para el canal (línea 93), y una tercera instancia en el cleanup (línea 98). `createClient()` con `createBrowserClient` de `@supabase/ssr` es un singleton por URL/key, por lo que en la práctica es el mismo cliente, pero la llamada en cleanup `createClient().removeChannel(channel)` donde `channel` fue creado desde otra llamada podría fallar en remover correctamente si la referencia de cliente fuera diferente.

---

### Punto 4 — Sensores OK

[fuente: código src/components/dashboard/system-status.tsx]

Los sensores se ven correctamente porque `SystemStatus` descubre sensores dinámicamente: consulta cada tabla candidata buscando datos en las últimas 24h (línea 45–59), calcula el estado `"online"/"offline"` según si la última lectura fue hace menos de 30 minutos (línea 63), y muestra los resultados correctamente. Este punto **no requiere cambio**.

---

### Punto 5 — "Salud General" dice "Parcial"

[fuente: código src/components/dashboard/system-status.tsx líneas 101–103, 186–198]

#### Definición exacta del estado

```
const todosOnline = totalDescubiertos > 0 && onlineCount === totalDescubiertos
// ...
{todosOnline && realtimeConnected ? "Optimo" : "Parcial"}
```

"Salud General" muestra **"Óptimo"** SOLO si se cumplen ambas condiciones:
1. `todosOnline` — todos los sensores descubiertos tienen `status === "online"` (última lectura hace < 30 min)
2. `realtimeConnected` — el canal `"status-check"` está en estado `"SUBSCRIBED"`

**Causa raíz de "Parcial"**: como el canal `"status-check"` nunca alcanza `"SUBSCRIBED"` (Punto 3), `realtimeConnected` permanece `false`, lo que fuerza "Parcial" **aunque todos los sensores estén online**. El estado "Parcial" es un falso positivo causado por el bug del indicador Realtime — ambos problemas tienen la misma causa raíz.

---

## Archivos Afectados

| Archivo | Rol | Impacto |
|---------|-----|---------|
| `src/components/dashboard/irrigation-chart.tsx` | Componente de gráfico de riego con vistas "apilado"/"sumatoria" | Bugfixes puntos 1a y 1b: dominio eje Y, transformación de datos |
| `src/hooks/use-irrigation-data.ts` | Hook que consulta sensor_riego_20/40/60 y construye `IrrigationData` | Posible normalización de datos o exposición de unidades |
| `src/components/dashboard/system-status.tsx` | Estado del sistema: sensores, realtime, salud general | Bugfixes puntos 3 y 5: detección de conexión realtime |
| `src/types/index.ts` | Tipos TypeScript del dominio (incluye `Notification`) | Puede necesitar tipos nuevos para hook de notificaciones |
| `src/components/dashboard/dashboard-grid.tsx` | Grid principal del dashboard + header con zona de acciones | Punto 2: integrar UI de notificaciones en el header |
| `src/components/layout/navbar.tsx` | Navbar con ícono de campana estático | Punto 2 alternativo: activar campana con lógica real (alternativa) |
| (nuevo) `src/hooks/use-notifications.ts` | No existe — debe crearse para punto 2 | Hook que consulta tabla `notifications` con Realtime |
| (nuevo) `src/components/dashboard/notifications-popover.tsx` | No existe — debe crearse para punto 2 | Componente dropdown/popover de notificaciones |

---

## Dependencias

- **Recharts ^3.8.0**: usado en `irrigation-chart.tsx` y `fertilizer-chart.tsx`. El dominio del eje Y y el comportamiento ante `null` son centrales para los bugs del punto 1.
- **@supabase/supabase-js ^2.101.1 / @supabase/ssr ^0.10.0**: Realtime channels para punto 3. La API `channel.subscribe(callback)` y los estados posibles (`SUBSCRIBED`, `JOINING`, `TIMED_OUT`, `CHANNEL_ERROR`, `CLOSED`) son críticos.
- **`src/lib/supabase/client.ts`**: `createBrowserClient` — singleton por convención de `@supabase/ssr`.
- **Tabla `notifications`**: existe en Supabase con RLS `auth.uid() = user_id`, confirmada por el tipo en `types/index.ts`.

---

## Approaches Posibles

### Bug 1a — Vista "sumatoria": humedad en 0 / valores fuera de escala

#### Approach A: Fix del dominio en el chart (solo frontend)
- **Descripción**: Cambiar `domain={[40, 100]}` a `domain={[0, 100]}` o `["auto", "auto"]` en vista `"sum"`. Agregar normalización en `chartData`: si los valores están en rango 0–1 (fracción volumétrica), multiplicar × 100.
- **Pros**: cambio mínimo, no toca backend ni BD. Resolución inmediata.
- **Contras**: si la unidad real del sensor NO es porcentaje sino otra escala, multiplicar × 100 puede ser incorrecto. Requiere confirmar las unidades del hardware.
- **Esfuerzo**: XS

#### Approach B: Normalización en el endpoint de ingesta
- **Descripción**: Modificar `route.ts` para normalizar `hum_X` a rango 0–100 al momento de persista (p. ej., `hum * 100` si el CSV entrega 0–1).
- **Pros**: datos "correctos" en BD, beneficia cualquier consulta futura.
- **Contras**: cambia datos ya insertados, requiere migración de filas existentes. Mayor impacto.
- **Esfuerzo**: M

**Recomendación Bug 1a**: Approach A, con detección de rango en el chart (si `max(values) <= 4`, asumir escala volumétrica y escalar × 25 a 0–100). Menos riesgo que tocar el endpoint.

---

### Bug 1b — Vista "apilado": escala 0–4

#### Approach A: Normalización en el chart (condicional por rango detectado)
- **Descripción**: En la construcción de `chartData`, detectar si los valores máximos son <= 4 (indicativo de escala no-porcentual) y aplicar factor de escala. Establecer `domain={[0, 100]}` explícito en vista `"stacked"`.
- **Pros**: no altera BD, arregla visualización inmediatamente.
- **Contras**: heurística frágil — si el suelo está muy seco y todos los valores son < 4%, la normalización incorrecta escalaría valores legítimos.
- **Esfuerzo**: S

#### Approach B: Mostrar datos "as-is" y cambiar etiqueta de unidad
- **Descripción**: Dejar los valores como están, actualizar la etiqueta del eje Y para mostrar la unidad correcta del sensor (ej. "Humedad Volumétrica (m³/m³)") y NO fijar dominio 0–100.
- **Pros**: honesto con los datos, sin riesgo de escalar mal.
- **Contras**: el usuario pierde la referencia de 0–100%; las zonas de referencia (ReferenceArea) en vista "sum" dejarían de tener sentido.
- **Esfuerzo**: XS

**Recomendación Bug 1b**: Approach A con la corrección del dominio explícito. La presencia de las `ReferenceArea` en 40–100 confirma que la intención del diseño es escala porcentual, por tanto los datos deben normalizarse al chart.

---

### Bug 2 — Notificaciones sin UI

#### Approach A: NotificationsPopover en el header de DashboardGrid
- **Descripción**: Crear hook `use-notifications.ts` (consulta tabla `notifications`, filtra `read=false`, suscripción Realtime). Crear componente `notifications-popover.tsx` (badge con conteo en ícono Bell, dropdown con lista de notificaciones, marcar como leída). Integrar en el header de `DashboardGrid` (zona de acciones, línea 52–65).
- **Pros**: integración en el componente más actual y usado. No toca el Navbar legacy. Consistente con el patrón de hooks existentes (`use-irrigation-data`, `use-fertilizer-data`).
- **Contras**: requiere crear 2 archivos nuevos y modificar `DashboardGrid`.
- **Esfuerzo**: M

#### Approach B: Activar ícono de campana en Navbar
- **Descripción**: Refactorizar `Navbar` para consumir un hook de notificaciones en el ícono de campana existente.
- **Pros**: el slot visual ya existe en navbar.
- **Contras**: `Navbar` no se usa en el dashboard principal (`DashboardGrid` tiene su propio header). Navbar parece ser código legacy sin uso activo.
- **Esfuerzo**: M

**Recomendación Bug 2**: Approach A. El dashboard usa `DashboardGrid` y no el `Navbar`, por lo que el Approach A asegura que la UI sea visible.

---

### Bug 3 — Realtime "desconectado"

#### Approach A: Canal con listener real (no vacío)
- **Descripción**: Cambiar el canal `"status-check"` para que escuche cambios reales (p. ej., suscribirse a `sensor_riego_20` para el usuario), así el canal tendrá actividad y alcanzará `"SUBSCRIBED"`. Alternativamente, manejar todos los estados del canal en el callback: `SUBSCRIBED` → conectado, `JOINING` → cargando, `TIMED_OUT`/`CHANNEL_ERROR`/`CLOSED` → desconectado.
- **Pros**: comportamiento correcto y robusto. Distingue estados intermedios.
- **Contras**: mínimamente más complejo.
- **Esfuerzo**: XS

#### Approach B: Reutilizar el canal Realtime de `use-irrigation-data`
- **Descripción**: Exponer el estado de la suscripción desde `useIrrigationData` y compartirlo via Context o prop drilling hasta `SystemStatus`.
- **Pros**: evita crear un canal adicional, reutiliza canales existentes.
- **Contras**: coupling entre hooks no relacionados; `SystemStatus` no debería depender del hook de riego para conocer el estado de conexión.
- **Esfuerzo**: S

**Recomendación Bug 3**: Approach A — manejar todos los estados del callback de `channel.subscribe()`. No crear canal vacío; o bien suscribirse a un `"broadcast"` channel dummy que Supabase permite.

---

### Bug 5 — "Salud General" siempre "Parcial"

Este bug es consecuencia directa del Bug 3. Al fijar Bug 3 (realtimeConnected correcto), "Salud General" también se corrige automáticamente. No requiere cambios adicionales en `system-status.tsx`.

---

## Recomendación

**Approach recomendado**: un único PR con los 4 fixes independientes:

1. **Bug 1 (chart)**: Normalizar datos de humedad en la construcción de `chartData` dentro de `IrrigationChart`. Agregar factor de escala condicional y fijar `domain` explícito en ambas vistas. No tocar BD.
2. **Bug 2 (notificaciones)**: Crear `use-notifications.ts` + `notifications-popover.tsx`, integrar en header de `DashboardGrid`.
3. **Bug 3 (realtime)**: Reemplazar canal vacío `"status-check"` por canal con manejo completo de estados (`SUBSCRIBED`, `JOINING`, `TIMED_OUT`, `CHANNEL_ERROR`).
4. **Bug 5**: Se resuelve como efecto colateral del Bug 3.

**Justificación**: los 4 bugs son independientes entre sí excepto 3→5. El orden de menor a mayor riesgo es: Bug 3 (trivial) → Bug 1 (requiere confirmar unidad del sensor) → Bug 2 (nueva UI).

---

## Riesgos Identificados

- **Unidades del sensor de humedad no confirmadas por BD**: el análisis asume que los datos en 0–4 son escala volumétrica, pero no hay acceso directo a la BD para verificar. Si los datos reales en `sensor_riego_*` ya están en porcentaje (0–100) y el bug es de dominio del eje, el factor de escala sería incorrecto. **Mitigación**: agregar un `console.log` de los primeros valores en dev antes de aplicar transformación, o exponer en `sdd-design` una query de diagnóstico a la BD.
- **Canal Supabase Realtime vacío**: Supabase puede no garantizar `SUBSCRIBED` para canales sin listeners en versiones futuras. **Mitigación**: usar canal con al menos un listener `broadcast` o suscribirse a una tabla real.
- **Integración notificaciones sin spec de UI**: el tipo `Notification` existe pero no hay spec que defina cuándo se crean las notificaciones ni qué las genera (n8n, triggers de BD, etc.). **Mitigación**: el hook de notificaciones debe ser read-only; no necesita conocer el origen para renderizarlas.
- **`initialized.current` como guard en hooks de riego**: el patrón de `initialized.current = false` antes de re-llamar `fetchInitial()` desde el callback Realtime puede causar re-fetch infinito si llegan muchos eventos en poco tiempo. **Mitigación** (debt): agregar debounce. Registrado como debt candidate.
