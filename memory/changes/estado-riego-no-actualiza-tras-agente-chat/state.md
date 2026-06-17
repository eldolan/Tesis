---
type: change-state
change_name: "estado-riego-no-actualiza-tras-agente-chat"
domain: "fix"
status: completed
fast_path: "full"
current_phase: ""
phases_completed: [sdd-explore, sdd-propose, sdd-design, sdd-spec, sdd-tasks, sdd-apply, sdd-verify, sdd-archive]
approved_approach: "A — n8n inserta fila sintética en sensor_riego_20 (es_evento_riego, es_valido=false) tras acción Tuya"
spec_refs:
  - "[[riego-estado-realtime-inmediato-desde-agente]]"
scope: ""
worktree: "/home/dylan/herramientas-ia/projects/tesis/.sdd/worktrees/estado-riego-no-actualiza-tras-agente-chat"
feature_branch: "feature/estado-riego-no-actualiza-tras-agente-chat"
integration_target: "develop"
mr: ""
mr_status: pending
mr_error: ""
mr_url: ""
created: "2026-06-16"
updated: "2026-06-17"
tags: [change]
---

## Intent

El estado de riego en la página no se actualiza correctamente luego de que el agente del chat (n8n) cierra o abre el riego. Investigar el flujo en n8n via MCP n8n para entender cómo el agente actualiza el estado, y diagnosticar por qué la página no refleja el cambio en tiempo real.

