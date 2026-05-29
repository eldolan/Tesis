---
type: proposal
change_name: "cleanup-legacy-flask-ml-fertilizer"
domain: "debt"
status: approved
iteration: 1
created: "2026-05-29"
updated: "2026-05-29"
tags: [proposal]
effort: M
risks:
  - id: R1
    desc: "Remoción no quirúrgica del bloque NPK rompe la ruta viva /api/upload"
    probabilidad: Media
  - id: R2
    desc: "Vaciar requirements.txt rompe scripts/serial-bridge/serial_bridge.py (consumidor vivo de requests)"
    probabilidad: Media
  - id: R3
    desc: "Existe un consumidor Python no listado en el input (serial_bridge.py)"
    probabilidad: Baja
---

# Propuesta: cleanup-legacy-flask-ml-fertilizer

## Intent

Eliminar del repo `eldolan/Tesis` los remanentes de la arquitectura anterior (app Flask, clasificador ML y subsistema fertilizante/NPK) que ya no forman parte del sistema vigente (Next.js + n8n + Supabase). Reduce ~41 MB de peso muerto, baja la superficie de confusión para humanos y agentes, y desbloquea la actualización de la tesis a la arquitectura real.

## Scope

**Incluye:**
- **Bloque 1 — Flask legacy:** eliminar `app.py`, `wsgi.py`, `panel_control/` completo; limpiar `requirements.txt` (quitar Flask, Flask-SQLAlchemy, gunicorn y sus dependencias exclusivas) tras confirmar consumidores Python vivos.
- **Bloque 2 — ML / peso muerto:** eliminar `clasificador_cultivos.keras`, `coder_etiquetas.pkl`, `escalador_caracteristicas.pkl`, `city.list.json` (~41 MB; `/api/cities` usa la tabla Supabase `chilean_cities`, verificado muerto).
- **Bloque 3 — Fertilizante/NPK:** eliminar `src/components/dashboard/fertilizer-chart.tsx` (huérfano) y `src/hooks/use-fertilizer-data.ts`; en `src/app/api/upload/route.ts` quitar quirúrgicamente SOLO el bloque NPK / inserción a `sensor_fertilizante` (≈ líneas 199-252), conservando el archivo y el resto de la ruta viva.

**Excluye explícitamente:**
- `tesis-nextjs/` (directorio duplicado stale) — fuera de alcance de este cambio.
- `AGENTS.md` desactualizado (describe Flask como sistema principal) — quedará stale; candidato a cambio doc posterior.
- Columnas inexistentes `cond_20`/`ph_20` insertadas por `/api/upload` — no se corrigen aquí.
- `scripts/serial-bridge/serial_bridge.py` — consumidor Python vivo; NO se toca (ver R2/R3).

## Approach Propuesto

Remoción en orden seguro, de menor a mayor riesgo de consumidores: (1) artefactos ML y `city.list.json` (Bloque 2, sin imports vivos); (2) Flask (Bloque 1) eliminando `app.py`/`wsgi.py`/`panel_control/`; (3) edición quirúrgica de `/api/upload/route.ts` (Bloque 3). Antes de tocar `requirements.txt`, re-confirmar en el worktree los consumidores Python: `serial_bridge.py` importa `requests` (presente en `requirements.txt`) pero también `pyserial` (ausente), por lo que `requirements.txt` no es su fuente de dependencias real. Se propone **vaciar las dependencias exclusivas de Flask** (Flask, Flask-SQLAlchemy, gunicorn, Werkzeug, Jinja2, blinker, itsdangerous, click, greenlet, SQLAlchemy, psycopg2-binary, MarkupSafe) y conservar `requests`/`PyJWT`/`python-dotenv` salvo que se confirme que ningún script vivo las usa. Verificación final: `next build` y `grep` de imports residuales a los símbolos eliminados antes de cerrar.

## Esfuerzo Estimado

**M** — Múltiples archivos en 3 bloques, una edición quirúrgica delicada en ruta viva, y una decisión no trivial sobre `requirements.txt` por el consumidor Python no listado. No es trivial (no XS/S) pero tampoco involucra rediseño ni nueva lógica (no L/XL).

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| R1: Remoción no quirúrgica del bloque NPK rompe `/api/upload` (ruta viva) | Media | Editar solo el rango NPK/`sensor_fertilizante` (≈199-252); `next build` + revisión del diff de la ruta antes de cerrar |
| R2: Vaciar `requirements.txt` rompe `serial_bridge.py` (usa `requests`) | Media | No eliminar `requests`/`PyJWT`/`python-dotenv` salvo confirmación; quitar solo dependencias exclusivas de Flask |
| R3: Consumidor Python no listado en el input (`scripts/serial-bridge/serial_bridge.py`) | Baja | Mantener el script intacto y fuera de alcance; documentar su dependencia de `requests` en el design |

## Trade-offs

- **A favor:** repo alineado a la arquitectura vigente; ~41 MB menos; menos confusión para humanos/agentes; desbloquea actualización de tesis.
- **En contra:** `AGENTS.md` queda temporalmente inconsistente; `requirements.txt` no puede vaciarse por completo (queda mínimo por el serial-bridge), lo que mantiene una pequeña ambigüedad sobre la finalidad del archivo hasta un cambio posterior.
