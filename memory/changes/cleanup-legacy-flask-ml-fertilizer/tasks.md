# Tasks: cleanup-legacy-flask-ml-fertilizer

## Orden de ejecución

El orden está dictado por el riesgo y las dependencias entre bloques:

1. **Bloque 0 — Verificación previa** (sin cambios en código): confirmar estado actual del worktree antes de eliminar nada.
2. **Bloque ML / peso muerto** (`no-ml-dead-artifacts`): menor riesgo — solo eliminación de binarios y JSON, sin impacto en código Next.js.
3. **Bloque Flask** (`no-flask-legacy-app`): archivos Python + depuración de `requirements.txt`; sin impacto en código Next.js.
4. **Bloque Fertilizante** (`no-fertilizer-broken-subsystem`): mayor riesgo — requiere edición quirúrgica de `route.ts` y limpieza de tipos; se ejecuta al final cuando ya no hay ruido de los bloques anteriores.

Dependencia explícita: la **Tarea 3.1** (tipos huérfanos) debe completarse antes de la **Tarea 3.4** (`route.ts`), ya que ambas tocan símbolos relacionados y el build final valida la ausencia de ambos.

---

## Bloque 0 — Verificación previa

### Tarea 0.1: Confirmar estado del worktree antes de iniciar

- **Archivos**: (solo lectura, sin modificaciones)
  - `src/app/api/cities/route.ts`
  - `src/components/dashboard/dashboard-grid.tsx`
  - `src/hooks/use-fertilizer-data.ts`
  - `src/components/dashboard/fertilizer-chart.tsx`
  - `requirements.txt`
- **Qué hacer**: ejecutar los greps de verificación listados abajo para documentar el estado inicial; confirmar que ningún símbolo a eliminar ya fue borrado accidentalmente.
- **Criterio de completado**: todos los greps retornan resultados que coinciden con lo esperado por las specs (archivos existen, referencias presentes donde se indica).

- [ ] Ejecutar `grep -n "chilean_cities" src/app/api/cities/route.ts` — debe retornar al menos una línea (confirma que `/api/cities` usa Supabase, no `city.list.json`)
- [ ] Ejecutar `grep -rn "FertilizerChart\|fertilizer-chart" src/components/dashboard/dashboard-grid.tsx` — documentar si hay o no imports (referencia: en la exploración no se encontraron, lo cual es esperado; confirmar)
- [ ] Ejecutar `grep -n "SensorFertilizante\|FertilizerData" src/types/index.ts` — debe retornar líneas 12 y 86 (tipos huérfanos confirmados)
- [ ] Ejecutar `grep -n "sensor_fertilizante\|batchFert\|N_20cm\|P_20cm\|K_20cm" src/app/api/upload/route.ts` — debe retornar referencias al bloque NPK (líneas ~137, 199-206, 249-254)
- [ ] Ejecutar `ls clasificador_cultivos.keras coder_etiquetas.pkl escalador_caracteristicas.pkl city.list.json` — deben existir los cuatro artefactos a eliminar
- [ ] Ejecutar `ls app.py wsgi.py` y `ls panel_control/` — deben existir los tres ítems Flask a eliminar

---

## Spec: no-ml-dead-artifacts — Artefactos ML y datos de ciudades

### Tarea 1.1: Eliminar artefactos binarios ML y archivo de ciudades

- **Archivos**:
  - `clasificador_cultivos.keras` (raíz del worktree)
  - `coder_etiquetas.pkl` (raíz del worktree)
  - `escalador_caracteristicas.pkl` (raíz del worktree)
  - `city.list.json` (raíz del worktree)
- **Qué hacer**: eliminar los cuatro archivos del árbol de trabajo. Son artefactos binarios/datos sin consumidores vivos en la arquitectura actual; `city.list.json` solo era usado por la ruta Flask ya no vigente, y `/api/cities` del proyecto Next.js usa `chilean_cities` de Supabase.
- **Criterio de completado**: `git ls-files | grep -E "\.keras$|\.pkl$|city\.list\.json"` no retorna ningún resultado.

- [ ] Ejecutar `git rm clasificador_cultivos.keras`
- [ ] Ejecutar `git rm coder_etiquetas.pkl`
- [ ] Ejecutar `git rm escalador_caracteristicas.pkl`
- [ ] Ejecutar `git rm city.list.json`
- [ ] Verificar con `git ls-files | grep -E "\.keras$|\.pkl$|city\.list\.json"` — debe retornar vacío

---

## Spec: no-flask-legacy-app — Aplicación Flask legacy

### Tarea 2.1: Eliminar puntos de entrada Flask

- **Archivos**:
  - `app.py` (raíz del worktree)
  - `wsgi.py` (raíz del worktree)
- **Qué hacer**: eliminar ambos archivos que constituyen el punto de entrada de la app Flask. No tienen consumidores en el proyecto Next.js.
- **Criterio de completado**: `git ls-files | grep -E "^app\.py$|^wsgi\.py$"` no retorna resultados.

- [ ] Ejecutar `git rm app.py`
- [ ] Ejecutar `git rm wsgi.py`
- [ ] Verificar con `git ls-files | grep -E "^app\.py$|^wsgi\.py$"` — debe retornar vacío

### Tarea 2.2: Eliminar el paquete panel_control/ completo

- **Archivos**:
  - `panel_control/__init__.py`
  - `panel_control/models.py`
  - `panel_control/routes.py`
  - `panel_control/static/` (directorio completo)
  - `panel_control/templates/` (directorio completo)
- **Qué hacer**: eliminar el directorio `panel_control/` y todo su contenido recursivamente. Este paquete Python implementa el dashboard Flask legacy; ningún módulo Next.js lo referencia.
- **Criterio de completado**: `git ls-files | grep "^panel_control/"` no retorna resultados.

- [ ] Ejecutar `git rm -r panel_control/`
- [ ] Verificar con `git ls-files | grep "^panel_control/"` — debe retornar vacío

### Tarea 2.3: Limpiar requirements.txt — eliminar dependencias exclusivas de Flask

- **Archivos**:
  - `requirements.txt`
- **Qué hacer**: editar `requirements.txt` para eliminar las líneas correspondientes a dependencias exclusivas de Flask sin consumidores vivos. Las dependencias a **eliminar** son: `blinker`, `click`, `Flask`, `Flask-SQLAlchemy`, `greenlet`, `gunicorn`, `itsdangerous`, `Jinja2`, `MarkupSafe`, `psycopg2-binary`, `SQLAlchemy`, `Werkzeug`. Las dependencias a **conservar** obligatoriamente: `requests`, `PyJWT`, `python-dotenv` (consumidas por `scripts/serial-bridge/serial_bridge.py`). El resto de dependencias (`certifi`, `cffi`, `charset-normalizer`, `cryptography`, `idna`, `packaging`, `pycparser`, `six`, `typing_extensions`, `urllib3`) son transitivas — evaluar si alguna es directamente referenciada; de no serlo, pueden eliminarse junto con las Flask.
- **Criterio de completado**:
  - `grep -E "^Flask|^Flask-SQLAlchemy|^gunicorn|^Werkzeug|^Jinja2|^blinker|^itsdangerous|^click|^greenlet|^SQLAlchemy|^psycopg2-binary|^MarkupSafe" requirements.txt` retorna vacío.
  - `grep -E "^requests|^PyJWT|^python-dotenv" requirements.txt` retorna exactamente las tres dependencias conservadas.
  - `scripts/serial-bridge/serial_bridge.py` no se modifica.

- [ ] Abrir `requirements.txt` para edición
- [ ] Eliminar la línea `blinker==1.9.0`
- [ ] Eliminar la línea `click==8.2.1`
- [ ] Eliminar la línea `Flask==3.1.1`
- [ ] Eliminar la línea `Flask-SQLAlchemy==3.1.1`
- [ ] Eliminar la línea `greenlet==3.2.3`
- [ ] Eliminar la línea `gunicorn==23.0.0`
- [ ] Eliminar la línea `itsdangerous==2.2.0`
- [ ] Eliminar la línea `Jinja2==3.1.6`
- [ ] Eliminar la línea `MarkupSafe==3.0.2`
- [ ] Eliminar la línea `psycopg2-binary==2.9.10`
- [ ] Eliminar la línea `SQLAlchemy==2.0.41`
- [ ] Eliminar la línea `Werkzeug==3.1.3`
- [ ] Verificar que `requests`, `PyJWT` y `python-dotenv` permanecen en el archivo
- [ ] Verificar que `scripts/serial-bridge/serial_bridge.py` existe sin modificaciones

---

## Spec: no-fertilizer-broken-subsystem — Subsistema fertilizante/NPK

> **Requiere**: Tareas 2.1 y 2.2 completadas (el bloque fertilizante depende de `no-flask-legacy-app` según spec frontmatter).

### Tarea 3.1: Eliminar tipos huérfanos de fertilizante en src/types/index.ts

- **Archivos**:
  - `src/types/index.ts`
- **Qué hacer**: eliminar las dos interfaces huérfanas que solo sirven al subsistema fertilizante eliminado: `SensorFertilizante` (líneas 12–19) y `FertilizerData` (líneas 86–93). No eliminar ningún otro tipo (`SensorRiego`, `SensorOnboard`, `Notification`, `DecisionRiego`, `ChatSession`, `UserDocument`, `ChileanCity`, `WeatherData`, `IrrigationData`).
- **Criterio de completado**: `grep -n "SensorFertilizante\|FertilizerData" src/types/index.ts` no retorna resultados.

- [ ] Eliminar el bloque `export interface SensorFertilizante { ... }` (6 líneas incluyendo campos `id`, `user_id`, `timestamp`, `nitrogen`, `phosphorus`, `potassium`)
- [ ] Eliminar el bloque `export interface FertilizerData { ... }` (6 líneas incluyendo campos `dates`, `nitrogen`, `phosphorus`, `potassium`, `fertilization_events`)
- [ ] Verificar que los demás interfaces permanecen intactos con `grep -c "export interface" src/types/index.ts` — debe retornar 9 (antes eran 11)

### Tarea 3.2: Eliminar el hook use-fertilizer-data.ts

- **Archivos**:
  - `src/hooks/use-fertilizer-data.ts`
- **Qué hacer**: eliminar el archivo completo del hook. El hook consulta la tabla `sensor_fertilizante` que no existe en Supabase y solo es consumido por `fertilizer-chart.tsx` (a eliminar en Tarea 3.3).
- **Criterio de completado**: `git ls-files | grep "use-fertilizer-data"` no retorna resultados.

- [ ] Ejecutar `git rm src/hooks/use-fertilizer-data.ts`
- [ ] Verificar con `git ls-files | grep "use-fertilizer-data"` — debe retornar vacío

### Tarea 3.3: Eliminar el componente fertilizer-chart.tsx

- **Archivos**:
  - `src/components/dashboard/fertilizer-chart.tsx`
- **Qué hacer**: eliminar el archivo completo del componente. Este componente renderiza la gráfica NPK usando `useFertilizerData` (eliminado en Tarea 3.2). La exploración previa confirmó que `dashboard-grid.tsx` **no** importa `FertilizerChart`, por lo que no se requiere edición en ese archivo — solo eliminar el componente.
- **Criterio de completado**: `git ls-files | grep "fertilizer-chart"` no retorna resultados.

- [ ] Confirmar previamente que `dashboard-grid.tsx` no tiene imports de `FertilizerChart` con `grep "FertilizerChart\|fertilizer-chart" src/components/dashboard/dashboard-grid.tsx` — si retorna algo, editar ese archivo primero para remover el import y el uso
- [ ] Ejecutar `git rm src/components/dashboard/fertilizer-chart.tsx`
- [ ] Verificar con `git ls-files | grep "fertilizer-chart"` — debe retornar vacío

### Tarea 3.4: Edición quirúrgica de route.ts — eliminar bloque NPK

> **Requiere**: Tareas 3.1, 3.2 y 3.3 completadas (asegura que no quedan referencias externas a `batchFert`).

- **Archivos**:
  - `src/app/api/upload/route.ts`
- **Qué hacer**: eliminar **únicamente** el bloque de procesamiento y escritura NPK del archivo, conservando intacta toda la lógica de ingesta de riego y onboard. Los elementos a eliminar son:
  1. La declaración `const batchFert: Record<string, unknown>[] = []` (línea ~137).
  2. El bloque comentado `// Fertilizante NPK — siempre presente` y el `batchFert.push({...})` completo (líneas ~199–206).
  3. El bloque condicional `if (batchFert.length > 0) { insertPromises.push(supabaseAdmin.from("sensor_fertilizante")...) }` (líneas ~249–254).
  No modificar: imports, `resolveDeviceApiKey`, validaciones de API key, rate limiting, parseo CSV, lógica de riego 20/40/60cm, lógica onboard, ni la respuesta final.
- **Criterio de completado**:
  - `grep -n "sensor_fertilizante\|batchFert\|N_20cm\|P_20cm\|K_20cm\|nitrogeno\|fosforo\|potasio" src/app/api/upload/route.ts` no retorna resultados.
  - El archivo `src/app/api/upload/route.ts` sigue existiendo.
  - La lógica de `batch20`, `batch40`, `batch60`, `batchOnboard` permanece intacta.

- [ ] Eliminar la línea `const batchFert: Record<string, unknown>[] = []`
- [ ] Eliminar el comentario `// Fertilizante NPK — siempre presente` y el bloque `batchFert.push({...})` de 6 líneas (campos `user_id`, `timestamp`, `nitrogen`, `phosphorus`, `potassium`)
- [ ] Eliminar el bloque condicional `if (batchFert.length > 0) { insertPromises.push(supabaseAdmin.from("sensor_fertilizante")...) }` completo
- [ ] Verificar que `batch20`, `batch40`, `batch60` y `batchOnboard` siguen presentes en el archivo
- [ ] Verificar que el `Promise.all(insertPromises)` sigue presente

---

## Bloque 4 — Verificación final

### Tarea 4.1: Verificar ausencia de referencias residuales

- **Archivos**: (solo lectura, greps sobre el árbol de trabajo)
- **Qué hacer**: ejecutar los greps de aceptación de las tres specs para confirmar que no quedan referencias a ningún símbolo eliminado.
- **Criterio de completado**: todos los comandos retornan vacío.

- [ ] `git ls-files | grep -E "\.keras$|\.pkl$|city\.list\.json"` → vacío
- [ ] `git ls-files | grep -E "^app\.py$|^wsgi\.py$|^panel_control/"` → vacío
- [ ] `git ls-files | grep -E "fertilizer-chart\.tsx|use-fertilizer-data\.ts"` → vacío
- [ ] `grep -E "^Flask|^Flask-SQLAlchemy|^gunicorn|^Werkzeug|^Jinja2|^blinker|^itsdangerous|^click|^greenlet|^SQLAlchemy|^psycopg2-binary|^MarkupSafe" requirements.txt` → vacío
- [ ] `grep -E "^requests|^PyJWT|^python-dotenv" requirements.txt` → 3 líneas
- [ ] `grep -r "sensor_fertilizante\|FertilizerChart\|useFertilizerData\|FertilizerData\|SensorFertilizante" src/` → vacío

### Tarea 4.2: Build de producción limpio

- **Archivos**: (ejecución de build, sin modificaciones)
- **Qué hacer**: ejecutar `next build` en el worktree para confirmar que no hay errores TypeScript ni de módulos faltantes relacionados con los símbolos eliminados.
- **Criterio de completado**: `next build` completa exitosamente (exit code 0) sin errores ni advertencias relacionadas con `FertilizerChart`, `useFertilizerData`, `SensorFertilizante`, `FertilizerData`, `sensor_fertilizante`, `app.py`, `wsgi.py`, ni archivos `.keras` o `.pkl`.

- [ ] Ejecutar `cd {worktree} && npx next build` (o `npm run build` si existe el script en `package.json`)
- [ ] Confirmar exit code 0
- [ ] Confirmar que no aparecen errores TS referenciando símbolos eliminados
- [ ] Confirmar que el tamaño del árbol de trabajo se redujo en al menos 40 MB respecto al estado inicial (los binarios ML suman ~41 MB)
