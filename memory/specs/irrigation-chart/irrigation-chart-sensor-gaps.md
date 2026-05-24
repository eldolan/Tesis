---
type: capability-spec
title: "Manejo de períodos sin lectura en gráficos de riego multi-sensor"
capability: "irrigation-chart"
slug: "irrigation-chart-sensor-gaps"
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
  - "[[irrigation-chart-y-scale]]"
change_ref: "[[fix-dashboard-frontend]]"
worktree: "/home/dylan/herramientas-ia/projects/tesis/.sdd/worktrees/fix-dashboard-frontend"
feature_branch: "feature/fix-dashboard-frontend"
commits: ["9e87b0f"]
mr: ""
acceptance_criteria:
  - "[x] El gráfico se renderiza sin errores cuando alguno de los tres sensores no tiene lectura para un instante dado"
  - "[x] Los períodos sin dato de un sensor se muestran como una interrupción en la línea, no como un salto a cero"
  - "[x] Los datos de los sensores con lectura disponible se siguen mostrando correctamente aunque otro sensor tenga un período vacío"

related:
  - "[[irrigation-chart-y-scale]]"
affects: []
adrs: []
scope:
  - "src/components/dashboard/irrigation-chart.tsx"
  - "src/hooks/use-irrigation-data.ts"
verified_at: "2026-05-24"

created: "2026-05-24"
updated: "2026-05-24"
tags: [capability-spec]
---

# Manejo de períodos sin lectura en gráficos de riego multi-sensor

## Purpose

El dashboard muestra datos de tres sensores de riego con timestamps independientes. Al alinearlos en el mismo eje temporal, pueden existir instantes en que uno o más sensores no tienen lectura registrada. Si esos huecos no se manejan correctamente, el gráfico puede mostrar saltos a cero o comportamiento visual erróneo que confunde al usuario sobre el estado real de la humedad. Esta spec garantiza que los períodos sin dato se representen como interrupciones naturales (sin valor) en lugar de valores falsos de cero.

## Requirements

- El sistema SHALL representar los períodos sin lectura de un sensor como ausencia de dato en el gráfico, no como un valor de cero.
- El sistema SHALL continuar mostrando las lecturas válidas de los demás sensores aunque un sensor no tenga datos en ese período.
- El sistema SHALL alinear los datos de los tres sensores por timestamp sin introducir valores inventados para cubrir huecos.

## Scenarios

### Scenario: Un sensor sin lecturas durante un intervalo

**GIVEN** el sensor de riego a 60 cm no tiene lecturas registradas para la semana en curso, mientras los sensores a 20 cm y 40 cm sí tienen datos
**WHEN** el usuario visualiza el gráfico de riego
**THEN** el gráfico muestra las líneas o barras de los sensores a 20 cm y 40 cm de forma continua, y la línea del sensor a 60 cm simplemente no aparece durante ese período, sin producir ningún salto ni barra de cero

### Scenario: Todos los sensores con huecos puntuales intercalados

**GIVEN** cada sensor tiene algunos instantes en que no registró lectura, con timestamps distintos para cada uno
**WHEN** el usuario observa el gráfico en cualquier vista
**THEN** cada línea o barra se interrumpe solo en los instantes de ese sensor sin dato, sin afectar la representación de los otros sensores, y el eje vertical mantiene el rango 0–100 %

### Scenario: Ningún sensor con datos

**GIVEN** no existen lecturas de ningún sensor para el período seleccionado
**WHEN** el usuario visualiza el gráfico
**THEN** el área del gráfico aparece vacía y el sistema no genera errores ni valores ficticios

## Acceptance Criteria

- [ ] El gráfico se renderiza sin errores cuando alguno de los tres sensores no tiene lectura para un instante dado
- [ ] Los períodos sin dato de un sensor se muestran como una interrupción en la línea, no como un salto a cero
- [ ] Los datos de los sensores con lectura disponible se siguen mostrando correctamente aunque otro sensor tenga un período vacío

## Related

- [[irrigation-chart-y-scale]] — Escala del eje Y fija en 0–100 % para el mismo gráfico
