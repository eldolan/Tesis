---
type: external-input
domain: debt
---
# Input externo para cleanup-legacy-flask-ml-fertilizer

## Estado actual
El repo `eldolan/Tesis` (Next.js 16 + n8n + Supabase) arrastra código y artefactos legacy de una arquitectura anterior (app Flask + clasificador ML + subsistema fertilizante) que ya no forman parte del sistema vigente y que confunden/pesan. Decidido con el usuario tras contrastar la tesis con el proyecto real (ver `documentacion/DECISIONES_ALCANCE.md`).

## Estado deseado
Repo limpio que contiene solo la arquitectura vigente (Next.js + integración n8n + Supabase), sin remanentes Flask/ML/fertilizante.

## Alcance de eliminación (verificado contra `develop`)

### Bloque 1 — App Flask legacy
- `app.py`, `wsgi.py` (entrypoints WSGI)
- `panel_control/` completo (`__init__.py`, `models.py`, `routes.py`, `static/`, `templates/`)
- Limpiar `requirements.txt`: quitar `Flask`, `Flask-SQLAlchemy`, `gunicorn`. **Verificar primero** que no queden consumidores Python vivos en el worktree (`develop`) antes de vaciar/eliminar el archivo.

### Bloque 2 — Artefactos ML / peso muerto
- `clasificador_cultivos.keras`, `coder_etiquetas.pkl`, `escalador_caracteristicas.pkl` (clasificador de cultivos — enfoque abandonado a favor de RAG)
- `city.list.json` (~41 MB). **Verificado muerto**: `/api/cities` usa la tabla `chilean_cities` de Supabase, no el JSON.

### Bloque 3 — Subsistema fertilizante/NPK
- `src/components/dashboard/fertilizer-chart.tsx` — **verificado huérfano** (ningún componente vivo lo importa en `develop`)
- `src/hooks/use-fertilizer-data.ts` — consulta `sensor_fertilizante` (tabla inexistente en Supabase)
- `src/app/api/upload/route.ts` — **ruta activa**: eliminar SOLO el bloque NPK / inserción a `sensor_fertilizante` (≈ líneas 199-252), de forma quirúrgica. NO eliminar el archivo.

## Verificaciones obligatorias antes de remover (ya ejecutadas, re-confirmar en apply)
- `/api/cities` → usa `chilean_cities` (no `city.list.json`). OK remover JSON.
- `fertilizer-chart` / `use-fertilizer-data` → sin imports vivos en `develop`. OK remover.
- `/api/upload` → ruta viva; remoción quirúrgica del NPK únicamente.
- `requirements.txt` → confirmar ausencia de consumidores Python vivos antes de tocar.

## Observaciones relacionadas (fuera de alcance estricto, anotar)
- `/api/upload` también inserta `cond_20`/`ph_20` (conductividad/pH), columnas inexistentes en el esquema real. No corregir aquí salvo decisión explícita.
- `AGENTS.md` describe la app Flask como sistema principal — quedará desactualizado tras esta limpieza (candidato a cambio A/doc).

## Restricciones
- Destino remoto: **GitHub `eldolan/Tesis`** — NUNCA GitLab.
- **Sin push ni MR** sin aprobación explícita del usuario (interceptar en sdd-archive).

## Justificación de prioridad
Reduce superficie de confusión para humanos y agentes, elimina ~41 MB de peso muerto, y desbloquea el cambio A (actualizar la tesis a la arquitectura real).
