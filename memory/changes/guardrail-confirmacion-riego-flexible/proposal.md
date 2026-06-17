---
type: proposal
change_name: "guardrail-confirmacion-riego-flexible"
domain: fix
status: pending-approval
iteration: 1
created: "2026-06-16"
updated: "2026-06-16"
tags: [proposal]
---

# Propuesta: guardrail-confirmacion-riego-flexible

## Intent

El guardrail del Agente Agrícola bloquea respuestas afirmativas cortas ("Sí, hazlo", "Dale", "Ok") porque el nodo `textClassifier` recibe únicamente el mensaje actual del usuario, sin historial de conversación. Al carecer de contexto, gpt-4o-mini (temperature=0) clasifica estas frases como ambiguas y cae en `blocked`. La corrección consiste en alimentar el guardrail con el último turno del asistente + el mensaje actual, y precisar la descripción de `safe` para afirmaciones explícitas dentro de un contexto agrícola confirmado.

## Scope

**Incluye:**
- Nodo `Guardrails` (`b3d72947`): cambiar la expresión `inputText` para incluir el último mensaje del asistente desde `Cargar Sesión` + el mensaje actual.
- Nodo `Guardrails` (`b3d72947`): ampliar descripción de la categoría `safe` para reconocer afirmaciones cortas en contexto de riego.
- Manejo del caso borde: historial vacío (primera sesión) → fallback a solo `userText`.

**Excluye explícitamente:**
- Cambios en el nodo `LLM Guardrails` (`75984704`) — el modelo gpt-4o-mini y temperature=0 son adecuados con el contexto correcto.
- Cambios en `Auth`, `Preparar Chat`, `Agente Chat` o sub-workflows de riego.
- Refactoring de credentials hardcodeadas (deuda técnica registrada en observations.md, scope separado).
- Cambios en el nodo `Clasificar Consulta` ni en el flujo post-guardrail.

## Approach Propuesto (C: Contexto + Descripción mejorada)

**Opción A** (solo contexto, XS): Añadir el último turno del asistente al `inputText`. Simple y efectivo, pero sin mejora a la heurística de clasificación.

**Opción B** (solo descripción, XS): Listar explícitamente afirmaciones cortas en `safe`. Mínima intervención, pero no ataca la causa raíz y puede engañarse sin contexto previo.

**Opción C — recomendada** (contexto + descripción, S): Combinar A + B. El `inputText` del nodo `Guardrails` se reemplaza por una expresión n8n que concatena:
1. El último mensaje del asistente desde el historial de `Cargar Sesión` (si existe).
2. El mensaje actual del usuario (`$('Auth').first().json.userText`).

La descripción de `safe` se amplía para reconocer afirmaciones cortas ("sí", "dale", "ok", "confirmo", "adelante", "sí hazlo") **cuando están precedidas de una pregunta del asistente sobre riego**. El guardrail mantiene el principio de seguridad: ante ambigüedad o negación, sigue bloqueando; solo confirmaciones afirmativas claras en contexto de riego pasan.

**Opción D** (regex + fallback LLM, M): Reemplazar `textClassifier` por un nodo Code. Descartada: fragmenta la lógica, no resuelve la falta de contexto, y agrega mantenimiento innecesario.

## Esfuerzo Estimado

**S** — Un cambio de expresión en `inputText` del nodo Guardrails (requiere construir la expresión n8n con lógica condicional para historial vacío) + ajuste de texto en la descripción de `safe`. Actualización vía n8n MCP (`update_workflow`). Sin cambios estructurales al workflow.

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Historial vacío en primera sesión provoca error de expresión | Media | Usar operador `??` o ternario en la expresión n8n para fallback a string vacío |
| El contexto adicional aumenta latencia del guardrail | Baja | El `textClassifier` agrega ~1 turno de contexto — impacto negligible en tokens |
| Afirmaciones fuera de contexto de riego pasan el guardrail | Baja | El approach C requiere que el contexto previo sea de riego; sin él, la clasificación sigue siendo `blocked` |

## Trade-offs

- **A favor**: Ataca la causa raíz (falta de contexto), no requiere cambios estructurales, el historial ya está disponible antes del guardrail, robusto ante variantes naturales del español.
- **En contra**: La expresión n8n para construir el contexto condicional es ligeramente más compleja que el `inputText` actual; requiere validación con historial vacío.

## Nodos / Recursos Afectados

| Recurso | Cambio |
|---------|--------|
| Workflow `lDKOPfa4vgBSyYwy` ("Agente Agrícola") | Actualizar via `update_workflow` |
| Nodo `Guardrails` (`b3d72947`) — campo `inputText` | Reemplazar expresión por contexto enriquecido |
| Nodo `Guardrails` (`b3d72947`) — descripción `safe` | Ampliar para incluir afirmaciones cortas en contexto de riego |
