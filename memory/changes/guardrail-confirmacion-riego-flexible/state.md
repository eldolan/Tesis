---
type: change-state
change_name: "guardrail-confirmacion-riego-flexible"
domain: fix
status: completed
fast_path: full
current_phase: ""
phases_completed: [sdd-explore, sdd-propose, sdd-design, sdd-spec, sdd-tasks, sdd-apply, sdd-verify, sdd-archive]
approved_approach: "C — inyectar contexto conversacional (ultimo turno del asistente + mensaje actual) en inputText del clasificador + ampliar descripcion de la categoria safe"
spec_refs:
  - "[[guardrail-confirmacion-afirmativa-riego]]"
  - "[[guardrail-afirmacion-sin-contexto]]"
  - "[[guardrail-seguridad-anti-regresion]]"
scope: ""
worktree: "/home/dylan/herramientas-ia/projects/tesis/.sdd/worktrees/guardrail-confirmacion-riego-flexible"
feature_branch: "feature/guardrail-confirmacion-riego-flexible"
integration_target: "develop"
mr: ""
mr_url: ""
mr_status: pending
mr_error: ""
created: "2026-06-16"
updated: "2026-06-16T10:00:00"
tags: [change]
---

## Intent

El guardrail del agente de chat bloquea confirmaciones afirmativas simples. Cuando el LLM pregunta si se quiere iniciar/detener el riego y el usuario responde 'Sí, hazlo' (u otras confirmaciones cortas), el guardrail actual lo bloquea porque es demasiado literal/simple. Investigar el guardrail actual en n8n via MCP y mejorarlo para que reconozca confirmaciones afirmativas en contexto sin perder su función de seguridad.
