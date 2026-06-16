---
type: capability-spec
title: "Cobertura de fases fenológicas de Monstera en el RAG del agente agrícola"
capability: "rag-fases-monstera"
slug: "rag-fases-monstera-cobertura"
domain: "feature"
delta_type: null
supersedes: null
superseded_by: null
status: review
assigned_agent: "sdd-apply"
priority: high
depends_on:
  - "[[cultivo-fases-dinamicas-por-especie]]"
change_ref: "[[fases-cultivo-funcionales]]"
worktree: "/home/dylan/herramientas-ia/projects/tesis/.sdd/worktrees/fases-cultivo-funcionales"
feature_branch: "feature/fases-cultivo-funcionales"
commits: []
mr: ""
acceptance_criteria:
  - "[ ] El documento de Monstera en el repositorio incluye una sección de fases fenológicas con estrés RDC por fase"
  - "[ ] Las 3 fases de Monstera (crecimiento_activo, latencia_invernal, recuperacion) están documentadas con señales de diagnóstico y duración típica"
  - "[ ] El criterio de estrés RDC por fase está marcado como 'criterio adaptado' dado que no hay bibliografía RDC consolidada para Monstera"
  - "[ ] Antes de re-embeber, los chunks del documento previo de Monstera son eliminados del vector store"
  - "[ ] Tras re-embeber, el agente agrícola puede responder preguntas sobre las fases fenológicas de Monstera y su relación con el riego"

related:
  - "[[cultivo-fases-dinamicas-por-especie]]"
affects: []
adrs: []
scope:
  - "embeddings/monsteras.md"
verified_at: null

created: "2026-06-15"
updated: "2026-06-15"
tags: [capability-spec]
---

# Cobertura de fases fenológicas de Monstera en el RAG del agente agrícola

## Purpose

El agente agrícola consulta una base de conocimiento vectorial (RAG) para responder preguntas sobre el cultivo de plantas. El documento de Monstera existente describe el riego ecofisiológico de la especie pero no contiene información sobre sus fases fenológicas ni sobre el nivel de estrés hídrico recomendado por fase. Esto impide que el agente dé recomendaciones ajustadas al momento del ciclo de la planta. Esta spec establece que el documento de Monstera se amplía con una sección de fases fenológicas y su estrés RDC asociado, y que esa sección queda disponible en el vector store para las consultas del agente.

## Requirements

- El sistema SHALL incorporar al documento de Monstera una sección que describa las fases fenológicas de la especie con su estrés hídrico RDC recomendado por fase.
- El sistema SHALL documentar al menos 3 fases para Monstera: crecimiento activo, latencia invernal y recuperación.
- El sistema SHALL incluir para cada fase: el nivel de estrés RDC recomendado, las señales de diagnóstico observables en la planta, y la duración típica de la fase.
- El sistema SHALL marcar explícitamente que el criterio de estrés RDC por fase es adaptado (derivado del comportamiento estacional documentado) dado que no existe bibliografía RDC consolidada para Monstera.
- El sistema SHALL eliminar los fragmentos vectoriales previos del documento de Monstera antes de re-embeber, para evitar contenido duplicado u obsoleto en el vector store.
- El sistema SHALL re-embeber el documento actualizado de modo que los nuevos fragmentos queden disponibles para las consultas del agente agrícola.
- El sistema SHOULD mantener la coherencia entre el catálogo de fases de Monstera en TypeScript y las fases documentadas en el RAG (mismos identificadores de fase).

## Scenarios

### Scenario: Agente responde sobre fase activa de Monstera

**GIVEN** el vector store contiene la sección de fases de Monstera actualizada  
**WHEN** el usuario pregunta al agente qué nivel de riego aplica para una Monstera en fase de latencia invernal  
**THEN** el agente recupera la información de la fase y responde con el estrés recomendado y las señales de diagnóstico relevantes

### Scenario: Sección de fases disponible sin fragmentos duplicados

**GIVEN** el vector store anteriormente contenía fragmentos del documento de Monstera sin información de fases  
**WHEN** se completa el proceso de re-embebido del documento actualizado  
**THEN** el vector store contiene únicamente fragmentos del documento actualizado, sin duplicados del contenido previo

### Scenario: Criterio adaptado identificable en el RAG

**GIVEN** el agente recupera un fragmento sobre el estrés RDC de la fase de latencia invernal de Monstera  
**WHEN** el usuario pregunta sobre la fuente de esa recomendación  
**THEN** el agente puede indicar que es criterio adaptado del riego estacional documentado, no una referencia bibliográfica RDC directa

### Scenario: Coherencia de identificadores de fase entre RAG y catálogo

**GIVEN** el catálogo en TypeScript define la fase "crecimiento_activo" para Monstera  
**WHEN** el agente recupera información de fases de Monstera del vector store  
**THEN** el documento del RAG usa el mismo identificador "crecimiento_activo" para referirse a esa fase

## Acceptance Criteria

- [ ] El documento de Monstera en el repositorio incluye una sección de fases fenológicas con estrés RDC por fase
- [ ] Las 3 fases de Monstera (crecimiento_activo, latencia_invernal, recuperacion) están documentadas con señales de diagnóstico y duración típica
- [ ] El criterio de estrés RDC por fase está marcado como "criterio adaptado" dado que no hay bibliografía RDC consolidada para Monstera
- [ ] Antes de re-embeber, los chunks del documento previo de Monstera son eliminados del vector store
- [ ] Tras re-embeber, el agente agrícola puede responder preguntas sobre las fases fenológicas de Monstera y su relación con el riego

## Related

- [[cultivo-fases-dinamicas-por-especie]] — el catálogo de fases de Monstera en TypeScript debe ser coherente con los identificadores documentados en el RAG
