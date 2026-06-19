---
type: capability-spec
title: "Bandas agronómicas visibles en modo Sumatoria para todos los períodos del gráfico de riego"
capability: "riego-dashboard"
slug: "riego-dashboard-bandas-agronomicas-visibles-modo-sum"
domain: "fix"
delta_type: null
supersedes: null
superseded_by: null
status: completed
assigned_agent: "sdd-apply"
priority: high
depends_on: []
change_ref: "[[sumatoria-grafico-riego-dia-semana]]"
worktree: "/home/dylan/herramientas-ia/projects/tesis/.sdd/worktrees/sumatoria-grafico-riego-dia-semana"
feature_branch: "feature/sumatoria-grafico-riego-dia-semana"
commits: []
mr: ""
acceptance_criteria:
  - "[ ] En modo Sumatoria + período Día, las 4 bandas agronómicas (Lleno, Recarga, Inicio Estrés, Peligro) son visibles en el gráfico"
  - "[ ] En modo Sumatoria + período Semana, las 4 bandas agronómicas son visibles en el gráfico"
  - "[ ] En modo Sumatoria + período Mes, las 4 bandas agronómicas siguen visibles (no regresión)"
  - "[ ] En modo Sumatoria + período Año, las 4 bandas agronómicas siguen visibles (no regresión)"
  - "[ ] En modo Apilado, el eje Y y las bandas se comportan exactamente igual que antes del cambio (no regresión)"
  - "[ ] Cuando los sensores reportan valores fuera del rango 40-100, el eje se expande para incluir tanto los datos como las bandas"
  - "[ ] El dominio del eje Y y el filtro de visibilidad de bandas son coherentes: las bandas que el eje puede mostrar son exactamente las que se renderizan"

related: []
affects: []
adrs: []
scope:
  - "src/components/dashboard/irrigation-chart.tsx"
verified_at: "2026-06-17"

created: "2026-06-17"
updated: "2026-06-17"
mr: ""
tags: [capability-spec]
---

# Bandas agronómicas visibles en modo Sumatoria para todos los períodos del gráfico de riego

## Purpose

El gráfico de riego del dashboard ofrece un modo "Sumatoria" diseñado para mostrar los datos de humedad del suelo junto con bandas de referencia agronómica (Nivel de Lleno, Punto de Recarga, Inicio de Estrés, Peligro de Estrés Extremo). En las vistas de día y semana, esas bandas no se renderizan porque el rango de valores reportado por los sensores en períodos cortos es más estrecho que el rango que las bandas ocupan (40–100%). Esta spec describe el comportamiento corregido: en modo Sumatoria, las bandas agronómicas son siempre visibles independientemente del período seleccionado, sin afectar el comportamiento del modo Apilado.

## Requirements

- El sistema SHALL mostrar las 4 bandas agronómicas en el gráfico cuando el usuario activa el modo Sumatoria y selecciona el período Día.
- El sistema SHALL mostrar las 4 bandas agronómicas en el gráfico cuando el usuario activa el modo Sumatoria y selecciona el período Semana.
- El sistema SHALL mantener las bandas agronómicas visibles en los períodos Mes y Año en modo Sumatoria (comportamiento previo, sin regresión).
- El sistema SHALL mantener el comportamiento actual del eje Y y de la visibilidad de bandas cuando el usuario está en modo Apilado, independientemente del período seleccionado.
- El sistema SHALL garantizar que el eje Y y el filtro de visibilidad de bandas usen el mismo dominio efectivo, de modo que nunca haya una banda excluida del renderizado pero cuyo rango cae dentro del área visible del eje, ni viceversa.
- El sistema SHOULD adaptar el eje Y para incluir también los datos de los sensores si su rango supera los límites del rango de las bandas (40–100%), de manera que las lecturas no queden recortadas visualmente.

## Scenarios

### Scenario: Bandas agronómicas visibles en vista Día — modo Sumatoria

**GIVEN** el usuario está en el dashboard de riego  
**WHEN** selecciona el período "Día" y activa el modo de visualización "Sumatoria"  
**THEN** las 4 bandas agronómicas (Nivel de Lleno, Punto de Recarga, Inicio de Estrés, Peligro de Estrés Extremo) son visibles en el gráfico, superpuestas a la línea de humedad promedio

### Scenario: Bandas agronómicas visibles en vista Semana — modo Sumatoria

**GIVEN** el usuario está en el dashboard de riego  
**WHEN** selecciona el período "Semana" y activa el modo de visualización "Sumatoria"  
**THEN** las 4 bandas agronómicas son visibles en el gráfico, sin importar que los valores de humedad registrados esa semana estén en un rango estrecho

### Scenario: No regresión en vista Mes y Año — modo Sumatoria

**GIVEN** el usuario está en el dashboard de riego con modo "Sumatoria" activo  
**WHEN** selecciona el período "Mes" o el período "Año"  
**THEN** las bandas agronómicas son visibles exactamente igual que antes del cambio (sin regresión)

### Scenario: No regresión en modo Apilado — cualquier período

**GIVEN** el usuario está en el dashboard de riego con el modo "Apilado" activo  
**WHEN** selecciona cualquier período (Día, Semana, Mes o Año)  
**THEN** el eje Y y la visibilidad de las bandas se comportan exactamente igual que antes del cambio; no hay diferencia observable respecto al estado anterior

### Scenario: Dominio coherente entre eje y bandas — modo Sumatoria

**GIVEN** el usuario activa el modo "Sumatoria" en cualquier período  
**WHEN** el gráfico se renderiza  
**THEN** todas las bandas agronómicas que son visibles en el eje Y también se renderizan en el gráfico; no existe ninguna banda que el eje tenga espacio para mostrar pero que aparezca en blanco o ausente

### Scenario: Sensores con valores fuera del rango de las bandas — modo Sumatoria

**GIVEN** los sensores reportan lecturas de humedad por debajo del 40% o por encima del 100%  
**WHEN** el usuario está en modo "Sumatoria"  
**THEN** el eje Y se expande para incluir tanto las bandas agronómicas como las lecturas de los sensores, de modo que ningún dato queda recortado fuera del área visible del gráfico

## Acceptance Criteria

- [ ] En modo Sumatoria + período Día, las 4 bandas agronómicas (Lleno, Recarga, Inicio Estrés, Peligro) son visibles en el gráfico
- [ ] En modo Sumatoria + período Semana, las 4 bandas agronómicas son visibles en el gráfico
- [ ] En modo Sumatoria + período Mes, las 4 bandas agronómicas siguen visibles (no regresión)
- [ ] En modo Sumatoria + período Año, las 4 bandas agronómicas siguen visibles (no regresión)
- [ ] En modo Apilado, el eje Y y las bandas se comportan exactamente igual que antes del cambio (no regresión)
- [ ] Cuando los sensores reportan valores fuera del rango 40-100, el eje se expande para incluir tanto los datos como las bandas
- [ ] El dominio del eje Y y el filtro de visibilidad de bandas son coherentes: las bandas que el eje puede mostrar son exactamente las que se renderizan

## Related

- [[riego-rdc-modulacion-por-fase]] — capability hermana del módulo de riego; cubre la lógica del agente autónomo (n8n), no la capa de visualización
