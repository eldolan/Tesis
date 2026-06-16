---
type: capability-spec
title: "Línea de tiempo de fases: íconos completos y fases dinámicas por especie"
capability: "cultivo-fenologia"
slug: "cultivo-plant-timeline-ui"
domain: "feature"
delta_type: null
supersedes: null
superseded_by: null
status: review
assigned_agent: "sdd-apply"
priority: medium
depends_on:
  - "[[cultivo-fases-dinamicas-por-especie]]"
  - "[[cultivo-fase-cableada-riego]]"
change_ref: "[[fases-cultivo-funcionales]]"
worktree: "/home/dylan/herramientas-ia/projects/tesis/.sdd/worktrees/fases-cultivo-funcionales"
feature_branch: "feature/fases-cultivo-funcionales"
commits:
  - "0cd8662"
mr: ""
acceptance_criteria:
  - "[x] Los íconos de fases en la línea de tiempo no aparecen recortados en ningún tamaño de pantalla"
  - "[x] La línea de tiempo muestra las fases específicas de la especie del cultivo, no un conjunto fijo global"
  - "[x] Al cambiar de fase en la UI, se muestra el estrés recomendado para la nueva fase"
  - "[x] Si una fase no tiene ícono específico definido, se muestra un ícono genérico de fallback en lugar de error"

related:
  - "[[cultivo-fases-dinamicas-por-especie]]"
  - "[[cultivo-fase-cableada-riego]]"
affects: []
adrs:
  - "[[0001-fase-fenologica-string-validada-en-runtime]]"
scope:
  - "src/components/dashboard/plant-timeline.tsx"
verified_at: null

created: "2026-06-15"
updated: "2026-06-15"
tags: [capability-spec]
---

# Línea de tiempo de fases: íconos completos y fases dinámicas por especie

## Purpose

El componente de línea de tiempo de fases del dashboard muestra los íconos de cada fase visualmente recortados en su parte superior, lo que degrada la experiencia visual. Además, la línea de tiempo usa un conjunto fijo de fases idéntico para cualquier especie, ignorando el catálogo dinámico. Esta spec establece el comportamiento correcto: íconos completamente visibles, fases provenientes del catálogo de la especie activa, con fallback de ícono para fases sin imagen definida, y sugerencia de estrés al cambiar de fase.

## Requirements

- El sistema SHALL renderizar los íconos de fases sin recorte visual, independientemente del tamaño de pantalla o del número de fases en la línea de tiempo.
- El sistema SHALL obtener las fases de la especie del cultivo activo usando el catálogo dinámico, en lugar de un conjunto fijo global.
- El sistema SHALL mostrar un ícono genérico de fallback cuando una fase no tiene ícono específico definido, sin generar error ni mostrar espacio vacío.
- El sistema SHALL, al seleccionar una nueva fase, mostrar el nivel de estrés RDC recomendado para esa fase como sugerencia editable.
- El sistema SHOULD mantener el comportamiento visual existente para las fases que ya tienen ícono definido.

## Scenarios

### Scenario: Íconos de fases visibles completos

**GIVEN** un cultivo con 3 o más fases en la línea de tiempo  
**WHEN** el usuario visualiza la sección de fases en el dashboard  
**THEN** todos los íconos de fases se muestran completos, sin recorte en la parte superior ni en ningún otro lado

### Scenario: Fases según especie en la línea de tiempo

**GIVEN** un cultivo configurado como Monstera  
**WHEN** el usuario abre la línea de tiempo de fases  
**THEN** la línea de tiempo muestra las fases propias de la Monstera (ej: crecimiento_activo, latencia_invernal, recuperacion), no las 6 fases genéricas

### Scenario: Ícono de fallback para fase sin imagen

**GIVEN** el catálogo incluye una fase que no tiene un ícono específico asignado  
**WHEN** la línea de tiempo renderiza esa fase  
**THEN** se muestra un ícono genérico de planta en lugar de un espacio vacío o un error

### Scenario: Sugerencia de estrés al seleccionar fase

**GIVEN** el usuario está visualizando la línea de tiempo de un cultivo de Monstera  
**WHEN** el usuario selecciona la fase "latencia_invernal"  
**THEN** la UI muestra el nivel de estrés recomendado para esa fase junto a la opción de confirmar o modificarlo

## Acceptance Criteria

- [x] Los íconos de fases en la línea de tiempo no aparecen recortados en ningún tamaño de pantalla
- [x] La línea de tiempo muestra las fases específicas de la especie del cultivo, no un conjunto fijo global
- [x] Al cambiar de fase en la UI, se muestra el estrés recomendado para la nueva fase
- [x] Si una fase no tiene ícono específico definido, se muestra un ícono genérico de fallback en lugar de error

## Related

- [[cultivo-fases-dinamicas-por-especie]] — provee las fases que debe renderizar la línea de tiempo
- [[cultivo-fase-cableada-riego]] — provee el estrés recomendado que la UI muestra al cambiar de fase
