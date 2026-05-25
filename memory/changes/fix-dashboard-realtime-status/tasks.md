# Tasks: fix-dashboard-realtime-status

## Orden de ejecución

Las tareas siguen esta secuencia de dependencias:

```
T1 (deps + .npmrc)
  └─► T2 (system-status.tsx — humedad, fecha, riego, ambiental)
  └─► T3 (irrigation-chart.tsx — migración visx)    ← requiere T1
  └─► T4 (soil-chat.tsx — card asistente)           ← independiente de T2/T3
T2 + T3 + T4
  └─► T5 (dashboard-grid.tsx — bento layout)        ← después de que los 3 componentes están listos
T1 + T2 + T3 + T4 + T5
  └─► T6 (build/lint — verificación final)
```

- **T1** debe ejecutarse primero: instala deps necesarias para T3 y crea `.npmrc`.
- **T2, T3, T4** pueden ejecutarse en cualquier orden tras T1 (sin dependencia entre sí).
- **T5** va después de T2/T3/T4 porque ajusta el bento que los contiene.
- **T6** es siempre el último paso: verifica que todo compile y pase lint.

---

## T1 — Dependencias visx + `.npmrc`

**Specs**: `[[chart-visx-rendering]]` (AC: install sin conflictos, build exitoso) + ADR-0004

- **Archivos**: `.npmrc` (crear), `package.json` (modificar)
- **Qué hacer**: Crear `.npmrc` con `legacy-peer-deps=true` para resolver el conflicto React 19 ↔ `@visx/react-spring`. Agregar las tres nuevas dependencias a `package.json` y ejecutar `npm install`.
- **Criterio de completado**: `npm install` termina sin errores ERESOLVE; `package-lock.json` generado; las tres deps aparecen en `node_modules/@visx/xychart`, `node_modules/@visx/responsive` y `node_modules/@react-spring`; no se degradan versiones de otras deps existentes.

- [ ] Crear archivo `.npmrc` en la raíz del worktree con contenido `legacy-peer-deps=true`
- [ ] En `package.json`, agregar dentro de `"dependencies"`: `"@visx/xychart": "^3.12.0"`, `"@visx/responsive": "^3.12.0"`, `"@react-spring/web": "^10"`
- [ ] Ejecutar `npm install` en el worktree y verificar salida sin `ERESOLVE`
- [ ] Confirmar que `@visx/xychart`, `@visx/responsive` y `@react-spring/web@10.x` están en `node_modules`
- [ ] Revisar `package-lock.json` generado: confirmar que `recharts`, `react-markdown`, `framer-motion` mantienen sus versiones anteriores (sin degradaciones)

---

## T2 — Correcciones en `system-status.tsx`

**Specs**: `[[sensor-readings-display]]`, `[[ambient-sensor-row]]`, `[[irrigation-active-detection]]`  
**Requiere**: T1 (para `npm install`) — aunque `system-status.tsx` no usa visx, el ambiente de build debe estar limpio

- **Archivos**: `src/components/dashboard/system-status.tsx`
- **Qué hacer**: Tres correcciones independientes sobre el mismo archivo: (a) extender la query de sensores de riego para incluir `humedad` y mostrar `%` + fecha compacta por sensor; (b) agregar query separada al sensor ambiental (`sensor_onboard`) y renderizar su fila; (c) corregir la detección de riego activo para evaluar todos los sensores, no solo el primero.
- **Criterio de completado**: El tipo `SensorDescubierto` tiene el campo `humedad: number | null`; la función `formatLecturaCompacta` existe; la fila de Sensor Ambiental se renderiza; `setIrrigating` se llama una sola vez tras el loop usando el flag `regandoAlguno`.

### T2-A — Select extendido de humedad + helper de fecha (D1, D2)

- [ ] Localizar el `select` de cada tabla candidata en `system-status.tsx` (actualmente `"timestamp, es_evento_riego"`) y cambiarlo a `"timestamp, humedad, es_evento_riego"`
- [ ] Enriquecer la interfaz/tipo `SensorDescubierto` agregando el campo `humedad: number | null`
- [ ] Agregar función helper `formatLecturaCompacta(date: Date): string` dentro del archivo (antes del componente):
  - Si `date.toDateString() === new Date().toDateString()` → retornar `"hoy " + HH:mm` (locale `es-CL`, hour y minute `2-digit`)
  - En otro caso → retornar `"DD mmm HH:mm"` (locale `es-CL`, day `2-digit`, month `short`, hour y minute `2-digit`)
- [ ] Dentro del `for` que construye `SensorDescubierto`, asignar `humedad: data.humedad ?? null` y `lastReading: formatLecturaCompacta(ultimaLectura)`
- [ ] En el JSX de cada fila de sensor de riego, agregar el campo `% humedad` y la `lastReading` formateada: mostrar `"${s.humedad}% · ${s.lastReading}"` o `"Sin datos"` cuando `s.humedad === null`

### T2-B — Fila de sensor ambiental con query a `sensor_onboard` (D4)

- [ ] Agregar estado: `const [ambiental, setAmbiental] = useState<{ temperatura: number | null; humedad: number | null } | null>(null)`
- [ ] Agregar query a `sensor_onboard` dentro del `useEffect` de descubrimiento (o en uno propio dependiente de `user?.id`):
  ```ts
  createClient()
    .from("sensor_onboard")
    .select("temperatura, humedad, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  ```
- [ ] Si `data` → `setAmbiental({ temperatura: data.temperatura, humedad: data.humedad })`; si error o null → `setAmbiental(null)`
- [ ] En el JSX, agregar una fila entre las filas de sensores de riego y la fila de Riego, etiquetada "Sensor Ambiental":
  - Si `ambiental !== null`: mostrar `"${ambiental.temperatura}°C · ${ambiental.humedad}%"` con íconos `Thermometer` y `Droplet` de `lucide-react`
  - Si `ambiental === null`: mostrar `"Sin datos"` sin valores nulos ni errores visuales
- [ ] Verificar que el orden de filas final coincide con el diagrama del design: Conexión Realtime → Sensores Activos → [Sensor 20cm] → [Sensor 40cm] → [Sensor 60cm] → **Sensor Ambiental** → Riego → Salud General

### T2-C — Detección de riego multi-sensor (D3)

- [ ] Localizar la guarda `if (descubiertos.length === 0)` que protege la llamada a `setIrrigating` (actualmente `system-status.tsx:69-72`)
- [ ] Eliminar esa guarda y declarar un flag local antes del `for`: `let regandoAlguno = false`
- [ ] Dentro del `for`, reemplazar la lógica de `setIrrigating` por: `if (data.es_evento_riego) regandoAlguno = true`
- [ ] Después del `for` (fuera del loop), llamar `setIrrigating(regandoAlguno)` una sola vez (cubre tanto el caso "algún sensor riega" como "ninguno riega" o "sin sensores")
- [ ] Verificar que no queda ningún `setIrrigating` dentro del loop

---

## T3 — Migración de `irrigation-chart.tsx` a `@visx/xychart`

**Specs**: `[[chart-visx-rendering]]`  
**Requiere**: T1 (las deps de visx deben estar instaladas antes de importar)

- **Archivos**: `src/components/dashboard/irrigation-chart.tsx`
- **Qué hacer**: Reescribir el componente reemplazando Recharts por `@visx/xychart`. Conservar la normalización del dataset, el toggle de vistas y los datos de `IrrigationData`. Implementar `ParentSize`, escalas, tema, series filtradas por null, bandas agronómicas vía `DataContext`, tooltip oscuro y leyenda de colores.
- **Criterio de completado**: El componente renderiza sin errores de TypeScript; importa de `@visx/xychart` y `@visx/responsive`; expone vistas Apilado y Sumatoria; el eje Y está fijo 0–100; los colores son exactamente `#0071FF`, `#00E396`, `#FEB019`.

### T3-A — Preparar el tipo de dato del dataset (D5)

- [ ] Actualizar el tipo de punto del dataset de `{ dateLabel: string; sensor20: number | null; sensor40: number | null; sensor60: number | null; average: number | null }` a `ChartPoint` con `date: Date` (renombrar `dateLabel` → `date` y cambiar tipo a `Date`)
- [ ] Actualizar la normalización del dataset (actualmente líneas 34-51 del archivo): cambiar la construcción de `dateLabel` por `date: new Date(rawDate)` para que `xScale: time` lo consuma directamente
- [ ] Definir `const accentColors = ["#0071FF", "#00E396", "#FEB019"] as const`
- [ ] Definir las constantes de las bandas agronómicas:
  ```ts
  const ZONAS_AGRONOMICAS = [
    { y1: 90, y2: 100, color: "#0071FF", label: "Nivel de Lleno" },
    { y1: 70, y2: 90,  color: "#00E396", label: "Punto de Recarga" },
    { y1: 55, y2: 70,  color: "#FEB019", label: "Inicio de Estrés" },
    { y1: 40, y2: 55,  color: "#fe2819", label: "Peligro Estrés Extremo" },
  ] as const
  ```

### T3-B — Eliminar imports de Recharts y añadir imports de visx

- [ ] Eliminar todos los imports de `recharts` del archivo
- [ ] Agregar imports de `@visx/xychart`:
  - `XYChart`, `AnimatedLineSeries`, `AnimatedAxis`, `AnimatedGrid`, `Tooltip`, `buildChartTheme`, `DataContext` (desde `@visx/xychart`)
- [ ] Agregar import de `ParentSize` desde `@visx/responsive`

### T3-C — Construir tema y estructura base del XYChart

- [ ] Crear el tema con `buildChartTheme`:
  ```ts
  const chartTheme = buildChartTheme({
    colors: ["#0071FF", "#00E396", "#FEB019"],
    backgroundColor: "transparent",
    gridColor: "#55555533",
    tickLength: 4,
  })
  ```
- [ ] Envolver el gráfico en `<ParentSize>` para obtener `width` y `height` del contenedor flex
- [ ] Configurar `<XYChart width={width} height={height} theme={chartTheme}`:
  - `xScale={{ type: "time" }}`
  - `yScale={{ type: "linear", domain: [0, 100], zero: true }}`
- [ ] Agregar `<AnimatedGrid columns={false} numTicks={4} />`
- [ ] Agregar `<AnimatedAxis orientation="bottom" />` con `tickFormat` que devuelve `"DD mmm"` (locale `es-CL`, `day: "2-digit"`, `month: "short"`)
- [ ] Agregar `<AnimatedAxis orientation="left" numTicks={5} />`

### T3-D — Vista Apilado (tres `AnimatedLineSeries`)

- [ ] Para la vista `viewMode === "stacked"`, definir los tres datasets filtrados por null:
  ```ts
  const s20 = chartData.filter(d => d.sensor20 != null)
  const s40 = chartData.filter(d => d.sensor40 != null)
  const s60 = chartData.filter(d => d.sensor60 != null)
  ```
- [ ] Renderizar tres `<AnimatedLineSeries>`:
  - `dataKey="sensor20"` con `data={s20}`, `xAccessor={d => d.date}`, `yAccessor={d => d.sensor20!}`, `stroke="#0071FF"`
  - `dataKey="sensor40"` con `data={s40}`, `xAccessor={d => d.date}`, `yAccessor={d => d.sensor40!}`, `stroke="#00E396"`
  - `dataKey="sensor60"` con `data={s60}`, `xAccessor={d => d.date}`, `yAccessor={d => d.sensor60!}`, `stroke="#FEB019"`
- [ ] Agregar fila de chips de leyenda encima del gráfico (3 círculos de color + etiqueta "20cm"/"40cm"/"60cm")

### T3-E — Vista Sumatoria (una `AnimatedLineSeries` + bandas agronómicas)

- [ ] Para la vista `viewMode === "sum"`, definir el dataset de promedio filtrado: `const sAvg = chartData.filter(d => d.average != null)`
- [ ] Crear componente interno `BandasAgronomicas` que accede al `DataContext` de `@visx/xychart` para obtener `yScale` y `xScale`:
  - Usa `React.useContext(DataContext)` para leer `yScale`, `xScale`, y el `innerWidth`/`innerHeight` del chart
  - Por cada zona en `ZONAS_AGRONOMICAS`, dibuja un `<rect>` con `y = yScale(zona.y2)`, `height = yScale(zona.y1) - yScale(zona.y2)`, `width = innerWidth`, `fill = zona.color`, `fillOpacity = 0.12`
  - Encima de cada `<rect>`, agrega un `<text>` con la etiqueta de la zona (`zona.label`), alineado a la derecha (`textAnchor="end"`, `x = innerWidth - 4`), con `fill="#c9c9c9"` y `fontSize={10}`
  - Las bandas se renderizan **antes** que la serie (z-order de fondo)
- [ ] Renderizar `<BandasAgronomicas />` dentro del `XYChart` antes de las series
- [ ] Renderizar una sola `<AnimatedLineSeries dataKey="average" data={sAvg} xAccessor={d => d.date} yAccessor={d => d.average!} stroke="#0071FF" />`

### T3-F — Tooltip oscuro

- [ ] Agregar `<Tooltip>` de `@visx/xychart` con:
  - `snapTooltipToDatumX={true}`
  - `showVerticalCrosshair={true}`
  - `showSeriesGlyphs={true}`
  - `renderTooltip={({ tooltipData }) => ...}` que devuelve un `<div>` con `style={{ background: "#2a2a2a", color: "#c9c9c9", border: "1px solid #272832", padding: "8px 12px", borderRadius: 6 }}` mostrando la fecha y los valores de cada serie activa

### T3-G — Verificación de tipos y cleanup

- [ ] Ejecutar `npx tsc --noEmit` y corregir todos los errores de tipo que resulten de la migración (especialmente los accessors de `ChartPoint`)
- [ ] Confirmar que el archivo no tiene ningún import de `recharts`

---

## T4 — Rediseño de `soil-chat.tsx` como card asistente

**Specs**: `[[assistant-card-ui]]`  
**Requiere**: ninguna dependencia de T1/T2/T3 (componentes UI ya instalados en `src/components/ui/`)

- **Archivos**: `src/components/dashboard/soil-chat.tsx`
- **Qué hacer**: Modificar solo la capa de presentación. Conservar intactos: `handleSend`, `sessionId`, fetch a `/api/chat`, el array `messages`, el scroll y el render markdown. Cambios: agregar acceso a `useAuth()`, helper de saludo, estado vacío con ícono + saludo + badges, reemplazar `<Input>` por `<Textarea>` con barra inferior, eliminar el mensaje de bienvenida hardcoded.
- **Criterio de completado**: El componente renderiza estado vacío con ícono `Bot`, saludo personalizado y 4 badges; click en badge llama `setInput(texto)` sin enviar; el `<Input>` está reemplazado por `<Textarea>`; no existen selector de modelo, botón de adjuntar ni control de audio; el fetch a `/api/chat` funciona igual que antes.

### T4-A — Acceso al usuario y helper de saludo

- [ ] Importar `useAuth` desde el módulo de autenticación existente del proyecto (verificar el path de importación en otros componentes del dashboard)
- [ ] Agregar en el cuerpo del componente: `const { user } = useAuth()`
- [ ] Definir el helper de saludo:
  ```ts
  const nombre =
    (user?.user_metadata?.full_name as string | undefined)?.trim() || 
    user?.email?.split("@")[0] || 
    null
  const saludo = nombre ? `¡Hola, ${nombre}!` : "¡Hola!"
  ```
- [ ] Definir la constante de sugerencias:
  ```ts
  const SUGERENCIAS = [
    "¿Cuándo debo regar?",
    "¿Cómo está la humedad del suelo?",
    "¿Qué fertilizante necesito?",
    "¿Hay riesgo de estrés hídrico?",
  ] as const
  ```

### T4-B — Estado vacío (cuando `messages.length === 0`)

- [ ] Localizar el JSX del render actual del componente e identificar el bloque de la bienvenida hardcoded (actualmente `soil-chat.tsx:101-111` aprox.)
- [ ] Eliminar el mensaje de bienvenida hardcoded
- [ ] Crear el bloque de estado vacío que se renderiza cuando `messages.length === 0`:
  - Contenedor centrado (`flex flex-col items-center gap-4`)
  - Avatar/ícono: elemento `<div>` con clase `bg-primary/20 rounded-full p-4` conteniendo el ícono `<Bot>` de `lucide-react` en tamaño grande (ej. `size={40}`)
  - Título: `<p>` o `<h2>` con el valor de `saludo` (fuente `text-xl font-semibold`)
  - Subtítulo: `<p className="text-muted-foreground text-sm text-center">Soy tu asistente agrícola. Pregúntame sobre riego, suelo o fertilización.</p>`
  - Fila de badges: `<div className="flex flex-wrap gap-2 justify-center">` con un `<Badge>` (shadcn `variant="secondary"`) por cada elemento de `SUGERENCIAS`, con `onClick={() => setInput(s)}` — no auto-envía, solo pone el texto en el textarea

### T4-C — Reemplazar `<Input>` por `<Textarea>` con barra inferior

- [ ] Localizar el `<Input>` de escritura de mensajes en el JSX (actualmente `soil-chat.tsx:205` aprox.)
- [ ] Reemplazarlo por `<Textarea>` de shadcn (`import { Textarea } from "@/components/ui/textarea"`):
  - `rows={1}`
  - `className="resize-none max-h-[96px] overflow-auto"` (auto-resize limitado a ~4 líneas)
  - Mismo `value`, `onChange`, `placeholder` y `disabled` que el `<Input>` anterior
  - `onKeyDown` con Enter=`handleSend` / Shift+Enter=nueva línea (conservar el `handleKeyDown` existente o adaptar)
- [ ] Crear la barra de acciones inferior como un `<div className="flex justify-end pt-1">` que contiene únicamente el botón `<Button onClick={handleSend} disabled={...}><Send size={16} /></Button>`
- [ ] Confirmar que no hay otros botones en esa área (sin modelo, sin adjuntar, sin audio)

### T4-D — Verificación de comportamiento preservado

- [ ] Confirmar que `handleSend`, `sessionId`, el fetch `POST /api/chat` y el estado `messages` están intactos (no modificados)
- [ ] Confirmar que el render de mensajes con markdown (`react-markdown`) funciona igual
- [ ] Ejecutar `npx tsc --noEmit` y corregir errores de tipo en el archivo

---

## T5 — Reorganización del bento en `dashboard-grid.tsx`

**Specs**: `[[dashboard-bento-grid]]`  
**Requiere**: T2 (system-status puede tener mayor altura por fila ambiental), T3 (irrigation-chart ya es visx), T4 (soil-chat ya es card asistente) — ejecutar T5 después de T2+T3+T4 para tener la imagen completa del contenido de cada celda

- **Archivos**: `src/components/dashboard/dashboard-grid.tsx`
- **Qué hacer**: Refinar los tamaños de celda del bento existente (grid de 6 columnas con container queries). Fila 1: Weather (2 cols) + PlantTimeline (2 cols) + SystemStatus (2 cols), `min-h-[220px]`. Fila 2: IrrigationChart (4 cols) + SoilChat (2 cols), `h-[480px]`. Verificar que no hay huecos en los breakpoints `@xl`/`@5xl`. NO integrar FertilizerChart (deuda técnica, decisión D8/proposal).
- **Criterio de completado**: El grid llena exactamente 6 columnas en `@5xl` (2+2+2 y 4+2); en `@xl` (2 cols) IrrigationChart ocupa `col-span-2`; en `<@xl` todo apila a 1 columna; no hay solapamientos ni huecos; el componente SystemStatus absorbe la fila ambiental sin desbordar.

- [ ] Leer el JSX actual de `dashboard-grid.tsx` para identificar las clases de grid y los `col-span` de cada card
- [ ] Fila 1 — verificar y ajustar si es necesario:
  - Weather: `@5xl:col-span-2`, `min-h-[220px]`
  - PlantTimeline: `@5xl:col-span-2`, `min-h-[220px]`
  - SystemStatus: `@5xl:col-span-2`, `min-h-[220px]` (usar `min-h` no `h` para que crezca con la fila ambiental)
- [ ] Fila 2 — verificar y ajustar si es necesario:
  - IrrigationChart: `@5xl:col-span-4 @xl:col-span-2`, `h-[480px]`
  - SoilChat: `@5xl:col-span-2 @xl:col-span-2`, `h-[480px]`
- [ ] Verificar que el grid raíz tiene clase `grid grid-cols-1 @xl:grid-cols-2 @5xl:grid-cols-6 gap-4`
- [ ] Confirmar que `FertilizerChart` NO está importado ni montado en el JSX (ya era huérfano — no agregar)
- [ ] Confirmar que `SoilRecommendations` permanece fuera del grid (sin cambios)

---

## T6 — Verificación de build y lint

**Specs**: `[[chart-visx-rendering]]` (AC: build de producción sin errores)  
**Requiere**: T1 + T2 + T3 + T4 + T5 (todos los cambios previos deben estar aplicados)

- **Archivos**: raíz del worktree (comandos npm)
- **Qué hacer**: Ejecutar la cadena de verificación que confirma que los 5 archivos modificados compilan y pasan lint sin errores nuevos.
- **Criterio de completado**: `npx tsc --noEmit` sin errores; `npm run lint` sin errores nuevos (advertencias pre-existentes son aceptables); `npm run build` completa sin errores.

- [ ] Ejecutar `npx tsc --noEmit` desde el worktree y corregir cualquier error de tipo residual
- [ ] Ejecutar `npm run lint` (ESLint) y corregir errores nuevos introducidos por el cambio; documentar las advertencias pre-existentes que no son del scope
- [ ] Ejecutar `npm run build` (Next.js build de producción)
- [ ] Si el build falla con error de peer deps: verificar que `.npmrc` está correctamente leído (debe estar en la raíz del repositorio donde corre npm)
- [ ] Si el build falla por imports de `@visx/*`: verificar que `node_modules/@visx/xychart` existe (T1 completado)
- [ ] Confirmar salida final `✓ Compiled successfully` (o equivalente de Next.js 16)

---

## Notas de implementación

### Exclusiones de scope (no tocar)

- `src/hooks/use-irrigation-data.ts` — realtime ya correcto, sin cambios
- `src/types/index.ts` — `SensorRiego.humedad` y `SensorOnboard` ya existen; no agregar tipos nuevos aquí
- `src/components/ui/chart.tsx` — wrapper Recharts usado por FertilizerChart huérfano; dejarlo intacto
- `src/components/dashboard/fertilizer-chart.tsx` — deuda técnica (DT-2/DT-3); excluido del scope
- `src/components/dashboard/soil-recommendations.tsx` — placeholder; sin cambios
- `src/app/api/chat/**` — backend n8n; sin cambios

### Discrepancia spec ↔ proposal (FertilizerChart)

El AC de `[[dashboard-bento-grid]]` dice "FertilizerChart permanece en el layout". La proposal aprobada (fuente de verdad de scope) lo excluye explícitamente como deuda técnica. `FertilizerChart` NO está montado en `DashboardGrid` hoy y permanecerá sin montar. `sdd-verify` debe interpretar ese AC como "la reorganización no rompe FertilizerChart si llegara a montarse", no como "debe montarse ahora". Ver design.md D8 para justificación completa.

### Estrategia para bandas agronómicas (riesgo D5)

Si el acceso a `DataContext` de `@visx/xychart` resulta inestable o genera errores de runtime, la alternativa aceptable es un `<svg>` superpuesto con `position: absolute` sincronizado por las dimensiones de `ParentSize`. Registrar el método usado como comentario en el código para que `sdd-verify` lo pueda evaluar.
