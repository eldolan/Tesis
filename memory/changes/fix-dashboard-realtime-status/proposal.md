---
type: proposal
change_name: "fix-dashboard-realtime-status"
domain: "feature"
status: approved
iteration: 1
created: "2026-05-25"
updated: "2026-05-25"
effort: M
tags: [proposal]
---

# Propuesta: fix-dashboard-realtime-status

## Intent

Rework del dashboard agrícola (Next.js 16 App Router + React 19 + Supabase, deploy en Vercel) para corregir bugs de lectura de sensores en `system-status.tsx`, modernizar el gráfico de humedad migrando de Recharts a `@visx/xychart`, rediseñar `SoilChat` con estilo de card asistente, y reorganizar el layout bento. Los bugs de realtime y salud (#4, #6) y el gráfico en vivo (#1) ya están resueltos en el branch y solo requieren deploy.

## Scope

**Incluye:**

- **Objetivo 1 — Sensores en `system-status.tsx`**: (a) añadir `humedad` al select de `sensor_riego_*` y mostrar **% humedad + fecha/hora resumida** de la última lectura; (b) añadir **sensor ambiental** consultando `sensor_onboard` (temperatura + humedad, ordenado por `created_at desc limit 1`) como fila distinta; (c) corregir **detección de riego activo** evaluando `es_evento_riego` en todos los sensores con datos, no solo el primero.
- **Objetivo 2 — Verificación de regresiones**: confirmar que bugs #1 (gráfico en vivo), #4 (realtime "Desconectado") y #6 (salud "Parcial") quedan resueltos al desplegar; sin código nuevo (specs ya `completed`).
- **Objetivo 3 — Migración del gráfico de humedad**: reemplazar Recharts por **`@visx/xychart`** (estilo XYChart) en `irrigation-chart.tsx`, conservando vistas **Apilado/Sumatoria**, colores de página (`#0071FF`/`#00E396`/`#FEB019`), gaps con `connectNulls=false`, eje Y fijo 0–100 y tooltip oscuro. Crear `.npmrc` con `legacy-peer-deps=true` para resolver el peer de React 19.
- **Objetivo 4 — Rediseño de `SoilChat`**: adoptar diseño de card asistente (ícono central, saludo personalizado con nombre del usuario y fallback al prefijo del email, badges de sugerencias agrícolas, `<Textarea>` con barra inferior). Conservar integración `/api/chat` → n8n y render markdown.
- **Objetivo 5 — Layout bento**: reorganizar `dashboard-grid.tsx` para aprovechar mejor el espacio.
- Despliegue: merge a `develop` + push (autorizado).

**Excluye explícitamente:**

- **Migración de `FertilizerChart`** a visx: queda fuera del bento y se registra como **deuda técnica** (sigue en Recharts). Solo se migra si resulta trivial durante la implementación.
- Selector de modelo y adjuntar/audio en `SoilChat`.
- Debounce del re-fetch en ráfaga de `use-irrigation-data.ts` (deuda preexistente ya registrada en observations).
- Activación de `SoilRecommendations` (sigue como placeholder).
- Limpieza de git del repo solo-Vercel (ya commiteada en `5e7f1e3`).

## Approach Propuesto

Cambio frontend acotado a la capa de presentación y data-fetching del cliente, sin tocar el backend ni el esquema Supabase. Para sensores, extender las queries existentes (`humedad` en `sensor_riego_*`; query separada a `sensor_onboard`) y reescribir la condición de riego para iterar todos los sensores. Para el gráfico se adopta **Approach A** de la exploración: `@visx/xychart` con `.npmrc legacy-peer-deps=true`, que da el estilo XYChart con menos boilerplate; el peer conflict con React 19 es declarativo y no funcional en la práctica, y se documenta su motivo en un ADR. `SoilChat` se rediseña con componentes shadcn ya instalados (`textarea`, `badge`, `avatar`, `button`) manteniendo intacta la lógica de `/api/chat`. El layout bento se reorganiza en `dashboard-grid.tsx`. El sensor ambiental se muestra como fila adicional dentro de la card de `SystemStatus` (opción minimal, DT-4).

## Esfuerzo Estimado

**M** — Cinco objetivos de alcance frontend acotado. El de mayor peso es la migración a visx (reescritura de un componente de gráfico + manejo de peer deps); los demás son cambios localizados de query, lógica y presentación sobre componentes existentes con dependencias shadcn ya disponibles. No hay cambios de backend ni de esquema.

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| `@react-spring/web` v9 (dep de `@visx/xychart`) no declara soporte React 19 | Media | Verificar en `npm install` y build sin errores; fallback a primitivas visx (Approach B) solo para ese componente si hay fallos de runtime |
| `legacy-peer-deps=true` afecta a todas las instalaciones del proyecto, no solo a visx | Media | Documentar motivo y scope en un ADR; revisar el lockfile tras instalar |
| `user.user_metadata.full_name` puede ser null para usuarios registrados solo con email | Baja | Fallback en cascada: `full_name` → prefijo de `user.email` → "¡Hola!" |
| Orden incorrecto de la última lectura ambiental por usar `timestamp` (drift de firmware) en vez de `created_at` | Baja | Ordenar `sensor_onboard` explícitamente por `created_at desc` |
| Deuda: `FertilizerChart` permanece en Recharts (stack de charting mixto) | Baja | Registrar como deuda técnica explícita; evaluar trivialidad de migración en apply |

## Trade-offs

- **A favor**: cumple los cinco objetivos del intent con un cambio de alcance frontend; un solo paradigma de charting en el componente principal del dashboard; rediseño de chat con componentes ya instalados (sin nuevas deps de UI); sin riesgo sobre backend ni esquema.
- **En contra**: `legacy-peer-deps` puede enmascarar conflictos futuros de otras dependencias; el stack de charting queda temporalmente mixto al dejar `FertilizerChart` en Recharts; la verificación de los bugs #1/#4/#6 depende del entorno desplegado, no solo del código.

## Criterios de Aceptación de Alto Nivel

1. `SystemStatus` muestra, por cada sensor de riego, **% de humedad y fecha/hora resumida** de su última lectura.
2. `SystemStatus` muestra una fila de **sensor ambiental** con temperatura y humedad de la última lectura de `sensor_onboard` (ordenada por `created_at`).
3. El indicador de **riego activo** se enciende si **cualquier** sensor de riego reporta `es_evento_riego = true`, no solo el primero.
4. El gráfico de humedad se renderiza con **`@visx/xychart`**, conserva las vistas **Apilado** y **Sumatoria**, los colores de página, gaps no conectados y eje Y 0–100.
5. `npm install` y el build de producción completan **sin errores** con el `.npmrc` configurado.
6. `SoilChat` presenta la **card asistente** (ícono, saludo personalizado con fallback, badges de sugerencias, textarea con barra inferior) y mantiene el flujo `/api/chat` → n8n con markdown.
7. El dashboard se renderiza en el **layout bento** reorganizado sin solapamientos ni huecos visibles en breakpoints de container query.
8. Tras el deploy a `develop`, los bugs #1, #4 y #6 quedan resueltos en el entorno desplegado.

## Decisiones Técnicas Resueltas

| # | Decisión | Resolución |
|---|----------|-----------|
| DT-1 | Estrategia de migración del gráfico | **Approach A**: `@visx/xychart` + `.npmrc legacy-peer-deps=true` |
| DT-2 | ¿`FertilizerChart` se migra a visx? | **No** — fuera de bento, registrar como deuda; migrar solo si trivial |
| DT-3 | Layout bento row 3 si entra `FertilizerChart` | N/A — `FertilizerChart` no entra al bento |
| DT-4 | Sensor ambiental: fila o card nueva | **Fila adicional** dentro de la card de `SystemStatus` |
| DT-5 | Badges de sugerencias: fijas o rotatorias | **Fijas** (3-4 preguntas agrícolas hardcoded) |
