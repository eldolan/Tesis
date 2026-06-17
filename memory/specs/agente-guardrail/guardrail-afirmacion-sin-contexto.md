---
type: capability-spec
title: "Guardrail: afirmación sin historial previo no ejecuta acción sensible"
capability: "agente-guardrail"
slug: "guardrail-afirmacion-sin-contexto"
domain: "fix"
delta_type: null
supersedes: null
superseded_by: null
status: completed
assigned_agent: "sdd-apply"
priority: high
depends_on:
  - "[[guardrail-confirmacion-afirmativa-riego]]"
change_ref: "[[guardrail-confirmacion-riego-flexible]]"
worktree: ""
feature_branch: ""
commits: []
mr: ""
acceptance_criteria:
  - "Mensaje 'Sí' enviado en sesión nueva sin historial previo no pasa como confirmación de riego"
  - "El fallback a solo el texto del usuario mantiene el comportamiento conservador del guardrail"

# Interconnection graph
related:
  - "[[guardrail-confirmacion-afirmativa-riego]]"
  - "[[guardrail-seguridad-anti-regresion]]"
affects: []
adrs:
  - "[[0001-inyectar-contexto-en-guardrail]]"
scope:
  - "n8n/workflow:lDKOPfa4vgBSyYwy/node:c5dba1b4"
  - "n8n/workflow:lDKOPfa4vgBSyYwy/node:863db73b"
verified_at: "2026-06-16"

created: "2026-06-16"
updated: "2026-06-16"
mr: ""
tags: [capability-spec, agente-guardrail, seguridad, fallback]
---

# Guardrail: afirmación sin historial previo no ejecuta acción sensible

## Purpose

Cuando un usuario inicia una sesión nueva y envía una afirmación corta ("Sí") como primer mensaje, sin que el asistente haya formulado ninguna pregunta de riego previamente, el guardrail no debe interpretarlo como una confirmación de riego. Esta spec establece el comportamiento de fallback seguro para el caso en que no existe historial conversacional disponible.

## Requirements

- El sistema SHALL operar con solo el texto del usuario como entrada del guardrail cuando no existe historial de conversación para la sesión actual.
- El sistema SHALL clasificar como `blocked` (o no-confirmación-de-riego) una afirmación corta aislada que no tenga contexto conversacional previo de riego.
- El sistema SHOULD manejar el historial vacío sin arrojar errores de expresión ni interrumpir el flujo.

## Scenarios

### Scenario: Primer mensaje de sesión nueva con afirmación corta

**GIVEN** el usuario inicia una sesión nueva sin ningún intercambio previo con el asistente
**WHEN** el usuario envía "Sí" como primer mensaje
**THEN** el guardrail evalúa la afirmación sin contexto de riego y la clasifica como `blocked`

### Scenario: Afirmación espontánea sin pregunta de riego pendiente

**GIVEN** el historial de conversación existe pero el asistente no realizó ninguna pregunta sobre riego en su último turno
**WHEN** el usuario envía "dale"
**THEN** el guardrail no interpreta el mensaje como confirmación de riego; el sistema no ejecuta ninguna acción sobre el riego

### Scenario: Historial vacío no produce error de sistema

**GIVEN** no existe registro de sesión en el sistema para el identificador de sesión actual
**WHEN** el usuario envía cualquier mensaje
**THEN** el guardrail procesa el mensaje usando únicamente el texto del usuario, sin errores de ejecución

## Acceptance Criteria

- [ ] Mensaje "Sí" en sesión nueva (sin historial) se clasifica como `blocked`
- [ ] La ausencia de historial no genera errores en el flujo del agente
- [ ] El comportamiento de fallback es idéntico al comportamiento anterior al cambio (solo texto del usuario)

## Related

- [[guardrail-confirmacion-afirmativa-riego]] — caso nominal con historial de riego disponible
- [[guardrail-seguridad-anti-regresion]] — cobertura general de seguridad y no-regresión
