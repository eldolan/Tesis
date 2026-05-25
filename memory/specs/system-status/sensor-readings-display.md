---
type: capability-spec
title: "Visualización de lecturas de humedad por sensor de riego"
capability: "system-status"
slug: "sensor-readings-display"
domain: "feature"
delta_type: null
supersedes: null
superseded_by: null
status: review
assigned_agent: "sdd-apply"
priority: high
depends_on: []
change_ref: "[[fix-dashboard-realtime-status]]"
worktree: "/home/dylan/herramientas-ia/projects/tesis/.sdd/worktrees/fix-dashboard-realtime-status"
feature_branch: "feature/fix-dashboard-frontend"
commits: ["326e11f", "ddffe8a"]
mr: ""
acceptance_criteria:
  - "[x] Cada sensor de riego muestra su porcentaje de humedad actual"
  - "[x] Cada sensor de riego muestra la fecha y hora resumida de su última lectura"
  - "[x] La fecha/hora se presenta en formato compacto legible (ej. 'hoy 14:32' o '23 may 09:10')"
  - "[x] Cuando un sensor no tiene lecturas disponibles, el campo muestra un estado vacío o indicador de sin datos, sin romper la interfaz"

related:
  - "[[ambient-sensor-row]]"
  - "[[irrigation-active-detection]]"
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

# Visualización de lecturas de humedad por sensor de riego

## Purpose

El panel de estado del sistema lista los sensores de riego instalados en el campo. Actualmente cada sensor solo muestra si está "en línea" o "fuera de línea" y la fecha de la última lectura, sin incluir el valor de humedad medido. El agrónomo necesita ver el porcentaje de humedad directamente en la tarjeta de estado para evaluar de un vistazo si el suelo requiere intervención, sin necesidad de abrir el gráfico detallado. Esta spec define qué datos de la última lectura de cada sensor debe mostrar el panel de estado.

## Requirements

- El sistema SHALL mostrar, para cada sensor de riego, el porcentaje de humedad de su última lectura registrada.
- El sistema SHALL mostrar, para cada sensor de riego, la fecha y hora de su última lectura en formato compacto legible.
- El sistema SHALL incluir el campo `humedad` en la consulta que recupera los datos de estado de los sensores de riego.
- El sistema SHALL mostrar un indicador de ausencia de datos en lugar de un valor vacío o erróneo cuando un sensor no tiene lecturas registradas.
- El sistema SHOULD presentar la fecha/hora resumida de manera que el usuario distinga lecturas recientes (hoy) de lecturas más antiguas.

## Scenarios

### Scenario: Sensor con lectura reciente disponible

**GIVEN** un sensor de riego tiene al menos una lectura registrada en la base de datos
**WHEN** el usuario accede al panel de estado del sistema
**THEN** el panel muestra junto al nombre del sensor su porcentaje de humedad actual y la fecha y hora compacta de esa lectura (ej. "hoy 14:32" si fue registrada el mismo día)

### Scenario: Sensor con lectura de días anteriores

**GIVEN** un sensor de riego tiene lecturas pero ninguna del día actual
**WHEN** el usuario observa el panel de estado
**THEN** el panel muestra el porcentaje de humedad y una fecha compacta que incluye el día (ej. "23 may 09:10") para indicar que la lectura no es de hoy

### Scenario: Sensor sin ninguna lectura registrada

**GIVEN** un sensor de riego no tiene ninguna lectura en la base de datos
**WHEN** el usuario accede al panel de estado
**THEN** el panel muestra el sensor con un indicador de "sin datos" o equivalente en lugar del porcentaje y la fecha, sin mostrar valores vacíos ni producir errores visuales

### Scenario: Múltiples sensores con lecturas en distintos momentos

**GIVEN** el sistema tiene tres sensores de riego, cada uno con su propia última lectura registrada en momentos distintos
**WHEN** el usuario observa el panel de estado
**THEN** cada sensor muestra de forma independiente su propio porcentaje de humedad y su propia fecha/hora de última lectura

## Acceptance Criteria

- [ ] Cada sensor de riego muestra su porcentaje de humedad actual
- [ ] Cada sensor de riego muestra la fecha y hora resumida de su última lectura
- [ ] La fecha/hora se presenta en formato compacto legible (ej. "hoy 14:32" o "23 may 09:10")
- [ ] Cuando un sensor no tiene lecturas disponibles, el campo muestra un estado vacío o indicador de sin datos, sin romper la interfaz

## Related

- [[ambient-sensor-row]] — El sensor ambiental se muestra como fila adicional en el mismo panel de estado
- [[irrigation-active-detection]] — La detección de riego activo también depende de los datos recuperados por sensor
- [[system-health-overall]] — El estado de salud general toma como entrada si los sensores están en línea con datos
