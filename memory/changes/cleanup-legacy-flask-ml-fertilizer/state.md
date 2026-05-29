---
type: change-state
change_name: "cleanup-legacy-flask-ml-fertilizer"
domain: "debt"
status: active
fast_path: "spec-first"
current_phase: sdd-verify
phases_completed: [sdd-init, sdd-propose, sdd-spec, sdd-tasks, sdd-apply]
spec_refs:
  - "[[no-flask-legacy-app]]"
  - "[[no-ml-dead-artifacts]]"
  - "[[no-fertilizer-broken-subsystem]]"
scope: ""
worktree: "/home/dylan/herramientas-ia/projects/tesis/.sdd/worktrees/cleanup-legacy-flask-ml-fertilizer"
feature_branch: "feature/cleanup-legacy-flask-ml-fertilizer"
integration_target: "develop"
mr: ""
mr_status: pending
mr_error: ""
created: "2026-05-29"
updated: "2026-05-29"
# sdd-spec completed: 2026-05-29
# sdd-tasks completed: 2026-05-29
# sdd-apply completed: 2026-05-29
tags: [change]
---

## Intent

Eliminar código y artefactos legacy que no forman parte de la arquitectura vigente del proyecto (Next.js 16 + n8n + Supabase):

1. **App Flask legacy**: `app.py`, `wsgi.py`, `panel_control/` (todo el paquete: `__init__.py`, `models.py`, `routes.py`, `static/`, `templates/`), y dependencias Flask en `requirements.txt` si quedan huérfanas.

2. **Artefactos del clasificador Keras** (enfoque ML abandonado a favor de RAG): `clasificador_cultivos.keras`, `coder_etiquetas.pkl`, `escalador_caracteristicas.pkl`, y `city.list.json` (~41 MB, peso muerto versionado).

3. **Subsistema fertilizante/NPK roto**: `src/components/dashboard/fertilizer-chart.tsx`, `src/hooks/use-fertilizer-data.ts`, y la lógica NPK en `src/app/api/upload/route.ts`. El frontend consulta la tabla `sensor_fertilizante` que NO existe en Supabase (widget vacío en silencio).

**Restricción dura**: el destino remoto es GitHub (`eldolan/Tesis`), NUNCA GitLab. No hacer push ni MR sin aprobación explícita del usuario.
