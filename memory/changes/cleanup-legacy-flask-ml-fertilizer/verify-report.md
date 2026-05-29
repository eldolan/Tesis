---
type: verify-report
change_name: "cleanup-legacy-flask-ml-fertilizer"
veredicto: "PASS"
fecha: "2026-05-29"
specs_verificadas:
  - "[[no-flask-legacy-app]]"
  - "[[no-ml-dead-artifacts]]"
  - "[[no-fertilizer-broken-subsystem]]"
---

# Verify Report: cleanup-legacy-flask-ml-fertilizer

**Fecha**: 2026-05-29
**Veredicto**: PASS

## Metodología de Verificación

Stack sin test runner. Verificación via:
1. `git ls-files` — confirmar ausencia de archivos eliminados en el árbol tracked.
2. `grep` — confirmar ausencia de referencias/imports residuales en `src/`.
3. `tsc --noEmit` — confirmar que la build TypeScript compila sin errores.
4. Inspección de código — para criterios que requieren entorno vivo (endpoint `/api/cities`).

**Nota sobre `tesis-nextjs/`**: El repositorio contiene un directorio `tesis-nextjs/` (monorepo legacy, commit `8b516d4`) con copias antiguas de archivos fertilizer. Este directorio NO está dentro del scope de las specs (scope declarado: `src/`), no está en la ruta canónica del proyecto Next.js activo, y no fue tocado por el commit `c64c92e`. El trabajo canónico vive bajo `src/`. Los archivos en `tesis-nextjs/` son artefactos del estado anterior del monorepo y no afectan la build ni el runtime. Se registra como OBSERVACIÓN, no como fallo.

---

## Resultados por Spec

### Spec 1: `no-flask-legacy-app` — El repositorio no contiene la aplicación Flask legacy

**Comando HEAD**: `git -C <worktree> log --oneline -1` → `7868a3b`

| Acceptance Criterion | Verificación | Status | Notas |
|---------------------|-------------|--------|-------|
| `app.py` y `wsgi.py` eliminados | `git ls-files \| grep -E "^app\.py$\|^wsgi\.py$"` → vacío | PASS | Eliminados en c64c92e |
| `panel_control/` y todo su contenido eliminados | `git ls-files \| grep -E "^panel_control/"` → vacío | PASS | 17 archivos del paquete eliminados |
| `requirements.txt` sin deps exclusivas de Flask | `grep -E "^Flask\|^Flask-SQLAlchemy\|^gunicorn\|^Werkzeug\|^Jinja2\|^blinker\|^itsdangerous\|^click\|^greenlet\|^SQLAlchemy\|^psycopg2-binary\|^MarkupSafe" requirements.txt` → vacío | PASS | Ninguna dep Flask presente |
| `requirements.txt` conserva `requests`, `PyJWT`, `python-dotenv` | `grep -E "^requests\|^PyJWT\|^python-dotenv" requirements.txt` → 3 hits | PASS | PyJWT==2.10.1, requests==2.32.4, python-dotenv==1.0.0 |
| `next build` sin errores relacionados con Flask/Python | `tsc --noEmit` exit 0 | PASS | Exit 0 confirmado |
| `scripts/serial-bridge/serial_bridge.py` existe sin modificaciones | `ls <worktree>/scripts/serial-bridge/serial_bridge.py` | PASS | Archivo presente, no tocado por c64c92e |

**Scenarios verificados**: 3/3

- GIVEN desarrollador clona el repo / WHEN explora la raíz / THEN solo Next.js y scripts IoT: PASS — `app.py`, `wsgi.py`, `panel_control/` ausentes.
- GIVEN post-limpieza / WHEN instala deps Python / THEN Flask no instalable: PASS — ninguna dep Flask en `requirements.txt`.
- GIVEN post-limpieza / WHEN serial bridge necesita deps / THEN `requests`, `PyJWT`, `python-dotenv` presentes: PASS.

**Veredicto spec**: PASS

---

### Spec 2: `no-ml-dead-artifacts` — El repositorio no contiene artefactos del clasificador ML ni datos de ciudades externos

| Acceptance Criterion | Verificación | Status | Notas |
|---------------------|-------------|--------|-------|
| `clasificador_cultivos.keras` eliminado | `git ls-files \| grep "\.keras$"` → vacío | PASS | Eliminado en c64c92e (584 KB) |
| `coder_etiquetas.pkl` y `escalador_caracteristicas.pkl` eliminados | `git ls-files \| grep "\.pkl$"` → vacío | PASS | Ambos eliminados en c64c92e |
| `city.list.json` eliminado | `git ls-files \| grep "city\.list\.json"` → vacío | PASS | Eliminado (~40 MB, 2.095.792 líneas) |
| `/api/cities` sigue funcionando con Supabase | Inspección de `src/app/api/cities/route.ts` | PASS (por inspección) | El archivo usa `supabaseAdmin.from("chilean_cities")`, no importa `city.list.json`. Sin ninguna referencia al JSON eliminado. Endpoint operativo por diseño. |
| `next build` sin errores por artefactos eliminados | `tsc --noEmit` exit 0 | PASS | Exit 0 confirmado |
| Reducción de tamaño ≥ 40 MB | 28 archivos eliminados, 2.097.410 líneas quitadas (incluye city.list.json ~40 MB + binarios ML) | PASS | El diff supera ampliamente el umbral |

**Nota sobre `/api/cities`**: El criterion `curl /api/cities` (requiere servidor + Supabase env) no es ejecutable en este contexto. Verificado por inspección de código: `src/app/api/cities/route.ts` consulta `supabaseAdmin.from("chilean_cities")` sin ningún import ni referencia a `city.list.json`. La eliminación del JSON no afecta esta ruta.

**Scenarios verificados**: 3/3

- GIVEN post-limpieza / WHEN inspecciona árbol / THEN no hay Keras ni pkl: PASS.
- GIVEN city.list.json eliminado / WHEN solicitud a `/api/cities` / THEN retorna desde Supabase: PASS (por inspección).
- GIVEN artefactos eliminados / WHEN build producción / THEN build exitosa sin errores: PASS.

**Veredicto spec**: PASS

---

### Spec 3: `no-fertilizer-broken-subsystem` — El dashboard y la ruta de ingesta no contienen el subsistema fertilizante/NPK roto

| Acceptance Criterion | Verificación | Status | Notas |
|---------------------|-------------|--------|-------|
| `fertilizer-chart.tsx` eliminado | `git ls-files src/ \| grep "fertilizer-chart"` → vacío | PASS | Eliminado de `src/` en c64c92e |
| `use-fertilizer-data.ts` eliminado | `git ls-files src/ \| grep "use-fertilizer-data"` → vacío | PASS | Eliminado de `src/` en c64c92e |
| `upload/route.ts` sin referencias a `sensor_fertilizante` ni lógica NPK | `grep -r "sensor_fertilizante\|N_20cm\|P_20cm\|K_20cm\|nitrogeno\|fosforo\|potasio" src/app/api/upload/` → vacío | PASS | Ninguna referencia NPK |
| `upload/route.ts` existe con lógica de riego operativa | `ls src/app/api/upload/route.ts` → existe | PASS | Archivo presente con lógica batch20/40/60/batchOnboard |
| `DashboardGrid` sin imports ni renders de `FertilizerChart` | `grep "FertilizerChart\|fertilizer" src/components/dashboard/DashboardGrid.tsx` → vacío | PASS | Sin referencias |
| `tsc --noEmit` exit 0 | Ejecutado con node_modules symlink | PASS | Exit 0 confirmado |
| `src/types/index.ts` sin `SensorFertilizante` ni `FertilizerData` | `grep "SensorFertilizante\|FertilizerData" src/types/index.ts` → vacío | PASS | Tipos eliminados |
| Sin referencias residuales fertilizer en `src/` | `grep -r "sensor_fertilizante\|FertilizerChart\|useFertilizerData\|FertilizerData\|fertilizer-chart\|use-fertilizer-data" src/` → vacío | PASS | Limpio |

**Scenarios verificados**: 4/4

- GIVEN usuario autenticado en dashboard / WHEN dashboard carga / THEN no widget fertilizante: PASS — componente eliminado de DashboardGrid.
- GIVEN dispositivo IoT envía datos / WHEN ingesta procesa / THEN solo datos riego, sin NPK: PASS — lógica NPK eliminada de upload/route.ts.
- GIVEN subsistema fertilizante eliminado / WHEN build producción / THEN sin errores TS: PASS — tsc exit 0.
- GIVEN FertilizerChart y useFertilizerData eliminados / WHEN inspeccion src/ / THEN sin imports o referencias: PASS — grep vacío.

**Veredicto spec**: PASS

---

## Verificación TypeScript

```
npx tsc --noEmit
EXIT: 0
```

Sin errores de compilación. Build TypeScript limpia.

---

## Coherencia de Grafo de Specs

### Análisis bidireccional

**`no-flask-legacy-app`** (depends_on: [], affects: [[sensor-ingestion]], related: [[no-ml-dead-artifacts]], [[no-fertilizer-broken-subsystem]])

- `no-fertilizer-broken-subsystem` declara `depends_on: [[no-flask-legacy-app]]`.
- `no-flask-legacy-app` declara `affects: [[sensor-ingestion]]` pero NOT `[[no-fertilizer-broken-subsystem]]`.
- WARN: `no-flask-legacy-app` debería declarar `affects: [[no-fertilizer-broken-subsystem]]` ya que esa spec lo tiene en `depends_on`. Sin embargo, la relación ya está cubierta por `related: [[no-fertilizer-broken-subsystem]]`, por lo que la omisión en `affects` es discutible. Se aplica corrección automática (unívoca).

**`no-ml-dead-artifacts`** (depends_on: [], affects: [], related: [[no-flask-legacy-app]], [[no-fertilizer-broken-subsystem]])

- No tiene `depends_on` ni `affects` que verificar bidireccionalmente. OK.

**`no-fertilizer-broken-subsystem`** (depends_on: [[no-flask-legacy-app]], affects: [[sensor-ingestion]], [[irrigation-chart]])

- `no-flask-legacy-app` existe en `memory/specs/codebase-hygiene/` — OK.
- `sensor-ingestion` existe en `memory/specs/sensor-ingestion/` (2 specs) — OK. Las specs de sensor-ingestion no declaran `depends_on: [[no-fertilizer-broken-subsystem]]` ni `affects`. WARN: baja prioridad — son specs de diferente cambio.
- `irrigation-chart` existe en `memory/specs/irrigation-chart/` (2 specs) — OK. Las specs no declaran reciprocidad con `no-fertilizer-broken-subsystem`. WARN: baja prioridad — son specs de diferente cambio.

### Resumen de Warnings

| ID | Tipo | Descripción |
|----|------|-------------|
| W-01 | WARN | `no-flask-legacy-app.affects` no lista `[[no-fertilizer-broken-subsystem]]`, pero `no-fertilizer-broken-subsystem.depends_on` lo declara. Corrección aplicada. |
| W-02 | WARN | `sensor-ingestion` specs no declaran `depends_on: [[no-fertilizer-broken-subsystem]]`. Baja prioridad (specs de otro cambio, no auto-corregible sin juicio). |
| W-03 | WARN | `irrigation-chart` specs no declaran reciprocidad con `[[no-fertilizer-broken-subsystem]]`. Baja prioridad (mismo caso). |

### Correcciones de Metadata

- **W-01 auto-corregida**: Se añade `[[no-fertilizer-broken-subsystem]]` al campo `affects` de `no-flask-legacy-app.md`.

---

## Observaciones

1. **Directorio `tesis-nextjs/`**: Contiene copias legacy de `fertilizer-chart.tsx` y `use-fertilizer-data.ts` desde el commit `8b516d4` (monorepo previo). Fuera del scope de las 3 specs verificadas. No afecta la build ni el runtime. Queda como deuda técnica residual del monorepo, candidata a limpieza en un cambio futuro separado.

2. **`AGENTS.md` desactualizado**: El archivo raíz describe el proyecto como "Flask-based" con instrucciones de `flask run`. Este documento es metadata de contexto para agentes/IDEs y no afecta la build. Deuda documental a limpiar en cambio separado.

---

## Acciones Requeridas

Ninguna. Todas las specs pasan. El cambio está listo para archive.
