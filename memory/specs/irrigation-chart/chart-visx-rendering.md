---
type: capability-spec
title: "Renderizado del gráfico de humedad con @visx/xychart"
capability: "irrigation-chart"
slug: "chart-visx-rendering"
domain: "feature"
delta_type: null
supersedes: null
superseded_by: null
status: review
assigned_agent: "sdd-apply"
priority: high
depends_on:
  - "[[irrigation-chart-y-scale]]"
  - "[[irrigation-chart-sensor-gaps]]"
change_ref: "[[fix-dashboard-realtime-status]]"
worktree: "/home/dylan/herramientas-ia/projects/tesis/.sdd/worktrees/fix-dashboard-realtime-status"
feature_branch: "feature/fix-dashboard-frontend"
commits: ["2002e12", "e1b6b70"]
mr: ""
acceptance_criteria:
  - "[x] El gráfico de humedad se renderiza correctamente usando @visx/xychart"
  - "[x] La vista Apilado muestra los tres sensores de riego como áreas apiladas con los colores de página"
  - "[x] La vista Sumatoria muestra los tres sensores de riego como líneas o barras individuales con los colores de página"
  - "[x] Los colores usados son #0071FF, #00E396 y #FEB019 para los tres sensores"
  - "[x] Los períodos sin dato de un sensor no se conectan con línea; el gráfico muestra una brecha natural"
  - "[x] El eje Y está fijo entre 0 y 100"
  - "[x] El tooltip muestra los valores de humedad al pasar el cursor sobre el gráfico"
  - "[x] El proyecto instala las dependencias de @visx/xychart sin errores con legacy-peer-deps=true en .npmrc"
  - "[x] El build de producción completa sin errores"

related:
  - "[[irrigation-chart-y-scale]]"
  - "[[irrigation-chart-sensor-gaps]]"
affects: []
adrs: []
scope:
  - "src/components/dashboard/irrigation-chart.tsx"
  - ".npmrc"
verified_at: null

created: "2026-05-25"
updated: "2026-05-25"
tags: [capability-spec]
---

# Renderizado del gráfico de humedad con @visx/xychart

## Purpose

El gráfico de humedad del dashboard muestra en el tiempo las lecturas de los tres sensores de riego. Actualmente está construido con Recharts, que limita las posibilidades de personalización visual y de animación. Esta spec define la migración al renderizador `@visx/xychart`, que ofrece mayor control sobre estilos, animaciones y composición de series, conservando la funcionalidad ya especificada de escala fija 0–100 en el eje Y y manejo de brechas entre sensores. El resultado visual debe usar los colores propios del dashboard y ofrecer las mismas dos vistas (Apilado y Sumatoria) que el gráfico anterior.

## Requirements

- El sistema SHALL renderizar el gráfico de humedad de riego utilizando `@visx/xychart`.
- El sistema SHALL ofrecer dos vistas del gráfico: Apilado (áreas apiladas) y Sumatoria (series individuales).
- El sistema SHALL usar los colores `#0071FF`, `#00E396` y `#FEB019` para los tres sensores de riego, respectivamente.
- El sistema SHALL mantener el eje Y fijo entre 0 y 100 en ambas vistas, sin auto-escalar.
- El sistema SHALL representar las brechas de datos de cada sensor como interrupciones naturales en la serie, sin conectar los extremos del hueco con una línea.
- El sistema SHALL mostrar un tooltip con los valores de humedad de los sensores al interactuar con el gráfico.
- El sistema SHALL incluir un archivo `.npmrc` con la configuración `legacy-peer-deps=true` para resolver el conflicto de dependencias de pares entre `@visx/xychart` y React 19.
- El build de producción del proyecto SHALL completar sin errores tras instalar las dependencias de `@visx/xychart`.

## Scenarios

### Scenario: Visualización en modo Apilado con datos completos

**GIVEN** los tres sensores de riego tienen lecturas para el período seleccionado
**WHEN** el usuario selecciona la vista Apilado
**THEN** el gráfico muestra áreas apiladas en los colores de página (#0071FF, #00E396, #FEB019), el eje Y va de 0 a 100, y al pasar el cursor sobre el gráfico aparece un tooltip con los valores de cada sensor

### Scenario: Visualización en modo Sumatoria con datos completos

**GIVEN** los tres sensores de riego tienen lecturas para el período seleccionado
**WHEN** el usuario selecciona la vista Sumatoria
**THEN** el gráfico muestra cada sensor como una serie independiente en su color correspondiente, el eje Y permanece fijo entre 0 y 100, y el tooltip funciona al interactuar

### Scenario: Brecha de datos en uno de los sensores

**GIVEN** el sensor de riego a 60 cm no tiene lecturas durante un intervalo de tiempo
**WHEN** el usuario observa el gráfico en cualquier vista
**THEN** la serie del sensor a 60 cm presenta una brecha visual natural durante ese intervalo, sin conectar los puntos anteriores y posteriores con una línea, y las series de los otros sensores continúan normalmente

### Scenario: Instalación de dependencias sin conflictos

**GIVEN** el proyecto tiene React 19 y se agrega `@visx/xychart` como dependencia
**WHEN** se ejecuta la instalación de paquetes con la configuración del archivo `.npmrc`
**THEN** la instalación completa sin errores relacionados con conflictos de dependencias de pares y el build de producción finaliza exitosamente

### Scenario: Sin datos para el período seleccionado

**GIVEN** no hay lecturas de ningún sensor para el período actualmente visualizado
**WHEN** el usuario accede al gráfico
**THEN** el área del gráfico aparece vacía, el eje Y mantiene el rango 0–100 y no se producen errores visuales ni de consola

## Acceptance Criteria

- [ ] El gráfico de humedad se renderiza correctamente usando @visx/xychart
- [ ] La vista Apilado muestra los tres sensores de riego como áreas apiladas con los colores de página
- [ ] La vista Sumatoria muestra los tres sensores de riego como líneas o barras individuales con los colores de página
- [ ] Los colores usados son #0071FF, #00E396 y #FEB019 para los tres sensores
- [ ] Los períodos sin dato de un sensor no se conectan con línea; el gráfico muestra una brecha natural
- [ ] El eje Y está fijo entre 0 y 100
- [ ] El tooltip muestra los valores de humedad al pasar el cursor sobre el gráfico
- [ ] El proyecto instala las dependencias de @visx/xychart sin errores con legacy-peer-deps=true en .npmrc
- [ ] El build de producción completa sin errores

## Related

- [[irrigation-chart-y-scale]] — Esta spec hereda el requisito de eje Y fijo 0–100 definido en la spec de escala
- [[irrigation-chart-sensor-gaps]] — Esta spec hereda el comportamiento de brechas entre sensores definido en la spec de gaps
