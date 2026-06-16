---
type: change-state
change_name: "fases-cultivo-funcionales"
domain: "feature"
status: active
fast_path: "full"
current_phase: sdd-verify
phases_completed: [sdd-init, sdd-explore, sdd-propose, sdd-spec, sdd-design, sdd-tasks, sdd-apply]
spec_refs:
  - "[[cultivo-fases-dinamicas-por-especie]]"
  - "[[cultivo-fase-cableada-riego]]"
  - "[[cultivo-plant-timeline-ui]]"
  - "[[riego-rdc-modulacion-por-fase]]"
  - "[[rag-fases-monstera-cobertura]]"
worktree: "/home/dylan/herramientas-ia/projects/tesis/.sdd/worktrees/fases-cultivo-funcionales"
feature_branch: "feature/fases-cultivo-funcionales"
integration_target: "develop"
mr: ""
mr_status: pending
mr_error: ""
created: "2026-06-15"
updated: "2026-06-15"
apply_completed: "2026-06-15"
tasks_completed: "2026-06-15"
design_completed: "2026-06-15"
spec_completed: "2026-06-15"
explore_completed: "2026-06-15"
propose_completed: "2026-06-15"
tags: [change]
require_judgment: false
skip_judgment: false
---

## Intent

Dejar FUNCIONAL la fase fenológica del cultivo (hoy es cosmética: solo texto en prompts, no afecta ninguna decisión de riego). La fase debe modular el riego según la metodología de "riego de Callejas" descrita en el PDF de la tesis (RDC sobre banda NLL–PR). Hoy la única palanca activa es nivel_estres (constante REDUCCION en el nodo n8n "Preparar Evaluación", espejo de prEfectivo() en src/lib/cultivo.ts); cada fase ya define un estresRecomendado que nadie usa — hay que cablear la fase para que module el riego como indica Callejas.

Además: (a) la fase de cultivo debe ser DINÁMICA por planta/especie (no un enum fijo global de 6 fases iguales para todas); distintas especies tienen fases distintas. (b) La información de fases por planta debe estar en el RAG del Agente Agrícola (n8n); verificar si el RAG ya contiene las fases de las monsteras y, si no, especificar la documentación a añadir. (c) Fix de UI: en src/components/dashboard/plant-timeline.tsx los iconos de las fases se ven levemente cortados arriba — darles mayor altura al contenedor del icono/fila.

Arquitectura conocida: el cerebro de riego vive en n8n (workflow "Agente Agrícola", id lDKOPfa4vgBSyYwy), no en el repo. Ruta autónoma: nodo "Preparar Evaluación". Ruta chat: nodos "Auth" + "Preparar Chat". RAG via nodos "Generar Embedding" + "Buscar Documentos". user_id hardcodeado (7d2cbed5-...) en n8n. El PDF de Callejas está en documentacion/.

## Constraints

1. **Cambios versionables únicamente**: SDD implementa SOLO los cambios versionables del repo (src/lib/cultivo.ts, esquema/tipos, UI, API routes, y documentación RAG como archivos en el repo si aplica).

2. **Sin aplicación directa en n8n via MCP**: Los cambios en workflows n8n NO se aplican vía MCP (los flujos son muy grandes y se podrían dañar). Se ENTREGAN como especificación exacta (qué nodo, qué código, qué reemplazar) para que el usuario los aplique manualmente.

3. **Supabase CLI disponible**: Cambios de base de datos Supabase se pueden aplicar usando el Supabase CLI cuando sea necesario.
