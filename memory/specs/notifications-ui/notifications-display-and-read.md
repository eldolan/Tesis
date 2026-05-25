---
type: capability-spec
title: "Visualización de notificaciones del usuario y marcado como leídas"
capability: "notifications-ui"
slug: "notifications-display-and-read"
domain: "fix"
delta_type: null
supersedes: null
superseded_by: null
status: completed
mr: ""
updated: "2026-05-24"
assigned_agent: "sdd-apply"
priority: high
depends_on: []
change_ref: "[[fix-dashboard-frontend]]"
worktree: "/home/dylan/herramientas-ia/projects/tesis/.sdd/worktrees/fix-dashboard-frontend"
feature_branch: "feature/fix-dashboard-frontend"
commits: ["ff12273"]
mr: ""
acceptance_criteria:
  - "[x] El encabezado del dashboard muestra un ícono de campana con un indicador numérico del total de notificaciones no leídas"
  - "[x] Al hacer clic en la campana se abre un panel con la lista de notificaciones del usuario autenticado"
  - "[x] Cada notificación en la lista muestra su contenido y puede marcarse como leída con una acción del usuario"
  - "[x] Al marcar una notificación como leída, el indicador numérico se actualiza de inmediato y la notificación desaparece o se distingue visualmente como leída"
  - "[x] Solo se muestran las notificaciones del usuario autenticado, nunca las de otros usuarios"
  - "[x] El sistema no crea ni elimina notificaciones desde esta interfaz"

related: []
affects:
  - "[[system-status]]"
adrs:
  - "[[0003-rls-user-id-per-row-isolation]]"
scope:
  - "src/hooks/use-notifications.ts"
  - "src/components/dashboard/notifications-popover.tsx"
  - "src/components/dashboard/dashboard-grid.tsx"
verified_at: "2026-05-24"

created: "2026-05-24"
updated: "2026-05-24"
tags: [capability-spec]
---

# Visualización de notificaciones del usuario y marcado como leídas

## Purpose

El sistema ya persiste notificaciones en la base de datos para cada usuario, pero el dashboard no las expone en ninguna interfaz. Esta spec habilita que el usuario autenticado vea sus notificaciones pendientes en el encabezado del dashboard y pueda marcarlas individualmente como leídas, reduciendo su contador de no leídas en tiempo real. La operación de marcado está restringida al usuario propietario de cada notificación; el sistema no permite crear ni eliminar notificaciones desde esta UI.

## Requirements

- El sistema SHALL mostrar en el encabezado del dashboard un indicador de notificaciones no leídas que refleje el conteo actual del usuario autenticado.
- El sistema SHALL presentar, al activar el indicador, una lista de las notificaciones del usuario autenticado, ordenadas por fecha descendente.
- El sistema SHALL permitir al usuario marcar una notificación como leída mediante una acción explícita en la interfaz.
- El sistema SHALL actualizar el indicador de no leídas de forma inmediata al marcar una notificación como leída, sin necesidad de recargar la página.
- El sistema SHALL mostrar únicamente las notificaciones del usuario autenticado, garantizando el aislamiento de datos entre usuarios.
- El sistema SHALL NOT permitir crear ni eliminar notificaciones desde esta interfaz.

## Scenarios

### Scenario: Usuario con notificaciones pendientes abre el panel

**GIVEN** el usuario está autenticado en el dashboard y tiene tres notificaciones no leídas en el sistema
**WHEN** el usuario hace clic en el ícono de notificaciones del encabezado
**THEN** se abre un panel que lista sus tres notificaciones con su contenido, y el encabezado muestra el número "3" como contador de no leídas

### Scenario: Usuario marca una notificación como leída

**GIVEN** el usuario tiene el panel de notificaciones abierto y ve una notificación no leída
**WHEN** el usuario activa la acción de "marcar como leída" para esa notificación
**THEN** el contador de no leídas en el encabezado disminuye en uno de forma inmediata, y la notificación se distingue visualmente como leída (o desaparece de la lista de pendientes)

### Scenario: Usuario sin notificaciones pendientes

**GIVEN** el usuario está autenticado y no tiene notificaciones no leídas
**WHEN** el usuario visualiza el encabezado del dashboard
**THEN** el ícono de notificaciones no muestra ningún contador de no leídas (o muestra cero), y al abrirlo aparece un estado vacío informativo

### Scenario: Aislamiento de notificaciones entre usuarios

**GIVEN** existen dos usuarios en el sistema, cada uno con notificaciones propias
**WHEN** cualquiera de los dos usuarios abre su panel de notificaciones
**THEN** solo ve sus propias notificaciones, nunca las del otro usuario

## Acceptance Criteria

- [ ] El encabezado del dashboard muestra un ícono de campana con un indicador numérico del total de notificaciones no leídas
- [ ] Al hacer clic en la campana se abre un panel con la lista de notificaciones del usuario autenticado
- [ ] Cada notificación en la lista muestra su contenido y puede marcarse como leída con una acción del usuario
- [ ] Al marcar una notificación como leída, el indicador numérico se actualiza de inmediato y la notificación desaparece o se distingue visualmente como leída
- [ ] Solo se muestran las notificaciones del usuario autenticado, nunca las de otros usuarios
- [ ] El sistema no crea ni elimina notificaciones desde esta interfaz

## Related

- [[0003-rls-user-id-per-row-isolation]] — Política RLS que garantiza el aislamiento de filas por usuario
