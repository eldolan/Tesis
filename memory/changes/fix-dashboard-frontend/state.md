---
type: change-state
change_name: "fix-dashboard-frontend"
domain: "fix"
status: completed
fast_path: "full"
current_phase: ""
phases_completed: [sdd-init, sdd-explore, sdd-propose, sdd-spec, sdd-design, sdd-tasks, sdd-apply, sdd-verify]
spec_refs:
  - "[[irrigation-chart-y-scale]]"
  - "[[irrigation-chart-sensor-gaps]]"
  - "[[notifications-display-and-read]]"
  - "[[realtime-connection-state]]"
  - "[[system-health-overall]]"
worktree: "/home/dylan/herramientas-ia/projects/tesis/.sdd/worktrees/fix-dashboard-frontend"
feature_branch: "feature/fix-dashboard-frontend"
integration_target: "develop"
mr: ""
mr_status: pending
mr_error: ""
created: "2026-05-24"
updated: "2026-05-24"
mr_url: ""
commits: ["9e87b0f", "c289c30", "ff12273"]
tasks: "memory/changes/fix-dashboard-frontend/tasks.md"
design: "memory/changes/fix-dashboard-frontend/design.md"
exploration: "memory/changes/fix-dashboard-frontend/exploration.md"
tags: [change]
---

## Intent

Arreglar bugs del frontend del panel de tesis (dashboard): (1) gráficos de riego no muestran correctamente la humedad en vistas "sumatoria" y "apilado" — valores en 0 con saltos extraños, y el apilado usa escala 0-4 en vez de 0-100; (2) notificaciones almacenadas en Supabase pero no mostradas a los usuarios (falta integrar la UI); (3) indicador de conexión realtime aparece "desconectado" — entender qué define el estado conectado/desconectado; (4) sensores se muestran OK (sin cambio); (5) "salud general" dice "parcial" — entender qué maneja ese estado. current_phase tras init debe quedar en `sdd-explore`.
