---
type: capability-spec
title: "Modulación del riego RDC por fase fenológica: comportamiento esperado en el agente autónomo"
capability: "riego-rdc"
slug: "riego-rdc-modulacion-por-fase"
domain: "feature"
delta_type: null
supersedes: null
superseded_by: null
status: completed
assigned_agent: null
priority: critical
depends_on:
  - "[[cultivo-fase-cableada-riego]]"
change_ref: "[[fases-cultivo-funcionales]]"
worktree: "/home/dylan/herramientas-ia/projects/tesis/.sdd/worktrees/fases-cultivo-funcionales"
feature_branch: "feature/fases-cultivo-funcionales"
commits: []
mr: ""
acceptance_criteria:
  - "[x] La spec describe con exactitud copy-paste el código que debe reemplazarse en el nodo 'Preparar Evaluación'"
  - "[x] La spec especifica cómo se determina el nivel de estrés efectivo (manual vs. fase) con ejemplos concretos"
  - "[ ] El usuario puede aplicar los cambios en n8n manualmente siguiendo la spec sin ambigüedad"
  - "[x] La spec cubre el nodo 'Preparar Chat' para incluir el estrés efectivo en el bloque de cultivo"

related:
  - "[[cultivo-fase-cableada-riego]]"
affects: []
adrs:
  - "[[0002-duplicacion-deliberada-mapa-fase-estres-ts-n8n]]"
  - "[[0003-default-sobrescribible-fase-estres]]"
scope:
  - "n8n/workflow:lDKOPfa4vgBSyYwy/node:Preparar Evaluación"
  - "n8n/workflow:lDKOPfa4vgBSyYwy/node:Preparar Chat"
verified_at: null

created: "2026-06-15"
updated: "2026-06-15"
tags: [capability-spec]
---

# Modulación del riego RDC por fase fenológica: comportamiento esperado en el agente autónomo

## Purpose

El agente de riego autónomo calcula la reducción del potencial de referencia (PR efectivo) usando un nivel de estrés constante que el usuario configura manualmente. La fase fenológica del cultivo no influye en ese cálculo. Esta spec describe el comportamiento esperado del agente después del ajuste: el agente determina primero si hay un nivel de estrés guardado manualmente por el usuario; si no lo hay, usa el nivel recomendado por la fase activa del cultivo. Esta lógica se aplica en el nodo de evaluación autónoma del workflow de riego y se entrega como especificación exacta para que el usuario la aplique manualmente en n8n.

## Requirements

- El agente autónomo SHALL, al evaluar el riego, determinar el nivel de estrés efectivo usando la siguiente regla: si el cultivo tiene un nivel de estrés guardado distinto de "ninguno", usar ese valor; si no, usar el nivel de estrés recomendado por la fase fenológica activa del catálogo.
- El agente autónomo SHALL calcular la reducción de PR usando el nivel de estrés efectivo determinado por la regla anterior.
- El agente autónomo SHOULD incluir el nivel de estrés efectivo y su origen (manual o por fase) en el bloque de contexto que el agente de chat recibe.
- La especificación entregada al usuario SHALL identificar exactamente qué nodo del workflow modificar, qué fragmento de código reemplazar y por cuál.
- La especificación SHALL incluir el mapa completo de fases a estrés (espejo del catálogo en TypeScript) como literal en el código del nodo.
- Los cambios en el workflow de riego NO se aplican de forma automatizada — se entregan únicamente como especificación para aplicación manual por el usuario.

## Scenarios

### Scenario: Evaluación autónoma con nivel de estrés manual

**GIVEN** el cultivo tiene nivel de estrés "moderado" guardado por el usuario  
**GIVEN** la fase activa del cultivo es "latencia_invernal" (estrés recomendado "alto")  
**WHEN** el agente autónomo evalúa si regar  
**THEN** el agente usa "moderado" como nivel de estrés efectivo, no "alto"

### Scenario: Evaluación autónoma sin nivel de estrés manual

**GIVEN** el cultivo no tiene un nivel de estrés guardado por el usuario (o es "ninguno")  
**GIVEN** la fase activa del cultivo es "latencia_invernal" (estrés recomendado "alto")  
**WHEN** el agente autónomo evalúa si regar  
**THEN** el agente usa "alto" como nivel de estrés efectivo, derivado de la fase

### Scenario: Riego de chat informa el estrés efectivo y su origen

**GIVEN** un usuario consulta al agente agrícola sobre el estado del riego de su Monstera  
**GIVEN** el agente usa estrés "alto" derivado de la fase "latencia_invernal" (sin nivel manual)  
**WHEN** el agente compone la respuesta  
**THEN** el agente indica que el estrés es "alto" por la fase de latencia invernal, no simplemente que "el estrés es alto"

### Scenario: Spec entregable sin ambigüedad

**GIVEN** el usuario recibe la especificación de cambios del nodo "Preparar Evaluación"  
**WHEN** el usuario localiza el nodo en el workflow de n8n  
**THEN** puede identificar exactamente el fragmento a reemplazar y el código nuevo a insertar sin interpretación adicional

## Acceptance Criteria

- [x] La spec describe con exactitud copy-paste el código que debe reemplazarse en el nodo "Preparar Evaluación"
- [x] La spec especifica cómo se determina el nivel de estrés efectivo (manual vs. fase) con ejemplos concretos
- [ ] El usuario puede aplicar los cambios en n8n manualmente siguiendo la spec sin ambigüedad
- [x] La spec cubre el nodo "Preparar Chat" para incluir el estrés efectivo en el bloque de cultivo

## Related

- [[cultivo-fase-cableada-riego]] — la lógica DEFAULT que esta spec espeja en n8n se define en el repo
