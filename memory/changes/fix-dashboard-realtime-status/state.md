---
type: change-state
change_name: "fix-dashboard-realtime-status"
domain: feature
status: active
fast_path: full
current_phase: sdd-verify
phases_completed: [sdd-init, sdd-explore, sdd-propose, sdd-spec, sdd-design, sdd-tasks, sdd-apply]
spec_refs:
  - "[[sensor-readings-display]]"
  - "[[ambient-sensor-row]]"
  - "[[irrigation-active-detection]]"
  - "[[chart-visx-rendering]]"
  - "[[assistant-card-ui]]"
  - "[[dashboard-bento-grid]]"
worktree: "/home/dylan/herramientas-ia/projects/tesis/.sdd/worktrees/fix-dashboard-realtime-status"
feature_branch: "feature/fix-dashboard-frontend"
integration_target: develop
mr: ""
mr_status: pending
mr_error: ""
created: "2026-05-24"
updated: "2026-05-25"


tags: [change]
## Path Inference
domain=feature, intent tiene objetivos concretos (S1+S2+S3 satisfechos), fast_path=full confirmado.
---

## Intent

Rework del dashboard agrícola (Next.js App Router en `src/` raíz, Supabase, deploy en Vercel). Objetivos:

1. Sensores en `system-status.tsx`: mostrar humedad **%** + **fecha/hora resumida** de la última lectura (hoy solo muestra la fecha); añadir **sensor ambiental** (tabla `sensor_onboard`: temperatura + humedad); corregir **detección de riego activo** (hoy solo evalúa el primer sensor).
2. Verificar #1 (gráfico no actualiza en vivo), #4 (realtime "Desconectado") y #6 (salud "Parcial") — ya resueltos en el código del branch pero sin desplegar. Realtime de Supabase confirmado HABILITADO para `sensor_riego_20/40/60` y `sensor_onboard`.
3. Reemplazar el gráfico **Recharts** por **@visx/xychart** (estilo XYChart de visx.airbnb.tech/xychart) con los colores de la página (`#0071FF`/`#00E396`/`#FEB019`), conservando vistas Apilado/Sumatoria.
4. Adaptar la **card de chat** (diseño tipo asistente: ícono, saludo personalizado, badges de sugerencias, textarea con barra inferior) a **SoilChat** (chat agrícola vía `/api/chat` → n8n), con los colores de la página; sin selector de modelo ni adjuntar/audio.
5. Reorganizar el dashboard en **layout bento** para aprovechar mejor el espacio.

Nota: la limpieza de git (repo solo-Vercel) ya está hecha y commiteada (`5e7f1e3`) — NO es parte del scope de specs.
