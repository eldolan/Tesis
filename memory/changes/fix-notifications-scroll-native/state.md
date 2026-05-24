---
type: change-state
change_name: "fix-notifications-scroll-native"
domain: "fix"
status: active
fast_path: "apply-only"
current_phase: sdd-verify
phases_completed: [sdd-init, sdd-apply]
spec_refs: []
scope: ""
worktree: "/home/dylan/herramientas-ia/projects/tesis/.sdd/worktrees/fix-notifications-scroll-native"
feature_branch: "feature/fix-dashboard-frontend"
integration_target: "develop"
mr: ""
mr_status: pending
mr_error: ""
created: "2026-05-24"
updated: "2026-05-24"
# phases_completed updated by sdd-apply 2026-05-24
tags: [change]
---

## Intent

El popover de notificaciones (commit a6b6801) ya no hace overflow pero NO scrollea. Reemplazar el wrapper max-h+overflow-hidden+ScrollArea h-full por un contenedor de scroll nativo (max-h-[320px] overflow-y-auto en el mismo div). 1 archivo: src/components/dashboard/notifications-popover.tsx.
