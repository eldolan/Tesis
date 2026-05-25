---
type: capability-spec
title: "Interfaz de card asistente para SoilChat"
capability: "soil-chat"
slug: "assistant-card-ui"
domain: "feature"
delta_type: null
supersedes: null
superseded_by: null
status: review
assigned_agent: "sdd-apply"
priority: medium
depends_on: []
change_ref: "[[fix-dashboard-realtime-status]]"
worktree: "/home/dylan/herramientas-ia/projects/tesis/.sdd/worktrees/fix-dashboard-realtime-status"
feature_branch: "feature/fix-dashboard-frontend"
commits: ["c6681e3"]
mr: ""
acceptance_criteria:
  - "[x] SoilChat presenta un ícono de asistente centrado en la cabecera de la card"
  - "[x] La card muestra un saludo personalizado con el nombre del usuario; si no está disponible, usa el prefijo del email; si tampoco está disponible, usa un saludo genérico"
  - "[x] La card muestra badges de sugerencias agrícolas fijas (3-4 preguntas) que el usuario puede seleccionar para iniciar una consulta"
  - "[x] El campo de texto para escribir mensajes es un textarea con barra de acciones inferior"
  - "[x] El flujo de mensajes hacia /api/chat y la respuesta en markdown se conservan sin cambios"
  - "[x] No existe selector de modelo de lenguaje en la interfaz"
  - "[x] No existe botón de adjuntar archivos ni control de audio en la interfaz"

related:
  - "[[dashboard-bento-grid]]"
affects: []
adrs: []
scope:
  - "src/components/dashboard/soil-chat.tsx"
verified_at: null

created: "2026-05-25"
updated: "2026-05-25"
tags: [capability-spec]
---

# Interfaz de card asistente para SoilChat

## Purpose

SoilChat es el asistente agrícola del dashboard que permite al usuario hacer consultas sobre sus cultivos y recibir recomendaciones generadas por inteligencia artificial vía n8n. La interfaz actual del chat es genérica y no refleja el propósito agrícola del asistente ni facilita el inicio de una conversación para usuarios que no saben qué preguntar. Esta spec redefine la presentación de SoilChat como una card de asistente especializado: con identidad visual propia (ícono), saludo personalizado con el nombre del agricultor, sugerencias de consultas agrícolas frecuentes y un área de escritura más cómoda, todo conservando la integración existente con el backend de mensajería.

## Requirements

- El sistema SHALL mostrar un ícono de asistente en la cabecera de la card de SoilChat.
- El sistema SHALL mostrar un saludo personalizado usando el nombre completo del usuario autenticado.
- El sistema SHALL usar el prefijo del correo electrónico del usuario como saludo de respaldo cuando el nombre completo no esté disponible.
- El sistema SHALL usar un saludo genérico (ej. "¡Hola!") como último recurso cuando ni el nombre ni el correo estén disponibles.
- El sistema SHALL mostrar entre 3 y 4 badges de sugerencias de consultas agrícolas con texto fijo (no rotatorio), seleccionables para iniciar una conversación.
- El sistema SHALL proporcionar un campo de texto tipo textarea para redactar mensajes, acompañado de una barra de acciones en la parte inferior.
- El sistema SHALL conservar el flujo de envío de mensajes al endpoint `/api/chat` que conecta con n8n.
- El sistema SHALL conservar el renderizado de las respuestas del asistente en formato markdown.
- El sistema SHALL NOT incluir ningún selector de modelo de lenguaje en la interfaz.
- El sistema SHALL NOT incluir ningún control para adjuntar archivos ni para entrada o salida de audio.

## Scenarios

### Scenario: Usuario con nombre registrado

**GIVEN** el usuario autenticado tiene un nombre completo configurado en su perfil
**WHEN** accede al dashboard y observa la card de SoilChat
**THEN** la card muestra un saludo personalizado con el nombre del usuario (ej. "¡Hola, Juan García!") y presenta el ícono de asistente y los badges de sugerencias

### Scenario: Usuario sin nombre pero con correo electrónico

**GIVEN** el usuario autenticado no tiene nombre registrado en su perfil pero sí tiene correo electrónico
**WHEN** accede al dashboard y observa la card de SoilChat
**THEN** la card muestra un saludo usando el prefijo del correo (ej. si el correo es agricultor@campo.cl, el saludo es "¡Hola, agricultor!")

### Scenario: Usuario selecciona un badge de sugerencia

**GIVEN** el usuario ve los badges de sugerencias agrícolas en la card de SoilChat
**WHEN** hace clic en uno de los badges (ej. "¿Cuándo debo regar?")
**THEN** el texto de la sugerencia se coloca en el campo de escritura, listo para que el usuario lo envíe o modifique

### Scenario: Usuario envía un mensaje y recibe respuesta con markdown

**GIVEN** el usuario escribe una consulta en el textarea de SoilChat y la envía
**WHEN** el backend procesa la consulta y devuelve una respuesta con formato markdown
**THEN** la respuesta del asistente se muestra con el formato markdown renderizado (negritas, listas, etc.) en el área de conversación

### Scenario: La interfaz no ofrece opciones fuera de alcance

**GIVEN** el usuario accede a la card de SoilChat
**WHEN** explora toda la interfaz
**THEN** no encuentra ningún selector de modelo, botón de adjuntar archivos ni control de audio; solo ve el ícono del asistente, el saludo, los badges de sugerencias y el área de escritura con la barra de acciones

## Acceptance Criteria

- [ ] SoilChat presenta un ícono de asistente centrado en la cabecera de la card
- [ ] La card muestra un saludo personalizado con el nombre del usuario; si no está disponible, usa el prefijo del email; si tampoco está disponible, usa un saludo genérico
- [ ] La card muestra badges de sugerencias agrícolas fijas (3-4 preguntas) que el usuario puede seleccionar para iniciar una consulta
- [ ] El campo de texto para escribir mensajes es un textarea con barra de acciones inferior
- [ ] El flujo de mensajes hacia /api/chat y la respuesta en markdown se conservan sin cambios
- [ ] No existe selector de modelo de lenguaje en la interfaz
- [ ] No existe botón de adjuntar archivos ni control de audio en la interfaz

## Related

- [[dashboard-bento-grid]] — SoilChat ocupa una celda en el layout bento reorganizado del dashboard
