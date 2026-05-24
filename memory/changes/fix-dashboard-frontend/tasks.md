# Tasks: fix-dashboard-frontend

## Orden de ejecución

Las tareas se ordenan de menor a mayor riesgo y de menor a mayor dependencia:

1. **Tarea 1** (Bug1 — escala eje Y): edición de 1 línea en `irrigation-chart.tsx`, sin dependencias.
2. **Tarea 2** (Bug2 — gaps/connectNulls): edición mínima en `irrigation-chart.tsx` + verificación de `use-irrigation-data.ts`; puede hacerse en el mismo paso que la Tarea 1 por ser el mismo archivo.
3. **Tarea 3** (Bug3 — realtime tri-valor) + **Tarea 4** (Bug5 — salud general): reescritura parcial de `system-status.tsx`; ambas afectan el mismo archivo y la Tarea 4 depende del tipo `ConnectionState` introducido en la Tarea 3. Hacer en un solo pase.
4. **Tarea 5** (hook notificaciones): nuevo archivo `use-notifications.ts`; independiente de las anteriores pero prerrequisito de la Tarea 6.
5. **Tarea 6** (popover notificaciones): nuevo archivo `notifications-popover.tsx`; requiere Tarea 5.
6. **Tarea 7** (integración header): modificación de `dashboard-grid.tsx`; requiere Tarea 6.
7. **Tarea 8** (validación estática): `tsc --noEmit` y build; requiere todas las anteriores.

Dependencias explícitas:
- Tarea 2 → debe realizarse junto o después de la Tarea 1 (mismo archivo)
- Tarea 4 → requiere Tarea 3 (mismo archivo; usa `connectionState`)
- Tarea 6 → requiere Tarea 5 (importa `useNotifications`)
- Tarea 7 → requiere Tarea 6 (importa `NotificationsPopover`)
- Tarea 8 → requiere Tareas 1–7

---

## Spec: irrigation-chart-y-scale

### Tarea 1: Fijar dominio del eje Y a [0, 100] en ambas vistas

- **Archivo**: `src/components/dashboard/irrigation-chart.tsx`
- **Qué hacer**: Localizar el componente `<YAxis>` (aproximadamente línea 95). Cambiar el prop `domain` de `{ viewMode === "sum" ? [40, 100] : ["auto", "auto"] }` a `{[0, 100]}` para que aplique independientemente del `viewMode`. Conservar sin cambios los cuatro `<ReferenceArea>` (franjas 40–100), el label dinámico del eje Y y todos los demás props del `<YAxis>`.
- **Criterio de completado**: El componente `<YAxis>` tiene `domain={[0, 100]}` sin condicional. Ningún otro bloque del componente fue modificado.

- [ ] Abrir `src/components/dashboard/irrigation-chart.tsx`
- [ ] Localizar el prop `domain` del `<YAxis>` (buscar "domain")
- [ ] Reemplazar la expresión condicional de `domain` por el literal `{[0, 100]}`
- [ ] Verificar que los cuatro `<ReferenceArea>` (franjas de humedad 40–100) permanecen intactos
- [ ] Verificar que el `label` del `<YAxis>` y todos los demás props no fueron alterados

---

## Spec: irrigation-chart-sensor-gaps

### Tarea 2: Añadir connectNulls={false} explícito a las líneas del gráfico y verificar que chartData no coacciona null a 0

- **Archivos**: `src/components/dashboard/irrigation-chart.tsx` (edición), `src/hooks/use-irrigation-data.ts` (solo verificación, sin cambio esperado)
- **Qué hacer**:
  1. En `irrigation-chart.tsx`: añadir `connectNulls={false}` a cada uno de los cuatro `<Line>` (sensor20, sensor40, sensor60 y average/promedio). Esto hace explícita la intención de interrumpir la línea en huecos `null`.
  2. En `use-irrigation-data.ts`: verificar que el mapeo `chartData` (líneas ~34–51 del hook, o el bloque equivalente en el chart) asigna los valores de sensor como `s1`, `s2`, `s3` sin conversión de `null` a `0`. Si se detecta una coacción (`?? 0`, `|| 0`, o equivalente), corregirla para preservar `null`. Si no existe coacción, NO modificar el archivo.
- **Criterio de completado**: Los cuatro `<Line>` tienen `connectNulls={false}`. El mapeo de `chartData` preserva `null` en huecos (sin coacción a `0`). `use-irrigation-data.ts` no fue modificado a menos que hubiera una coacción explícita a `0`.

- [ ] En `irrigation-chart.tsx`, localizar los cuatro `<Line>` (sensor20, sensor40, sensor60, average)
- [ ] Añadir `connectNulls={false}` a cada `<Line>` como prop explícito
- [ ] Abrir `src/hooks/use-irrigation-data.ts` y localizar el bloque de alineamiento de sensores (líneas ~64–76)
- [ ] Confirmar que los valores se asignan como `r20?.humedad ?? null` (u equivalente que preserve `null`)
- [ ] Si existe `?? 0` o `|| 0` para el campo humedad, reemplazarlo por `?? null`; si no existe coacción, no modificar el archivo

---

## Spec: realtime-connection-state

### Tarea 3: Reescribir la lógica de estado de conexión realtime en system-status.tsx (tri-valor)

- **Archivo**: `src/components/dashboard/system-status.tsx`
- **Qué hacer**: Reemplazar el estado binario `realtimeConnected: boolean` por un estado tri-valor `connectionState: "connecting" | "connected" | "disconnected"` con valor inicial `"connecting"`. Reestructurar el `useEffect` de suscripción Realtime para:
  1. Obtener `user` de `useAuth()` (ya disponible en el componente o importable desde `auth-context`).
  2. Crear **una única** instancia de `createClient()` dentro del efecto.
  3. Crear un canal con `.on("postgres_changes", { event: "INSERT", schema: "public", table: "sensor_riego_20", filter: `user_id=eq.${user.id}` }, () => {})` (callback puede ser no-op).
  4. Llamar `.subscribe((status) => { ... })` mapeando: `SUBSCRIBED` → `setConnectionState("connected")`; `TIMED_OUT` | `CHANNEL_ERROR` | `CLOSED` → `setConnectionState("disconnected")`; cualquier otro estado → `setConnectionState("connecting")`.
  5. En el cleanup del `useEffect`, llamar `supabase.removeChannel(channel)` usando la misma instancia de `supabase` (no crear una segunda instancia).
  6. El `useEffect` debe tener `user?.id` en su array de dependencias. Si `user` no está disponible, no crear el canal (early return).
  7. Eliminar cualquier instancia duplicada de `createClient()` relacionada con el canal de estado.
  8. Actualizar el indicador visual "Conexión Realtime" en el JSX: mostrar tres estados con texto y color diferente:
     - `"connected"` → texto "Conectado", color verde (clases existentes de verde/success)
     - `"connecting"` → texto "Conectando…", color amarillo (clases de warning/amarillo o `text-yellow-500`)
     - `"disconnected"` → texto "Desconectado", color rojo (clases de destructive/rojo)
- **Criterio de completado**: El estado `connectionState` es de tipo `"connecting" | "connected" | "disconnected"`. El canal tiene un oyente `.on("postgres_changes", ...)` real. Solo existe una instancia de `createClient()` en el efecto. El cleanup llama `removeChannel` sobre la misma instancia. El indicador de conexión muestra 3 variantes visuales correctas. No hay referencias a `realtimeConnected` boolean.

- [ ] En `system-status.tsx`, localizar la declaración del estado `realtimeConnected` (buscar "realtimeConnected")
- [ ] Definir el tipo local `type ConnectionState = "connecting" | "connected" | "disconnected"` antes del componente
- [ ] Reemplazar `useState<boolean>(false)` o equivalente por `useState<ConnectionState>("connecting")`
- [ ] Localizar el `useEffect` que gestiona la suscripción Realtime
- [ ] Verificar que `useAuth()` está importado y disponible; añadir desestructuración de `user` si no existe
- [ ] Dentro del efecto, añadir guard: si `!user?.id` hacer early return
- [ ] Declarar `const supabase = createClient()` una única vez al inicio del efecto
- [ ] Crear el canal con `.channel("realtime-status")` (o nombre descriptivo) + `.on("postgres_changes", { event: "INSERT", schema: "public", table: "sensor_riego_20", filter: `user_id=eq.${user.id}` }, () => {})`
- [ ] Llamar `.subscribe((status) => { if (status === "SUBSCRIBED") setConnectionState("connected"); else if (["TIMED_OUT","CHANNEL_ERROR","CLOSED"].includes(status)) setConnectionState("disconnected"); else setConnectionState("connecting"); })`
- [ ] En el return del efecto (cleanup), llamar `supabase.removeChannel(channel)` usando la misma instancia
- [ ] Actualizar `useEffect` dependencies a `[user?.id]`
- [ ] Eliminar cualquier segunda instancia de `createClient()` que era usada solo para `removeChannel`
- [ ] En el JSX, localizar el bloque del indicador "Conexión Realtime" (buscar "realtimeConnected" o "Realtime")
- [ ] Reemplazar la lógica binaria por un switch/condicional ternario sobre `connectionState`
- [ ] Asignar texto "Conectado" / "Conectando…" / "Desconectado" según cada estado
- [ ] Asignar clases de color verde / amarillo / rojo respectivamente (reusar clases ya usadas en el archivo para colores online/offline/warning)

---

## Spec: system-health-overall

### Tarea 4: Actualizar la derivación de salud general para usar connectionState (3 valores)

> Requiere: Tarea 3 (mismo archivo, usar en el mismo pase de edición)

- **Archivo**: `src/components/dashboard/system-status.tsx`
- **Qué hacer**: Localizar el bloque que calcula la "salud general" del sistema (aproximadamente líneas 189–197, buscar "Optimo", "Óptimo", "Parcial"). Reemplazar la condición binaria que referenciaba `realtimeConnected` por la nueva lógica tri-valor usando `connectionState`:
  - `"Óptimo"` si `todosOnline && connectionState === "connected"`
  - `"Sin datos"` si `totalDescubiertos === 0 && connectionState === "disconnected"`
  - `"Parcial"` en cualquier otro caso (incluye `connectionState === "connecting"`, sensores parcialmente online, o falla de uno de los componentes)
  Actualizar el badge/ícono asociado: "Sin datos" debe mostrar el ícono `Activity` en rojo y badge en estilo destructive (o equivalente rojo).
- **Criterio de completado**: La variable de salud puede tomar los valores "Óptimo", "Parcial" y "Sin datos". La condición de "Óptimo" requiere `connectionState === "connected"` (no solo sensores online). El estado "Sin datos" se activa con `totalDescubiertos === 0 && connectionState === "disconnected"`. El badge/ícono de "Sin datos" tiene estilo rojo/destructive. No quedan referencias a `realtimeConnected` boolean en el cálculo de salud.

- [ ] En `system-status.tsx`, localizar el bloque de cálculo de salud general (buscar "Óptimo" o "Optimo")
- [ ] Definir o localizar las variables `todosOnline` y `totalDescubiertos` que ya debe usar el componente
- [ ] Reemplazar la condición de salud: `todosOnline && connectionState === "connected"` → `"Óptimo"`
- [ ] Añadir condición: `totalDescubiertos === 0 && connectionState === "disconnected"` → `"Sin datos"`
- [ ] Asegurar que el caso por defecto es `"Parcial"` (cubre connecting, sensores parciales, etc.)
- [ ] En el JSX del badge/estado de salud, añadir rama para `"Sin datos"` con ícono `Activity` y estilo destructive/rojo
- [ ] Confirmar que no quedan referencias a `realtimeConnected` en todo el archivo (buscar "realtimeConnected")

---

## Spec: notifications-display-and-read

### Tarea 5: Crear el hook use-notifications.ts

- **Archivo**: `src/hooks/use-notifications.ts` (nuevo archivo)
- **Qué hacer**: Crear el hook `useNotifications()` con la siguiente API:
  - `notifications: Notification[]` — lista en orden `created_at` DESC
  - `unreadCount: number` — derivado de `notifications.filter(n => n.read !== true).length` (tratar `null` y `false` como no leída; solo `=== true` es leída)
  - `isLoading: boolean` — `true` durante el fetch inicial
  - `markAsRead: (id: number) => Promise<void>` — actualización optimista: primero actualiza el estado local marcando `read: true`, luego llama `supabase.from("notifications").update({ read: true }).eq("id", id)`; si el UPDATE falla, revertir la fila al estado previo
  
  El hook debe:
  1. Usar `"use client"` al inicio del archivo.
  2. Importar `Notification` desde `@/types`.
  3. Importar `createClient` desde `@/lib/supabase/client`.
  4. Importar `useAuth` desde el contexto de autenticación (`@/context/auth-context` o la ruta que corresponda).
  5. En un `useEffect`, llamar `supabase.from("notifications").select("*").order("created_at", { ascending: false })` y almacenar el resultado en `notifications`; manejar errores (loguear o silenciar); setear `isLoading` a `false` al finalizar.
  6. En el mismo o segundo `useEffect`, suscribirse a `postgres_changes` (INSERT y UPDATE) sobre la tabla `notifications` filtrada por `user_id=eq.${user.id}`; al recibir un evento INSERT agregar la nueva notificación al inicio de la lista; al recibir UPDATE actualizar la fila correspondiente. El `useEffect` de suscripción depende de `user?.id`. Cleanup con `supabase.removeChannel(channel)`.
  7. `markAsRead(id)`: guardar la lista actual como respaldo, aplicar `setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))`, llamar el UPDATE; si falla, restaurar con `setNotifications(respaldo)`.
- **Criterio de completado**: El archivo existe en `src/hooks/use-notifications.ts`. Exporta `useNotifications` y la interfaz `UseNotifications`. TypeScript no reporta errores en el archivo. `unreadCount` se deriva computado (no tiene `useState` propio). `markAsRead` hace rollback ante error. El hook tiene `"use client"` al inicio.

- [ ] Crear el archivo `src/hooks/use-notifications.ts`
- [ ] Agregar directiva `"use client"` como primera línea
- [ ] Importar `useState`, `useEffect` desde `react`
- [ ] Importar el tipo `Notification` desde `@/types`
- [ ] Importar `createClient` desde `@/lib/supabase/client`
- [ ] Importar `useAuth` desde la ruta correcta del contexto de autenticación (verificar la ruta exacta en el worktree, buscar `auth-context`)
- [ ] Definir y exportar la interfaz `UseNotifications` con los cuatro campos (`notifications`, `unreadCount`, `isLoading`, `markAsRead`)
- [ ] Implementar el estado `notifications: Notification[]` (inicial `[]`) y `isLoading: boolean` (inicial `true`)
- [ ] Implementar `unreadCount` como valor derivado (no useState): `notifications.filter(n => n.read !== true).length`
- [ ] Implementar el `useEffect` de fetch inicial: `select("*").order("created_at",{ascending:false})`, manejar error, setear `isLoading(false)` en el `finally`
- [ ] Implementar el `useEffect` de suscripción Realtime: guard si `!user?.id`, crear canal con `.on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, handler)`, `.subscribe()`, cleanup con `removeChannel`; el handler debe insertar o actualizar en el estado local según el evento
- [ ] Implementar `markAsRead(id)`: guardar snapshot → actualizar optimistamente → `await supabase.from("notifications").update({ read: true }).eq("id", id)` → si error, restaurar snapshot y re-lanzar o loguear
- [ ] Exportar la función `useNotifications` al final del archivo

### Tarea 6: Crear el componente notifications-popover.tsx

> Requiere: Tarea 5

- **Archivo**: `src/components/dashboard/notifications-popover.tsx` (nuevo archivo)
- **Qué hacer**: Crear el componente `NotificationsPopover()` sin props que consume `useNotifications()`. Estructura:
  - `Popover` (root) con `PopoverTrigger` y `PopoverContent` (importados de `@/components/ui/popover` — Base UI).
  - `PopoverTrigger`: un `Button variant="ghost" size="sm"` (importar de `@/components/ui/button`) conteniendo `<Bell size={15} />` (lucide-react). Si `unreadCount > 0`, superponer un `Badge variant="destructive"` (importar de `@/components/ui/badge`) posicionado absoluto sobre la esquina superior derecha del botón; el texto es el número si `<= 9`, o `"9+"` si `> 9`; si `unreadCount === 0`, no renderizar el badge. El `Button` debe tener `aria-label="Notificaciones"` y, cuando hay no leídas, también `aria-label={`Notificaciones, ${unreadCount} sin leer`}`.
  - El `PopoverTrigger` o su contenedor debe tener `position: relative` (clase `relative`) para que el badge absoluto se posicione respecto al botón.
  - `PopoverContent` con `align="end"`:
    - Título/encabezado "Notificaciones" (puede usar `PopoverHeader`/`PopoverTitle` si el componente los exporta, o un `<p>` con `font-semibold`).
    - Si `isLoading`: renderizar 2–3 `<Skeleton>` (importar de `@/components/ui/skeleton`).
    - Si `!isLoading && notifications.length === 0`: texto centrado "Sin notificaciones" en color muted.
    - Si `!isLoading && notifications.length > 0`: `ScrollArea` (importar de `@/components/ui/scroll-area`) con `className="max-h-[320px]"`, conteniendo la lista de notificaciones.
  - Cada item de la lista:
    - Contenedor con separación visual (border-bottom o divider entre items).
    - `<p className="font-medium text-sm">` para `notification.title`.
    - `<p className="text-xs text-muted-foreground">` para `notification.message`.
    - Fecha corta de `notification.created_at` (usar `new Date(created_at).toLocaleDateString("es-CL", { day:"numeric", month:"short" })` o similar).
    - Si `notification.read !== true`: botón ghost pequeño con `<Check size={12} />` (lucide) + texto "Leída" que invoca `markAsRead(notification.id)`.
    - Si `notification.read === true`: aplicar opacidad reducida al item completo (clase `opacity-60` o similar).
- **Criterio de completado**: El archivo existe en `src/components/dashboard/notifications-popover.tsx`. Exporta `NotificationsPopover`. El badge solo aparece cuando `unreadCount > 0`. El estado `isLoading` muestra skeletons. La lista vacía muestra el mensaje. Los items leídos están atenuados. TypeScript no reporta errores.

- [ ] Crear el archivo `src/components/dashboard/notifications-popover.tsx`
- [ ] Agregar directiva `"use client"` como primera línea
- [ ] Importar `useNotifications` desde `@/hooks/use-notifications`
- [ ] Importar `Popover`, `PopoverTrigger`, `PopoverContent` (y `PopoverHeader`/`PopoverTitle` si existen) desde `@/components/ui/popover`; verificar las exportaciones exactas del archivo
- [ ] Importar `Button` desde `@/components/ui/button`
- [ ] Importar `Badge` desde `@/components/ui/badge`
- [ ] Importar `ScrollArea` desde `@/components/ui/scroll-area`
- [ ] Importar `Skeleton` desde `@/components/ui/skeleton`
- [ ] Importar `Bell`, `Check` desde `lucide-react`
- [ ] Implementar la función `NotificationsPopover()`: desestructurar `{ notifications, unreadCount, isLoading, markAsRead }` de `useNotifications()`
- [ ] Renderizar `<Popover>` raíz
- [ ] Dentro del trigger (`PopoverTrigger`): envolver en un `<div className="relative">` (o usar `className="relative"` en el trigger) para posicionamiento del badge; renderizar el `Button ghost size="sm"` con `Bell` y el `aria-label` correcto
- [ ] Renderizar el `Badge` condicionalmente solo si `unreadCount > 0`, con posicionamiento absoluto y valor `unreadCount > 9 ? "9+" : String(unreadCount)`
- [ ] Renderizar `PopoverContent align="end"` con el título "Notificaciones"
- [ ] Implementar la rama `isLoading`: 3 `<Skeleton className="h-12 w-full mb-2" />` o similar
- [ ] Implementar la rama `notifications.length === 0` (sin loading): párrafo centrado "Sin notificaciones"
- [ ] Implementar la rama con notificaciones: `ScrollArea` con `max-h-[320px]`, lista de items
- [ ] Para cada item: renderizar título, mensaje, fecha, botón "marcar como leída" si no leída, opacidad reducida si leída
- [ ] Exportar `NotificationsPopover` (named export)

### Tarea 7: Integrar NotificationsPopover en el header de dashboard-grid.tsx

> Requiere: Tarea 6

- **Archivo**: `src/components/dashboard/dashboard-grid.tsx`
- **Qué hacer**: En la zona de acciones del header (aproximadamente líneas 52–64), dentro del `<div className="flex items-center gap-3">` (o equivalente), insertar `<NotificationsPopover />` entre el elemento que muestra `{user?.email}` y el botón de LogOut. Añadir el import de `NotificationsPopover` al inicio del archivo.
- **Criterio de completado**: El archivo importa `NotificationsPopover` desde `@/components/dashboard/notifications-popover`. El componente se renderiza en el orden: email · campana · botón LogOut. El resto del layout no fue modificado.

- [ ] Abrir `src/components/dashboard/dashboard-grid.tsx`
- [ ] Localizar la zona del header con `user?.email` y el botón LogOut (buscar "email" o "LogOut" o "logout")
- [ ] Añadir import de `NotificationsPopover` desde `"@/components/dashboard/notifications-popover"` al bloque de imports del archivo
- [ ] Insertar `<NotificationsPopover />` en el JSX entre `{user?.email}` (o el span/elemento que lo contiene) y el botón LogOut
- [ ] Verificar que el `div` contenedor tiene clases flex/gap que acomodan el nuevo elemento sin ajuste adicional
- [ ] Confirmar que el resto del componente no fue modificado

---

## Validación

### Tarea 8: Validación estática con tsc --noEmit

> Requiere: Tareas 1–7

- **Archivos**: todos los modificados/creados en Tareas 1–7
- **Qué hacer**: Ejecutar `tsc --noEmit` en la raíz del worktree para verificar que no hay errores de tipos en los archivos modificados ni en los archivos que los importan. Si hay errores, corregirlos antes de considerar el ciclo completo.
- **Criterio de completado**: `tsc --noEmit` termina sin errores de tipo (warnings son aceptables si preexistían). El build de Next.js (`next build` o equivalente) no falla por los archivos modificados.

- [ ] Desde la raíz del worktree (`src/` del proyecto), ejecutar `tsc --noEmit`
- [ ] Revisar la salida; si hay errores de tipo en los archivos creados/modificados, corregirlos
- [ ] Si los errores son en archivos preexistentes no tocados, documentarlos como deuda pero no bloquear el cambio
- [ ] Confirmar que las importaciones de `@/types` para `Notification`, de `@/components/ui/*` y de `@/lib/supabase/client` resuelven sin error
- [ ] (Opcional) Ejecutar `next build` para confirmar que el build completo no falla
