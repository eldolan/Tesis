---
type: capability-spec
title: "Estado de riego en tiempo real al actuar desde el chat del agente"
capability: "riego-estado-realtime"
slug: "riego-estado-realtime-inmediato-desde-agente"
domain: "fix"
delta_type: null
supersedes: null
superseded_by: null
status: completed
assigned_agent: "sdd-apply"
priority: high
depends_on: []
change_ref: "[[estado-riego-no-actualiza-tras-agente-chat]]"
worktree: "/home/dylan/herramientas-ia/projects/tesis/.sdd/worktrees/estado-riego-no-actualiza-tras-agente-chat"
feature_branch: "feature/estado-riego-no-actualiza-tras-agente-chat"
commits: []
mr: ""
acceptance_criteria:
  - "[ ] Al ordenar al agente abrir el riego, el panel del dashboard cambia a 'Regando' en menos de 2 segundos"
  - "[ ] Al ordenar al agente cerrar el riego, el panel del dashboard cambia a 'Inactivo' en menos de 2 segundos"
  - "[ ] El gráfico de humedad no muestra puntos con valor 0% provenientes de la señal de control del agente"
  - "[ ] Los períodos de riego calculados en el gráfico no incluyen intervalos generados exclusivamente por la señal de control"
  - "[ ] Si el registro de señal falla en n8n, el riego físico igualmente se ejecuta y el chat responde con normalidad"

related:
  - "[[riego-rdc-modulacion-por-fase]]"
affects:
  - "n8n/workflow:Dv7HENb84Q3d2kdo"
  - "n8n/workflow:3agnzp3kKr688Qn7"
adrs:
  - "[[0001-fila-sintetica-vs-tabla-estado-riego]]"
scope:
  - "n8n/workflow:Dv7HENb84Q3d2kdo"
  - "n8n/workflow:3agnzp3kKr688Qn7"
  - "src/components/dashboard/system-status.tsx"
  - "src/hooks/use-irrigation-data.ts"
  - "src/lib/irrigation-detection.ts"
verified_at: "2026-06-17"

created: "2026-06-16"
updated: "2026-06-17"
tags: [capability-spec]
---

# Estado de riego en tiempo real al actuar desde el chat del agente

## Purpose

Cuando el usuario ordena al agente de chat abrir o cerrar el riego, el dashboard tarda hasta ~5 minutos en reflejar el cambio porque el agente solo controla el enchufe físico pero no notifica a la plataforma. Esta spec define el comportamiento esperado: el dashboard debe mostrar el nuevo estado de riego de forma casi inmediata (en menos de 2 segundos) sin esperar la próxima lectura del hardware, y sin que esa señal de control altere el gráfico de humedad ni los períodos de riego registrados.

## Requirements

- El sistema SHALL reflejar el estado "Regando" en el dashboard dentro de los 2 segundos siguientes a que el agente confirme la apertura del riego.
- El sistema SHALL reflejar el estado "Inactivo" en el dashboard dentro de los 2 segundos siguientes a que el agente confirme el cierre del riego.
- El sistema SHALL excluir la señal de control del agente del gráfico de humedad — el gráfico solo debe mostrar mediciones reales del hardware.
- El sistema SHALL excluir la señal de control del agente del cálculo de períodos de riego activo — los períodos solo deben derivarse de lecturas reales con el enchufe activo.
- El sistema SHALL continuar ejecutando la acción de riego físico aunque el registro de la señal de control falle (no-bloqueante).
- El sistema SHOULD mostrar el estado de riego actualizado también en el fetch inicial, si el dashboard se monta después de que el agente actuó.

## Scenarios

### Scenario: Agente abre el riego y el dashboard refleja el cambio de inmediato

**GIVEN** el dashboard está abierto y muestra el estado de riego "Inactivo"
**WHEN** el usuario ordena al agente de chat "abre el riego" y el agente confirma la acción
**THEN** el panel de estado cambia a "Regando" en menos de 2 segundos, sin necesidad de recargar la página ni esperar la próxima lectura del sensor

### Scenario: Agente cierra el riego y el dashboard refleja el cambio de inmediato

**GIVEN** el dashboard está abierto y muestra el estado de riego "Regando"
**WHEN** el usuario ordena al agente de chat "cierra el riego" y el agente confirma la acción
**THEN** el panel de estado cambia a "Inactivo" en menos de 2 segundos, sin necesidad de recargar la página ni esperar la próxima lectura del sensor

### Scenario: La señal de control no aparece en el gráfico de humedad

**GIVEN** el agente acaba de abrir o cerrar el riego
**WHEN** el usuario observa el gráfico de humedad en el dashboard
**THEN** no aparece ningún punto con humedad 0% ni ningún valor anómalo asociado al momento en que el agente actuó — el gráfico solo muestra mediciones reales del suelo

### Scenario: La señal de control no altera los períodos de riego del gráfico

**GIVEN** el agente emitió una señal de control (apertura o cierre del riego) sin que haya llegado aún una lectura real del hardware
**WHEN** el usuario observa los períodos de riego visualizados en el gráfico histórico
**THEN** no aparece un período de riego basado exclusivamente en la señal de control del agente — los períodos reflejan solo el historial de mediciones reales del hardware

### Scenario: Fallo en el registro de la señal de control no interrumpe el riego

**GIVEN** el agente está ejecutando la apertura o cierre del riego
**WHEN** el intento de registrar la señal de control falla (por ejemplo, por indisponibilidad temporal de la base de datos)
**THEN** el enchufe igualmente cambia de estado, el agente responde al usuario con normalidad, y el dashboard se actualizará cuando llegue la próxima lectura real del hardware (~5 min)

## Acceptance Criteria

- [ ] Al ordenar al agente abrir el riego, el panel del dashboard cambia a "Regando" en menos de 2 segundos
- [ ] Al ordenar al agente cerrar el riego, el panel del dashboard cambia a "Inactivo" en menos de 2 segundos
- [ ] El gráfico de humedad no muestra puntos con valor 0% provenientes de la señal de control del agente
- [ ] Los períodos de riego calculados en el gráfico no incluyen intervalos generados exclusivamente por la señal de control
- [ ] Si el registro de señal falla en n8n, el riego físico igualmente se ejecuta y el chat responde con normalidad

## Related

- [[riego-rdc-modulacion-por-fase]] — spec del agente autónomo; la ruta chat (afectada por este fix) y la ruta autónoma comparten los sub-workflows de apertura/cierre de riego
