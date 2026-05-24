---
type: tasks
change_name: "fix-notifications-scroll-native"
created: "2026-05-24"
---

# Tasks — fix-notifications-scroll-native

Follow-up del PR #6. El fix anterior (commit a6b6801) quitó el overflow pero NO scrollea. 1 archivo.

## T1 — Reemplazar el wrapper+ScrollArea por scroll nativo

**File**: `src/components/dashboard/notifications-popover.tsx`
**Líneas/ocurrencias**: el bloque de la rama "else" del ternario que hoy es:
```
<div className="max-h-[320px] overflow-hidden">
  <ScrollArea className="h-full">
    <div className="divide-y divide-border">
      {notifications.map(...)}
    </div>
  </ScrollArea>
</div>
```
**Causa raíz (verificada)**: `ScrollArea` (Base UI) con `h-full` (height:100%) no resuelve contra un padre que solo tiene `max-height` (height:auto) — por spec CSS el porcentaje colapsa a `auto` = altura del contenido. Entonces el Viewport de Base UI queda tan alto como el contenido, NO hay overflow interno que scrollear, y el `overflow-hidden` del wrapper solo recorta (por eso desapareció el overflow visual pero no hay scroll).
**Acción**: reemplazar ese bloque por un contenedor de scroll NATIVO que tenga `max-height` y `overflow-y-auto` en el MISMO elemento (así sí se crea un scroll container real):
```
<div className="max-h-[320px] overflow-y-auto">
  <div className="divide-y divide-border">
    {notifications.map(...)}
  </div>
</div>
```
Mantener intacto el `.map(...)` de items (título, mensaje, fecha, botón "Leída"). ELIMINAR el import de `ScrollArea` si queda sin uso en el archivo (evitar import muerto / warning de lint). El header "Notificaciones" (el `<div className="px-3 py-2.5 border-b ...">`) permanece FUERA de este contenedor scrolleable (fijo).
**Justificación**: `max-height` + `overflow-y-auto` en el mismo elemento es el patrón canónico de un dropdown scrolleable y no depende de cadenas de `height:100%` ni de internals de Base UI — el scroll funciona con certeza. KISS.

**Acceptance**:
- [x] Con muchas notificaciones (las 223 existentes), la lista hace scroll vertical dentro del popover (rueda del mouse y trackpad funcionan).
- [x] La altura de la lista queda acotada a ~320px; el contenido no se sale del popover.
- [x] El encabezado "Notificaciones" permanece visible y fijo (no scrollea con la lista).
- [x] Si `ScrollArea` quedó sin uso, su import fue eliminado (sin imports muertos).

## T2 — Validación de tipos

**File**: (todo el worktree)
**Acción**: ejecutar `npx tsc --noEmit` en el worktree; debe terminar en exit 0.

**Acceptance**:
- [x] `npx tsc --noEmit` termina con exit code 0.
