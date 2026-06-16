---
type: capability-spec
title: "Fase fenológica conectada al riego: estrés RDC por defecto sobrescribible"
capability: "cultivo-fenologia"
slug: "cultivo-fase-cableada-riego"
domain: "feature"
delta_type: null
supersedes: null
superseded_by: null
status: review
assigned_agent: "sdd-apply"
priority: critical
depends_on:
  - "[[cultivo-fases-dinamicas-por-especie]]"
change_ref: "[[fases-cultivo-funcionales]]"
worktree: "/home/dylan/herramientas-ia/projects/tesis/.sdd/worktrees/fases-cultivo-funcionales"
feature_branch: "feature/fases-cultivo-funcionales"
commits:
  - "63b1e8c"
  - "0cd8662"
mr: ""
acceptance_criteria:
  - "[x] Al cambiar la fase fenológica, la UI sugiere el nivel de estrés RDC recomendado por esa fase"
  - "[x] El usuario puede aceptar, subir o bajar el nivel de estrés sugerido libremente"
  - "[x] El nivel de estrés guardado manualmente persiste y no es sobreescrito por la fase"
  - "[x] Cuando no hay nivel de estrés guardado por el usuario, el sistema usa el estrés recomendado de la fase activa"
  - "[ ] La spec del nodo n8n 'Preparar Evaluación' documenta exactamente cómo aplicar la lógica DEFAULT en el workflow"

related:
  - "[[cultivo-fases-dinamicas-por-especie]]"
  - "[[riego-rdc-modulacion-por-fase]]"
affects:
  - "[[riego-rdc-modulacion-por-fase]]"
adrs:
  - "[[0003-default-sobrescribible-fase-estres]]"
scope:
  - "src/lib/cultivo.ts"
  - "src/components/dashboard/plant-timeline.tsx"
  - "src/app/api/cultivo/route.ts"
verified_at: null

created: "2026-06-15"
updated: "2026-06-15"
tags: [capability-spec]
---

# Fase fenológica conectada al riego: estrés RDC por defecto sobrescribible

## Purpose

La fase fenológica de un cultivo actualmente es un dato cosmético: aparece en la interfaz y en los prompts del agente, pero no influye en ninguna decisión de riego. Esta spec establece que la fase activa determina un nivel de estrés hídrico recomendado por defecto (basado en la metodología de Callejas), y que ese valor es sugerido al usuario —quien puede ajustarlo libremente— y es usado por el sistema cuando no hay un nivel manual guardado. La semántica es DEFAULT sobrescribible, no piso irrebajable.

## Requirements

- El sistema SHALL leer el nivel de estrés RDC recomendado de la fase fenológica activa del cultivo.
- El sistema SHALL sugerir ese nivel de estrés en la UI cuando el usuario cambia de fase.
- El sistema SHALL permitir que el usuario acepte, suba o baje el estrés sugerido sin restricción.
- El sistema SHALL persistir el nivel de estrés elegido por el usuario.
- El sistema SHALL usar el nivel de estrés guardado por el usuario cuando éste es distinto de "ninguno".
- El sistema SHALL usar el nivel de estrés recomendado por la fase cuando el usuario no ha guardado un nivel explícito (o es "ninguno").
- El sistema SHALL entregar como especificación exacta (no aplicar vía automatización) los cambios necesarios en el nodo de evaluación autónoma del workflow de riego, de modo que el usuario pueda aplicarlos manualmente.
- El sistema SHOULD advertir en la UI cuando el nivel de estrés elegido difiere significativamente del recomendado por la fase.

## Scenarios

### Scenario: Cambio de fase sugiere estrés recomendado

**GIVEN** un cultivo de Monstera en fase "crecimiento_activo" con estrés de riego "moderado"  
**WHEN** el usuario cambia la fase a "latencia_invernal"  
**THEN** la UI muestra el estrés recomendado para "latencia_invernal" como sugerencia, sin forzar el cambio

### Scenario: Usuario acepta el estrés sugerido

**GIVEN** la UI sugiere el estrés "alto" al cambiar a fase "latencia_invernal"  
**WHEN** el usuario confirma la sugerencia  
**THEN** el sistema guarda "alto" como nivel de estrés del cultivo

### Scenario: Usuario sobreescribe el estrés sugerido

**GIVEN** la UI sugiere el estrés "alto" al cambiar a fase "latencia_invernal"  
**WHEN** el usuario elige "moderado" en lugar del sugerido  
**THEN** el sistema guarda "moderado" y no lo sobreescribe por la fase

### Scenario: Riego autónomo sin nivel de estrés manual

**GIVEN** un cultivo cuyo nivel de estrés es "ninguno" y cuya fase activa es "latencia_invernal" con estrés recomendado "alto"  
**WHEN** el sistema evalúa el riego autónomo  
**THEN** el sistema aplica el estrés correspondiente a "alto" para calcular la reducción del PR efectivo

### Scenario: Riego autónomo con nivel de estrés manual guardado

**GIVEN** un cultivo con nivel de estrés "moderado" guardado manualmente y fase "latencia_invernal" (estrés recomendado "alto")  
**WHEN** el sistema evalúa el riego autónomo  
**THEN** el sistema usa "moderado" (el valor manual), no "alto" (el de la fase)

## Acceptance Criteria

- [x] Al cambiar la fase fenológica, la UI sugiere el nivel de estrés RDC recomendado por esa fase
- [x] El usuario puede aceptar, subir o bajar el nivel de estrés sugerido libremente
- [x] El nivel de estrés guardado manualmente persiste y no es sobreescrito por la fase
- [x] Cuando no hay nivel de estrés guardado por el usuario, el sistema usa el estrés recomendado de la fase activa
- [ ] La spec del nodo n8n "Preparar Evaluación" documenta exactamente cómo aplicar la lógica DEFAULT en el workflow

## Related

- [[cultivo-fases-dinamicas-por-especie]] — el catálogo de fases provee el estrés recomendado por fase
- [[riego-rdc-modulacion-por-fase]] — describe el comportamiento esperado del riego en n8n espejo de esta lógica
