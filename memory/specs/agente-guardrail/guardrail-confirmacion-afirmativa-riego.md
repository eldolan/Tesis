---
type: capability-spec
title: "Guardrail: confirmación afirmativa corta en contexto de riego pasa el filtro"
capability: "agente-guardrail"
slug: "guardrail-confirmacion-afirmativa-riego"
domain: "fix"
delta_type: null
supersedes: null
superseded_by: null
status: completed
assigned_agent: "sdd-apply"
priority: high
depends_on: []
change_ref: "[[guardrail-confirmacion-riego-flexible]]"
worktree: ""
feature_branch: ""
commits: []
mr: ""
acceptance_criteria:
  - "Respuesta afirmativa corta ('Sí, hazlo') tras pregunta de riego del asistente se clasifica como safe"
  - "Respuesta 'dale' o 'ok' tras pregunta de riego del asistente se clasifica como safe"
  - "El flujo continúa hacia el agente sin ser bloqueado"

# Interconnection graph
related:
  - "[[guardrail-afirmacion-sin-contexto]]"
  - "[[guardrail-seguridad-anti-regresion]]"
affects:
  - "[[guardrail-afirmacion-sin-contexto]]"
  - "[[guardrail-seguridad-anti-regresion]]"
adrs:
  - "[[0001-inyectar-contexto-en-guardrail]]"
scope:
  - "n8n/workflow:lDKOPfa4vgBSyYwy/node:c5dba1b4"
verified_at: "2026-06-16"

created: "2026-06-16"
updated: "2026-06-16"
mr: ""
tags: [capability-spec, agente-guardrail, riego]
---

# Guardrail: confirmación afirmativa corta en contexto de riego pasa el filtro

## Purpose

El guardrail del agente agrícola bloquea incorrectamente las respuestas de confirmación cortas del usuario ("Sí, hazlo", "Dale", "Ok") cuando estas son la respuesta esperada a una pregunta de riego que el asistente formuló en el turno anterior. Este comportamiento interrumpe el flujo normal de confirmación de riego. La spec define que, cuando el asistente preguntó previamente sobre riego y el usuario responde con una afirmación corta, el guardrail debe permitir el paso del mensaje.

## Requirements

- El sistema SHALL clasificar como `safe` una respuesta afirmativa corta cuando el último turno del asistente fue una pregunta sobre riego o sobre el sistema agrícola.
- El sistema SHALL alimentar el guardrail con el último turno del asistente más el mensaje actual del usuario, de modo que el clasificador tenga contexto conversacional suficiente para decidir.
- El sistema SHALL reconocer como confirmaciones afirmativas válidas en contexto de riego las expresiones: "sí", "dale", "ok", "claro", "adelante", "confirmo", "hazlo", "sí hazlo", "sí por favor", "listo", "de acuerdo".

## Scenarios

### Scenario: Confirmación explícita tras pregunta de abrir riego

**GIVEN** el asistente preguntó en el turno anterior "¿Deseas que abra el riego ahora?"
**WHEN** el usuario responde "Sí, hazlo"
**THEN** el guardrail clasifica el mensaje como `safe` y el flujo continúa hacia el agente

### Scenario: Confirmación coloquial ("dale") tras pregunta de riego

**GIVEN** el asistente preguntó en el turno anterior sobre activar el sistema de riego
**WHEN** el usuario responde "dale"
**THEN** el guardrail clasifica el mensaje como `safe`

### Scenario: Confirmación neutra ("ok") en contexto de detener riego

**GIVEN** el asistente preguntó si el usuario desea cerrar el riego
**WHEN** el usuario responde "ok"
**THEN** el guardrail clasifica el mensaje como `safe`

## Acceptance Criteria

- [ ] Respuesta "Sí, hazlo" precedida de una pregunta de riego del asistente se clasifica `safe`
- [ ] Respuesta "dale" precedida de una pregunta de riego del asistente se clasifica `safe`
- [ ] Respuesta "ok" precedida de una pregunta de riego del asistente se clasifica `safe`
- [ ] El flujo post-guardrail continúa sin interrupción hacia el agente de chat

## Related

- [[guardrail-afirmacion-sin-contexto]] — caso borde cuando no hay turno previo del asistente
- [[guardrail-seguridad-anti-regresion]] — verifica que la seguridad no se degradó con el cambio
