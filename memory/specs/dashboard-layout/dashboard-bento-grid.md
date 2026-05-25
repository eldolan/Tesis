---
type: capability-spec
title: "Reorganización del layout bento del dashboard"
capability: "dashboard-layout"
slug: "dashboard-bento-grid"
domain: "feature"
delta_type: null
supersedes: null
superseded_by: null
status: review
assigned_agent: "sdd-apply"
priority: medium
depends_on:
  - "[[sensor-readings-display]]"
  - "[[chart-visx-rendering]]"
  - "[[assistant-card-ui]]"
change_ref: "[[fix-dashboard-realtime-status]]"
worktree: "/home/dylan/herramientas-ia/projects/tesis/.sdd/worktrees/fix-dashboard-realtime-status"
feature_branch: "feature/fix-dashboard-frontend"
commits: ["c514422"]
mr: ""
acceptance_criteria:
  - "[x] El dashboard se renderiza en un grid bento sin solapamientos entre tarjetas"
  - "[x] No hay huecos visibles injustificados en el grid en los breakpoints de container query del proyecto"
  - "[x] El panel de estado del sistema, el gráfico de riego y SoilChat tienen celdas asignadas en el nuevo layout"
  - "[ ] El componente FertilizerChart permanece en el layout (aunque en Recharts) hasta que se migre explícitamente"

related:
  - "[[assistant-card-ui]]"
  - "[[chart-visx-rendering]]"
  - "[[sensor-readings-display]]"
affects: []
adrs: []
scope:
  - "src/components/dashboard/dashboard-grid.tsx"
verified_at: null

created: "2026-05-25"
updated: "2026-05-25"
tags: [capability-spec]
---

# Reorganización del layout bento del dashboard

## Purpose

El dashboard agrícola muestra múltiples tarjetas de información (estado de sensores, gráfico de humedad, chat de suelo, recomendaciones, clima, cronograma de planta) que actualmente no aprovechan el espacio de pantalla de manera óptima. Los componentes se presentan en un grid rígido que deja huecos visibles o apila tarjetas de forma poco jerárquica. Esta spec define la reorganización de `dashboard-grid.tsx` en un layout tipo bento que distribuye las tarjetas según su importancia visual, eliminando huecos y solapamientos en los breakpoints de pantalla habituales del proyecto.

## Requirements

- El sistema SHALL renderizar el dashboard en un layout bento que asigne a cada tarjeta una celda con dimensiones proporcionales a su importancia visual y cantidad de contenido.
- El sistema SHALL incluir en el bento las tarjetas de: panel de estado del sistema, gráfico de humedad de riego, SoilChat, y los demás componentes del dashboard activos.
- El sistema SHALL mantener el componente `FertilizerChart` en el layout (aunque permanezca en Recharts) hasta que sea migrado explícitamente en un cambio posterior.
- El sistema SHALL NOT producir solapamientos entre tarjetas en ningún breakpoint de container query definido en el proyecto.
- El sistema SHALL NOT dejar huecos vacíos visibles que no correspondan a celdas intencionalmente vacías.

## Scenarios

### Scenario: Carga inicial del dashboard en pantalla de escritorio

**GIVEN** el usuario accede al dashboard en un dispositivo con pantalla amplia
**WHEN** la página termina de cargar
**THEN** las tarjetas del dashboard se distribuyen en el grid bento sin solapamientos ni huecos visibles, con el panel de estado, el gráfico de riego y SoilChat ocupando celdas de tamaño apropiado a su contenido

### Scenario: Dashboard en pantalla de menor resolución

**GIVEN** el usuario accede al dashboard desde una pantalla más pequeña o reduce el ancho de la ventana
**WHEN** el layout bento responde al breakpoint de container query correspondiente
**THEN** las tarjetas se reorganizan en columnas o filas adicionales sin solapamientos ni huecos injustificados, y todas las tarjetas permanecen accesibles

### Scenario: FertilizerChart permanece en el layout

**GIVEN** el layout bento está reorganizado y FertilizerChart sigue en su implementación actual de Recharts
**WHEN** el usuario visualiza el dashboard
**THEN** FertilizerChart ocupa su celda en el grid bento y se renderiza correctamente, sin que la reorganización del grid afecte su funcionamiento

## Acceptance Criteria

- [ ] El dashboard se renderiza en un grid bento sin solapamientos entre tarjetas
- [ ] No hay huecos visibles injustificados en el grid en los breakpoints de container query del proyecto
- [ ] El panel de estado del sistema, el gráfico de riego y SoilChat tienen celdas asignadas en el nuevo layout
- [ ] El componente FertilizerChart permanece en el layout (aunque en Recharts) hasta que se migre explícitamente

## Related

- [[assistant-card-ui]] — SoilChat ocupa una celda en este layout bento
- [[chart-visx-rendering]] — El gráfico de riego migrado a visx ocupa una celda en este layout bento
- [[sensor-readings-display]] — El panel de estado del sistema con lecturas de sensores ocupa una celda en este layout bento
