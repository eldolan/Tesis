---
type: capability-spec
title: "Detección de riego activo en cualquier sensor"
capability: "system-status"
slug: "irrigation-active-detection"
domain: "fix"
delta_type: null
supersedes: null
superseded_by: null
status: review
assigned_agent: "sdd-apply"
priority: high
depends_on:
  - "[[sensor-readings-display]]"
change_ref: "[[fix-dashboard-realtime-status]]"
worktree: "/home/dylan/herramientas-ia/projects/tesis/.sdd/worktrees/fix-dashboard-realtime-status"
feature_branch: "feature/fix-dashboard-frontend"
commits: ["326e11f", "ddffe8a"]
mr: ""
acceptance_criteria:
  - "[x] El indicador de riego activo se enciende cuando al menos uno de los sensores con datos reporta que hay un evento de riego en curso"
  - "[x] El indicador de riego activo permanece apagado si ningún sensor reporta un evento de riego, aunque algunos sensores tengan datos"
  - "[x] La evaluación de riego activo recorre todos los sensores que tienen lectura disponible, no solo el primero de la lista"
  - "[x] El indicador refleja correctamente el estado cuando los eventos de riego provienen de sensores distintos al primero"

related:
  - "[[sensor-readings-display]]"
  - "[[system-health-overall]]"
affects:
  - "[[system-health-overall]]"
adrs: []
scope:
  - "src/components/dashboard/system-status.tsx"
verified_at: null

created: "2026-05-25"
updated: "2026-05-25"
tags: [capability-spec]
---

# Detección de riego activo en cualquier sensor

## Purpose

El panel de estado del sistema incluye un indicador que informa si hay un riego en curso en el campo. Actualmente, la lógica de detección evalúa únicamente el primer sensor de la lista, ignorando el estado de los sensores restantes. Si el primer sensor no reporta riego activo pero otro sí lo hace, el indicador permanece apagado incorrectamente, dando una imagen falsa del estado del campo. Esta spec corrige ese comportamiento: el indicador de riego activo debe encenderse si cualquier sensor con datos reporta un evento de riego en curso.

## Requirements

- El sistema SHALL evaluar el estado de riego de todos los sensores que tienen lecturas disponibles, no solo el primero.
- El sistema SHALL activar el indicador de riego activo cuando al menos un sensor con datos reporta un evento de riego en curso.
- El sistema SHALL mantener el indicador de riego inactivo cuando ningún sensor reporta un evento de riego, independientemente de cuántos sensores tengan datos.
- El sistema SHALL NOT asumir que el orden de los sensores determina cuál es el representativo del estado de riego del campo.

## Scenarios

### Scenario: Riego activo en el primer sensor

**GIVEN** el sistema tiene tres sensores de riego y el primero de la lista reporta un evento de riego en curso
**WHEN** el usuario accede al panel de estado
**THEN** el indicador de riego activo se muestra encendido

### Scenario: Riego activo en un sensor distinto al primero

**GIVEN** el sistema tiene tres sensores de riego, el primero no reporta riego activo pero el segundo o el tercero sí lo hace
**WHEN** el usuario accede al panel de estado
**THEN** el indicador de riego activo se muestra encendido, reflejando que hay riego en algún punto del campo

### Scenario: Ningún sensor con riego activo

**GIVEN** todos los sensores de riego tienen lecturas disponibles pero ninguno reporta un evento de riego en curso
**WHEN** el usuario accede al panel de estado
**THEN** el indicador de riego activo permanece apagado

### Scenario: Sensores sin datos disponibles

**GIVEN** ningún sensor de riego tiene lecturas registradas
**WHEN** el usuario accede al panel de estado
**THEN** el indicador de riego activo permanece apagado, dado que no hay información que confirme un evento de riego

## Acceptance Criteria

- [ ] El indicador de riego activo se enciende cuando al menos uno de los sensores con datos reporta que hay un evento de riego en curso
- [ ] El indicador de riego activo permanece apagado si ningún sensor reporta un evento de riego, aunque algunos sensores tengan datos
- [ ] La evaluación de riego activo recorre todos los sensores que tienen lectura disponible, no solo el primero de la lista
- [ ] El indicador refleja correctamente el estado cuando los eventos de riego provienen de sensores distintos al primero

## Related

- [[sensor-readings-display]] — La detección de riego activo opera sobre los mismos datos de lectura de sensores
- [[system-health-overall]] — El estado de riego activo es un dato que el panel de salud general puede considerar
