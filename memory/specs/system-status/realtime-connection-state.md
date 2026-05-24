---
type: capability-spec
title: "Estado de conexión en tiempo real del dashboard"
capability: "system-status"
slug: "realtime-connection-state"
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
commits: ["c289c30"]
mr: ""
acceptance_criteria:
  - "[x] El indicador de conexión muestra 'Conectado' cuando la suscripción en tiempo real está activa y confirmada por el servidor"
  - "[x] El indicador muestra 'Conectando...' o un estado intermedio mientras la conexión se está estableciendo"
  - "[x] El indicador muestra 'Desconectado' cuando la conexión se pierde, expira o el servidor rechaza la suscripción"
  - "[x] El cambio de estado en el indicador ocurre en respuesta a eventos reales del servidor, no de forma inmediata sin confirmación"

related:
  - "[[system-health-overall]]"
affects:
  - "[[system-health-overall]]"
adrs: []
scope:
  - "src/components/dashboard/system-status.tsx"
verified_at: "2026-05-24"

created: "2026-05-24"
updated: "2026-05-24"
tags: [capability-spec]
---

# Estado de conexión en tiempo real del dashboard

## Purpose

El dashboard incluye un indicador de conexión en tiempo real que informa al usuario si los datos se están actualizando de forma continua. Actualmente, el indicador reporta siempre "Desconectado" porque el canal de suscripción no tiene ningún oyente real que permita al servidor confirmar la conexión. Esta spec corrige ese comportamiento: el indicador debe reflejar el estado real de la suscripción, mostrando "Conectado" cuando el servidor confirma la conexión activa, un estado de transición mientras se establece, y "Desconectado" ante cualquier falla, tiempo de espera agotado o cierre del canal.

## Requirements

- El sistema SHALL marcar la conexión como activa únicamente cuando el servidor confirme que la suscripción está establecida.
- El sistema SHALL mostrar un estado de transición ("Conectando…" o equivalente) mientras la conexión está en proceso de establecerse.
- El sistema SHALL marcar la conexión como inactiva ante cualquier falla, tiempo de espera agotado o cierre inesperado del canal.
- El sistema SHALL actualizar el indicador de conexión en respuesta a cada cambio de estado del servidor, sin retrasos artificiales.
- El sistema SHALL mantener un oyente real en el canal de suscripción para que el servidor pueda confirmar la conexión (no es posible confirmar un canal vacío).

## Scenarios

### Scenario: Conexión establecida exitosamente

**GIVEN** el dashboard se carga y el usuario tiene conectividad con el servidor
**WHEN** el canal de tiempo real se suscribe y el servidor confirma la conexión
**THEN** el indicador de conexión cambia a "Conectado" y permanece así mientras la conexión esté activa

### Scenario: Conexión en proceso de establecerse

**GIVEN** el dashboard acaba de cargarse y el canal de tiempo real está iniciando la suscripción
**WHEN** la conexión aún no ha sido confirmada por el servidor
**THEN** el indicador muestra un estado de transición (por ejemplo "Conectando…") que no afirma ni que está conectado ni que está desconectado

### Scenario: Tiempo de espera de conexión agotado

**GIVEN** el canal de tiempo real intentó conectarse pero el servidor no respondió en el tiempo esperado
**WHEN** el tiempo de espera se agota
**THEN** el indicador cambia a "Desconectado" y el estado de salud general del sistema refleja que la conexión no está disponible

### Scenario: Pérdida de conexión tras estar activo

**GIVEN** el indicador mostraba "Conectado" porque la suscripción estaba activa
**WHEN** el canal se cierra inesperadamente o el servidor reporta un error en la suscripción
**THEN** el indicador cambia a "Desconectado" de forma inmediata, sin esperar una recarga del usuario

### Scenario: Reconexión tras falla

**GIVEN** el indicador mostraba "Desconectado" por una falla previa
**WHEN** el sistema reinicia la suscripción y el servidor la confirma
**THEN** el indicador vuelve a mostrar "Conectado"

## Acceptance Criteria

- [ ] El indicador de conexión muestra "Conectado" cuando la suscripción en tiempo real está activa y confirmada por el servidor
- [ ] El indicador muestra "Conectando..." o un estado intermedio mientras la conexión se está estableciendo
- [ ] El indicador muestra "Desconectado" cuando la conexión se pierde, expira o el servidor rechaza la suscripción
- [ ] El cambio de estado en el indicador ocurre en respuesta a eventos reales del servidor, no de forma inmediata sin confirmación

## Related

- [[system-health-overall]] — La salud general del sistema depende del estado de conexión aquí definido
