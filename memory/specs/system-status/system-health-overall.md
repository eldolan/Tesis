---
type: capability-spec
title: "Cálculo del estado de salud general del sistema"
capability: "system-status"
slug: "system-health-overall"
domain: "fix"
delta_type: null
supersedes: null
superseded_by: null
status: completed
mr: ""
updated: "2026-05-24"
assigned_agent: "sdd-apply"
priority: medium
depends_on:
  - "[[realtime-connection-state]]"
change_ref: "[[fix-dashboard-frontend]]"
worktree: "/home/dylan/herramientas-ia/projects/tesis/.sdd/worktrees/fix-dashboard-frontend"
feature_branch: "feature/fix-dashboard-frontend"
commits: ["c289c30"]
mr: ""
acceptance_criteria:
  - "[x] El panel de estado muestra 'Óptimo' cuando todos los sensores están en línea y la conexión en tiempo real está activa"
  - "[x] El panel muestra 'Parcial' cuando al menos un sensor está fuera de línea o la conexión en tiempo real está inactiva, pero al menos un componente sigue operativo"
  - "[x] El panel muestra 'Sin datos' o un estado de falla cuando ningún componente del sistema está operativo"
  - "[x] El estado de salud se actualiza automáticamente al cambiar el estado de la conexión en tiempo real, sin requerir acción del usuario"

related:
  - "[[realtime-connection-state]]"
affects: []
adrs: []
scope:
  - "src/components/dashboard/system-status.tsx"
verified_at: "2026-05-24"

created: "2026-05-24"
updated: "2026-05-24"
tags: [capability-spec]
---

# Cálculo del estado de salud general del sistema

## Purpose

El panel de estado del sistema muestra un indicador de "Salud General" que resume si todos los componentes clave están operativos. Actualmente, este indicador queda atascado en "Parcial" porque el estado de la conexión en tiempo real siempre reporta inactivo, aunque todos los sensores estén en línea. Esta spec define la lógica de cálculo de la salud general: el indicador debe reflejar "Óptimo" solo cuando tanto los sensores como la conexión en tiempo real estén operativos; cualquier componente no disponible degrada el estado a "Parcial". La corrección del indicador de salud es un efecto colateral directo de la corrección del estado de conexión en tiempo real.

## Requirements

- El sistema SHALL calcular la salud general como "Óptimo" cuando todos los sensores configurados están en línea Y la conexión en tiempo real está activa.
- El sistema SHALL calcular la salud general como "Parcial" cuando al menos un sensor está fuera de línea O la conexión en tiempo real está inactiva, pero al menos un componente sigue operativo.
- El sistema SHALL recalcular el estado de salud general de forma automática cada vez que cambie el estado de la conexión en tiempo real o el estado de algún sensor.
- El sistema SHALL NOT requerir ninguna acción del usuario para que el indicador de salud refleje el estado actual.

## Scenarios

### Scenario: Todos los componentes operativos tras conexión establecida

**GIVEN** todos los sensores del sistema están en línea y la conexión en tiempo real acaba de ser confirmada por el servidor
**WHEN** el panel de estado actualiza su vista
**THEN** el indicador de salud general muestra "Óptimo"

### Scenario: Salud degradada por conexión inactiva

**GIVEN** todos los sensores están en línea pero la conexión en tiempo real no está confirmada
**WHEN** el usuario observa el panel de estado
**THEN** el indicador de salud general muestra "Parcial", reflejando que la actualización de datos en tiempo real no está disponible aunque los sensores sigan operativos

### Scenario: Salud degradada por sensor fuera de línea

**GIVEN** la conexión en tiempo real está activa pero uno de los sensores no envía datos
**WHEN** el usuario observa el panel de estado
**THEN** el indicador de salud general muestra "Parcial"

### Scenario: Transición automática a "Óptimo"

**GIVEN** el indicador mostraba "Parcial" porque la conexión en tiempo real estaba inactiva
**WHEN** la conexión en tiempo real se establece exitosamente (sin que el usuario recargue la página)
**THEN** el indicador de salud general cambia automáticamente a "Óptimo" si todos los sensores también están en línea

## Acceptance Criteria

- [ ] El panel de estado muestra "Óptimo" cuando todos los sensores están en línea y la conexión en tiempo real está activa
- [ ] El panel muestra "Parcial" cuando al menos un sensor está fuera de línea o la conexión en tiempo real está inactiva, pero al menos un componente sigue operativo
- [ ] El panel muestra "Sin datos" o un estado de falla cuando ningún componente del sistema está operativo
- [ ] El estado de salud se actualiza automáticamente al cambiar el estado de la conexión en tiempo real, sin requerir acción del usuario

## Related

- [[realtime-connection-state]] — El estado de conexión es una entrada directa del cálculo de salud general
