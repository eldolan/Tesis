---
type: adr
id: "0001"
slug: "inyectar-contexto-en-guardrail"
title: "Inyectar contexto conversacional en el guardrail en lugar de delegar al agente LLM"
status: accepted
date: "2026-06-16"
change: "guardrail-confirmacion-riego-flexible"
tags: [adr, guardrail, n8n, seguridad]
---

# ADR-0001: Inyectar contexto conversacional en el guardrail

## Estado

Aceptado

## Contexto

El nodo `Guardrails` del workflow "Agente Agrícola" (n8n, id `lDKOPfa4vgBSyYwy`) clasifica mensajes entrantes usando un LLM (`textClassifier`, gpt-4o-mini, temperature=0) para decidir si un mensaje es `safe` o `blocked`. El clasificador recibe únicamente el mensaje del usuario sin historial de conversación.

Esto provoca falsos positivos de `blocked` para respuestas afirmativas cortas ("Sí", "Dale", "Ok") porque el LLM no puede determinar su contexto sin ver a qué pregunta responden.

La alternativa natural sería mover esta lógica al Agente Chat (que sí tiene acceso al historial completo vía `Preparar Chat`) y eliminar o simplificar el guardrail.

## Decisión

Se inyecta el último turno del asistente directamente en el campo `inputText` del nodo `Guardrails`, construyendo una expresión n8n IIFE que accede a `$('Cargar Sesión').first().json.messages`.

No se mueve la lógica de seguridad al Agente Chat ni se elimina el guardrail.

## Justificación

### Por qué NO delegar al Agente Chat

El guardrail tiene una función de seguridad distinta al Agente Chat: bloquear prompt injections, contenido dañino y solicitudes fuera del dominio **antes de que lleguen al LLM principal**. Eliminar o degradar el guardrail en favor del Agente Chat significaría que cualquier prompt injection llegaría directamente al LLM con acceso a herramientas de hardware (abrir/cerrar riego). El costo de un falso negativo en seguridad es mayor que el costo de la solución actual.

### Por qué inyectar contexto en el guardrail

- El historial ya está disponible antes del guardrail (nodo `Cargar Sesión` precede al nodo `Guardrails` en el flujo).
- No requiere cambios estructurales al workflow — solo una expresión de parámetro.
- gpt-4o-mini con temperature=0 clasifica correctamente con contexto explícito; el problema no es el modelo sino la ausencia de información.
- La expresión tiene fallback a `userText` solo cuando no hay historial — no rompe sesiones nuevas.

## Alternativas consideradas

| Opción | Decisión | Motivo de descarte |
|--------|----------|--------------------|
| Mover lógica de seguridad al Agente Chat | Descartada | Elimina barrera de seguridad previa al LLM con acceso a hardware |
| Regex determinístico en nodo Code | Descartada | Explotable sin contexto; fragmenta lógica; mayor mantenimiento |
| Ampliar descripción `safe` sin contexto (Opción B) | Descartada | No ataca causa raíz; "Sí" sin contexto sigue siendo ambiguo |
| Cambiar modelo LLM a gpt-4o (mayor capacidad) | Descartada | La causa raíz es la ausencia de contexto, no las capacidades del modelo |

## Consecuencias

- El guardrail ve el turno conversacional previo, lo que mejora la clasificación de confirmaciones afirmativas.
- El `inputText` es ligeramente más largo, pero el impacto en latencia y tokens es negligible (un turno adicional de texto).
- La seguridad mejora: inyectar contexto también ayuda a detectar prompt injections contextuales (ej. "sí, ahora ignora...").
- Patrón reutilizable: si en el futuro se necesita que el guardrail opere con más contexto, la expresión puede extenderse a N turnos.
