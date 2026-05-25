---
type: capability-spec
title: "Fila de sensor ambiental en el panel de estado del sistema"
capability: "system-status"
slug: "ambient-sensor-row"
domain: "feature"
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
  - "[x] El panel de estado muestra una fila dedicada al sensor ambiental"
  - "[x] La fila del sensor ambiental muestra la temperatura en grados Celsius de la última lectura"
  - "[x] La fila del sensor ambiental muestra el porcentaje de humedad ambiental de la última lectura"
  - "[x] Los datos del sensor ambiental corresponden a la lectura más reciente ordenada por fecha de registro"
  - "[x] Cuando no hay lecturas ambientales disponibles, la fila muestra un indicador de sin datos sin producir errores"

related:
  - "[[sensor-readings-display]]"
  - "[[system-health-overall]]"
affects: []
adrs: []
scope:
  - "src/components/dashboard/system-status.tsx"
verified_at: null

created: "2026-05-25"
updated: "2026-05-25"
tags: [capability-spec]
---

# Fila de sensor ambiental en el panel de estado del sistema

## Purpose

El campo cuenta con un sensor ambiental (onboard) que registra temperatura del aire y humedad relativa del ambiente. Esta información complementa los datos de los sensores de suelo y es relevante para las decisiones agronómicas diarias. Actualmente el panel de estado del sistema no incluye ninguna representación del sensor ambiental. Esta spec agrega una fila dedicada al sensor ambiental dentro del panel, mostrando la temperatura y la humedad ambiental de la lectura más reciente registrada.

## Requirements

- El sistema SHALL mostrar una fila independiente para el sensor ambiental dentro del panel de estado del sistema.
- El sistema SHALL mostrar la temperatura en grados Celsius del sensor ambiental correspondiente a su lectura más reciente.
- El sistema SHALL mostrar el porcentaje de humedad ambiental del sensor ambiental correspondiente a su lectura más reciente.
- El sistema SHALL determinar la lectura más reciente del sensor ambiental ordenando por fecha de registro (no por timestamp del firmware), tomando el primer resultado.
- El sistema SHALL mostrar un estado de "sin datos" cuando no existen lecturas del sensor ambiental, sin producir valores nulos ni errores visuales.

## Scenarios

### Scenario: Sensor ambiental con lectura disponible

**GIVEN** el sensor ambiental tiene al menos una lectura registrada en la base de datos
**WHEN** el usuario accede al panel de estado del sistema
**THEN** el panel muestra una fila del sensor ambiental con la temperatura en °C y el porcentaje de humedad ambiental de la lectura más reciente

### Scenario: Múltiples lecturas ambientales registradas

**GIVEN** el sensor ambiental tiene varias lecturas registradas en distintos momentos
**WHEN** el sistema recupera los datos para el panel de estado
**THEN** muestra únicamente la lectura más reciente según la fecha de registro, no la más reciente según el reloj interno del sensor

### Scenario: Sin lecturas ambientales

**GIVEN** el sensor ambiental no tiene ninguna lectura registrada o la tabla de lecturas ambientales está vacía
**WHEN** el usuario accede al panel de estado
**THEN** la fila del sensor ambiental aparece con un indicador de "sin datos" en lugar de temperatura y humedad, sin producir errores visuales ni valores nulos expuestos al usuario

### Scenario: Panel con sensores de suelo y sensor ambiental

**GIVEN** el sistema tiene sensores de suelo y un sensor ambiental, todos con lecturas recientes
**WHEN** el usuario observa el panel de estado completo
**THEN** los sensores de suelo aparecen con sus propias filas de humedad y los datos de temperatura y humedad ambiental aparecen en una fila claramente diferenciada, identificada como sensor ambiental

## Acceptance Criteria

- [ ] El panel de estado muestra una fila dedicada al sensor ambiental
- [ ] La fila del sensor ambiental muestra la temperatura en grados Celsius de la última lectura
- [ ] La fila del sensor ambiental muestra el porcentaje de humedad ambiental de la última lectura
- [ ] Los datos del sensor ambiental corresponden a la lectura más reciente ordenada por fecha de registro
- [ ] Cuando no hay lecturas ambientales disponibles, la fila muestra un indicador de sin datos sin producir errores

## Related

- [[sensor-readings-display]] — Los sensores de suelo se muestran en filas del mismo panel de estado
- [[system-health-overall]] — El estado de salud general puede considerar la disponibilidad del sensor ambiental
