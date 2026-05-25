---
type: capability-spec
title: "Escala completa del eje de humedad en gráficos de riego"
capability: "irrigation-chart"
slug: "irrigation-chart-y-scale"
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
commits: ["9e87b0f"]
mr: ""
acceptance_criteria:
  - "[x] El eje vertical del gráfico de humedad en vista sumatoria muestra un rango de 0 a 100 % desde el inicio"
  - "[x] El eje vertical del gráfico de humedad en vista apilada muestra un rango de 0 a 100 % desde el inicio"
  - "[x] Los valores de humedad de todos los sensores se representan fielmente sin truncarse ni exagerarse"
  - "[x] La franja de referencia visual 40–100 % sigue visible en ambas vistas"

related:
  - "[[irrigation-chart-sensor-gaps]]"
affects:
  - "[[system-status]]"
adrs: []
scope:
  - "src/components/dashboard/irrigation-chart.tsx"
verified_at: "2026-05-24"

created: "2026-05-24"
updated: "2026-05-24"
tags: [capability-spec]
---

# Escala completa del eje de humedad en gráficos de riego

## Purpose

El gráfico de humedad de riego debe representar los datos en su escala natural de 0 a 100 %, ya que los valores de humedad del suelo se expresan en porcentaje. Actualmente, la vista sumatoria usa un rango parcial (40–100) que oculta las lecturas bajas reales, y la vista apilada ajusta la escala automáticamente al rango de los datos presentes, produciendo distorsiones visuales. Esta spec garantiza que ambas vistas muestren siempre el eje completo de 0 a 100 %.

## Requirements

- El sistema SHALL mostrar el eje de humedad con rango 0–100 % en la vista sumatoria del gráfico de riego.
- El sistema SHALL mostrar el eje de humedad con rango 0–100 % en la vista apilada del gráfico de riego.
- El sistema SHALL conservar la franja de referencia visual entre 40 % y 100 % en ambas vistas, sin modificarla.
- El sistema SHALL representar los valores de humedad de los sensores sin aplicar ninguna transformación ni factor de escala adicional, ya que los datos ya se expresan en porcentaje.

## Scenarios

### Scenario: Vista sumatoria con lecturas bajas reales

**GIVEN** el usuario tiene el gráfico de riego en vista sumatoria y los sensores registran valores de humedad entre 0 % y 4 %
**WHEN** el usuario observa el gráfico
**THEN** el eje vertical inicia en 0 % y termina en 100 %, las barras reflejan los valores reales de los sensores sin ampliación artificial, y la franja de referencia sigue siendo visible entre 40 % y 100 %

### Scenario: Vista apilada con múltiples sensores activos

**GIVEN** el usuario cambia a la vista apilada del gráfico de riego
**WHEN** el sistema renderiza las lecturas de los tres sensores de riego
**THEN** el eje vertical inicia en 0 % y termina en 100 %, las lecturas de cada sensor se apilan mostrando su valor proporcional real, y la franja de referencia continúa visible

### Scenario: Sin lecturas disponibles

**GIVEN** no hay lecturas de humedad para el período seleccionado
**WHEN** el usuario visualiza el gráfico en cualquier vista
**THEN** el eje vertical mantiene el rango 0–100 % y el área del gráfico aparece vacía, sin colapsar el eje

## Acceptance Criteria

- [ ] El eje vertical del gráfico de humedad en vista sumatoria muestra un rango de 0 a 100 % desde el inicio
- [ ] El eje vertical del gráfico de humedad en vista apilada muestra un rango de 0 a 100 % desde el inicio
- [ ] Los valores de humedad de todos los sensores se representan fielmente sin truncarse ni exagerarse
- [ ] La franja de referencia visual 40–100 % sigue visible en ambas vistas

## Related

- [[irrigation-chart-sensor-gaps]] — Manejo de períodos sin lectura al alinear los tres sensores de riego
