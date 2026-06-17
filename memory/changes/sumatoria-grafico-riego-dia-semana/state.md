---
type: change-state
change_name: "sumatoria-grafico-riego-dia-semana"
domain: "fix"
status: completed
fast_path: "full"
current_phase: ""
phases_completed: [sdd-explore, sdd-propose, sdd-design, sdd-spec, sdd-tasks, sdd-apply, sdd-verify]
approved_approach: "Opcion 1 — expandir dominio del YAxis a [min(yDomain[0],40), max(yDomain[1],100)] cuando viewMode === sum, para que las bandas agronomicas se vean en todos los periodos"
spec_refs: ["[[riego-dashboard-bandas-agronomicas-visibles-modo-sum]]"]
scope: ""
worktree: "/home/dylan/herramientas-ia/projects/tesis/.sdd/worktrees/sumatoria-grafico-riego-dia-semana"
feature_branch: "feature/sumatoria-grafico-riego-dia-semana"
integration_target: "develop"
mr: ""
mr_url: ""
mr_status: pending
mr_error: ""
created: "2026-06-17"
updated: "2026-06-17"
verify_artifact: "memory/changes/sumatoria-grafico-riego-dia-semana/verify-report.md"
tasks_artifact: "memory/changes/sumatoria-grafico-riego-dia-semana/tasks.md"

design_artifact: "memory/changes/sumatoria-grafico-riego-dia-semana/design.md"
tags: [change]
---

## Intent

En el gráfico de riego del dashboard, la sumatoria (total) solo se muestra en las vistas de mes y año. En las vistas diaria y semanal no aparece la sumatoria. Corregir para que la sumatoria también se muestre en las vistas diaria y semanal.
