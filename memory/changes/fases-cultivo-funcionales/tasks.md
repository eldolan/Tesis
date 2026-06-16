# Tasks: fases-cultivo-funcionales

> Generado por: sdd-tasks · Fecha: 2026-06-15
> Design fuente: `memory/changes/fases-cultivo-funcionales/design.md`
> ADRs vinculantes: `[[0001-fase-fenologica-string-validada-en-runtime]]`, `[[0002-duplicacion-deliberada-mapa-fase-estres-ts-n8n]]`, `[[0003-default-sobrescribible-fase-estres]]`

---

## Orden de ejecución

Las tareas siguen un orden de dependencia estricto:

1. **Contrato de datos** (tipos + catálogo TS) — base de la que dependen todas las demás capas.
2. **Helpers de riego** (`nivelEstresEfectivo`, `estresRecomendadoDeFase`) — consumen el catálogo; los consume la API y la UI.
3. **API route** — valida fase usando el catálogo; depende de T1 y T2.
4. **UI `plant-timeline.tsx`** — consume catálogo, helpers e iconos; depende de T1, T2 y T3 (para contratos coherentes).
5. **Migración Supabase** — DDL independiente del código TS; puede ejecutarse en paralelo con T3–T4, pero conviene hacerlo después de validar la lógica de la API.
6. **RAG monsteras.md** — edición manual de filesystem; independiente del worktree; ejecutar antes del re-embedding.
7. **Spec n8n copy-paste** — entrega documental para aplicación manual por el usuario; independiente de las demás.

Dependencias explícitas:
- T2 requiere T1 (usa `FaseDef`, `NivelEstres` y `FASES` del contrato).
- T3 requiere T1 y T2 (importa `fasesValidasParaEspecie`, `nivelEstresEfectivo`).
- T4 requiere T1 y T2 (importa `fasesParaEspecie`, `estresRecomendadoDeFase`, `nivelEstresEfectivo`, `iconoDeFase`).
- T5 es independiente del código TS; depende solo de la decisión de diseño (relajar el CHECK).
- T6 y T7 son independientes del worktree; pueden ejecutarse en cualquier momento.

---

## Spec: `cultivo-fases-dinamicas-por-especie` + `cultivo-fase-cableada-riego`

> Estas dos specs comparten los mismos archivos de implementación en `cultivo.ts` y `types/index.ts`. Se agrupan en las tareas T1 y T2 para evitar fragmentar el trabajo sobre el mismo módulo.

### T1 [REPO]: Abrir el tipo `FaseFenologica` a `string` en `src/types/index.ts`

- **Archivos**: `src/types/index.ts`
- **Qué hacer**: Localizar la definición de `FaseFenologica` (actualmente un union type cerrado de 6 literales). Reemplazarla por `export type FaseFenologica = string` con el comentario de contrato que indica que la validación real ocurre en runtime contra el catálogo de la especie (ver ADR-0001). No alterar la forma de `CultivoConfig` ni de `FaseDef`.
- **Criterio de completado**: `tsc --noEmit` pasa sin errores. El tipo `FaseFenologica` es `string` con comentario de contrato presente.
- **Modo**: sin TDD (cambio de tipo; verificación vía compilación TS).

- [x] Leer `src/types/index.ts` completo para identificar la definición exacta de `FaseFenologica`.
- [x] Reemplazar el union type cerrado por `export type FaseFenologica = string` añadiendo el comentario: `// Validada en runtime contra FASES_POR_ESPECIE[especie] (ADR-0001). No cerrado por tipo — la especie es dato runtime.`
- [x] Verificar que `CultivoConfig` y `FaseDef` siguen compilando sin cambio de firma.
- [x] Ejecutar `tsc --noEmit` desde el worktree y confirmar 0 errores.

---

### T2 [REPO]: Añadir catálogo de fases por especie y helpers de riego en `src/lib/cultivo.ts`

- **Archivos**: `src/lib/cultivo.ts`
- **Qué hacer**: Añadir las siguientes construcciones manteniendo `FASES`, `prEfectivo`, `estresReduccion` sin cambio de firma:
  1. `FASES_GENERICAS` (alias de lectura de `FASES` existentes — sin cambio de datos).
  2. `FASES_MONSTERA` con los 3 ids exactos: `crecimiento_activo`, `latencia_invernal`, `recuperacion` (con `estresRecomendado` según diseño §1).
  3. `FASES_POR_ESPECIE: Record<string, readonly FaseDef[]>` con clave `"monstera"`.
  4. `normalizaEspecie(especie: string): string` (lowercase, trim, quitar diacríticos vía NFD).
  5. `fasesParaEspecie(especie: string): readonly FaseDef[]` — fallback a `FASES_GENERICAS`.
  6. `fasesValidasParaEspecie(especie: string): Set<string>`.
  7. `estresRecomendadoDeFase(especie: string, faseId: string): NivelEstres` — fallback a `ESTRES_DEFAULT`.
  8. `nivelEstresEfectivo(especie, faseId, nivelGuardado): NivelEstres` — semántica DEFAULT sobrescribible (ADR-0003): si `nivelGuardado !== "ninguno"` → `nivelGuardado`; si no → `estresRecomendadoDeFase(especie, faseId)`.
  - Exportar todas las funciones y `FASES_POR_ESPECIE` como exports públicos.
  - Los ids de `FASES_MONSTERA` DEBEN coincidir exactamente con los del RAG y el espejo n8n (ADR-0002).
- **Criterio de completado**: `tsc --noEmit` pasa; las nuevas exports son accesibles. Verificar manualmente que `fasesParaEspecie("Monsterá ")` retorna 3 fases y `fasesParaEspecie("tomate")` retorna 6 genéricas.
- **Requiere**: T1 (el tipo `FaseFenologica` ya es `string`).
- **Modo**: sin TDD (no hay framework de tests; verificación manual/compilación).

- [x] Leer `src/lib/cultivo.ts` completo para ubicar `FASES`, `ESTRES_DEFAULT`, `NivelEstres` y `FaseDef`.
- [x] Añadir `const FASES_GENERICAS: readonly FaseDef[] = FASES` tras la definición de `FASES`.
- [x] Añadir `const FASES_MONSTERA: readonly FaseDef[]` con los 3 objetos de fase (ids exactos del diseño §1).
- [x] Añadir `export const FASES_POR_ESPECIE: Record<string, readonly FaseDef[]> = { monstera: FASES_MONSTERA }`.
- [x] Añadir `function normalizaEspecie(especie: string): string` (implementación NFD del diseño §1).
- [x] Añadir y exportar `fasesParaEspecie`, `fasesValidasParaEspecie`, `estresRecomendadoDeFase`.
- [x] Añadir y exportar `nivelEstresEfectivo` (ver snippet exacto en diseño §2).
- [x] Ejecutar `tsc --noEmit` y confirmar 0 errores.

---

## Spec: `cultivo-fases-dinamicas-por-especie` — capa API

### T3 [REPO]: Actualizar validación de fase en `src/app/api/cultivo/route.ts`

- **Archivos**: `src/app/api/cultivo/route.ts`
- **Qué hacer**: En el handler POST, reemplazar la validación de fase contra el set global fijo `FASES_VALIDAS` (basado en las 6 genéricas) por una validación dinámica contra `fasesValidasParaEspecie(especie)`. Eliminar la importación y uso de `FASES` y `FASES_VALIDAS` global. Asegurarse de que `especie` se resuelve antes de validar la fase (la especie es requerida — 400 si falta). Mantener el GET sin cambios estructurales.
- **Criterio de completado**: POST con `{especie:"monstera", fase_fenologica:"maduracion"}` → 400; POST con `{especie:"monstera", fase_fenologica:"crecimiento_activo"}` → 200. `tsc --noEmit` pasa.
- **Requiere**: T1 (tipos), T2 (helpers de catálogo exportados).

- [x] Leer `src/app/api/cultivo/route.ts` completo.
- [x] Añadir los imports de `fasesValidasParaEspecie` (y opcionalmente `estresRecomendadoDeFase`) desde `@/lib/cultivo`.
- [x] Eliminar el import de `FASES` y la constante `FASES_VALIDAS` (o cualquier set global de fases en el route).
- [x] En el handler POST: resolver `especie` con trim/slice antes de la validación de fase; retornar 400 si `especie` está vacía.
- [x] Reemplazar la validación de fase por `!fasesValidasParaEspecie(especie).has(fase)` → 400 con mensaje `Fase fenológica inválida para la especie "${especie}".`
- [x] Ejecutar `tsc --noEmit` y confirmar 0 errores.

---

## Spec: `cultivo-plant-timeline-ui` + `cultivo-fase-cableada-riego` — capa UI

### T4 [REPO]: Refactorizar `src/components/dashboard/plant-timeline.tsx`

- **Archivos**: `src/components/dashboard/plant-timeline.tsx`
- **Qué hacer**: Aplicar 5 cambios en el componente (todos documentados en el diseño §4, §6 y §7):
  1. **ICONOS dinámicos con fallback**: cambiar `ICONOS` de `Record<FaseFenologica, ReactNode>` a `Record<string, React.ReactNode>` con entradas para los 9 ids (6 genéricas + 3 monstera) y añadir `ICONO_FALLBACK` y `function iconoDeFase(faseId: string)`.
  2. **Fases dinámicas**: reemplazar el uso del array `FASES` global por `const fases = fasesParaEspecie(config.especie)` en el renderizado. Ajustar `idxActiva` y el ancho de la barra de progreso a `fases.length - 1`.
  3. **Fix de íconos recortados**: en el `div` interno `relative` (que contiene el flex de círculos), añadir la clase `pt-1.5`. No tocar `top-5` de la línea de conexión (sigue alineado por estar en el mismo contenedor relativo).
  4. **Sugerencia de estrés al cambiar de fase**: en `onChange` del select de fase, preseleccionar el estrés recomendado (`estresRecomendadoDeFase`) como nuevo valor del select de estrés.
  5. **Reset de fase al cambiar de especie**: en `onChange` del select de especie, si la fase actual no pertenece al nuevo catálogo (`!fasesValidasParaEspecie(nuevaEspecie).has(config.fase_fenologica)`), fijar `fase_fenologica` a la primera fase del nuevo catálogo y su `estresRecomendado`.
  6. **Estrés efectivo en el pie**: mostrar el estrés efectivo calculado por `nivelEstresEfectivo(config.especie, config.fase_fenologica, config.nivel_estres)` en el texto de pie del componente.
- **Criterio de completado**: `tsc --noEmit` pasa. Inspección visual: ring del círculo activo no recortado; catálogo Monstera muestra 3 fases; cambio de fase preselecciona estrés; cambio de especie resetea a fase válida; pie muestra estrés efectivo.
- **Requiere**: T1, T2.

- [x] Leer `src/components/dashboard/plant-timeline.tsx` completo.
- [x] Añadir imports de `fasesParaEspecie`, `fasesValidasParaEspecie`, `estresRecomendadoDeFase`, `nivelEstresEfectivo` desde `@/lib/cultivo`.
- [x] Cambiar el tipo de `ICONOS` a `Record<string, React.ReactNode>` y añadir entradas para los 3 ids de Monstera.
- [x] Añadir `ICONO_FALLBACK` y la función `iconoDeFase(faseId: string)` (ver diseño §4, snippet exacto).
- [x] Reemplazar todos los usos de `FASES` global por `fasesParaEspecie(config.especie)` en modo visualización y edición.
- [x] Ajustar cálculo de `idxActiva` y ancho de barra de progreso para usar `fases.length - 1`.
- [x] Localizar el `div` con clase `flex items-start ... relative min-w-[300px]` y añadir `pt-1.5` (ver diseño §6, diff exacto).
- [x] Implementar sugerencia de estrés en `onChange` del select de fase (ver diseño §7, snippet exacto).
- [x] Implementar reset de fase en `onChange` del select de especie (ver diseño §7, detalle de UX).
- [x] Añadir estrés efectivo al texto de pie usando `nivelEstresEfectivo(...)`.
- [x] Ejecutar `tsc --noEmit` y confirmar 0 errores.

---

## Spec: `cultivo-fases-dinamicas-por-especie` — capa DB

### T5 [DB]: Crear y aplicar migración Supabase para relajar el CHECK de `fase_fenologica`

- **Archivos**: `supabase/migrations/{timestamp}_relax_fase_fenologica_check.sql` (crear directorio `supabase/migrations/` si no existe en el worktree).
- **Qué hacer**:
  - Crear la carpeta `supabase/migrations/` en la raíz del worktree (no existe actualmente).
  - Crear el archivo SQL con el DDL exacto del diseño §5: bloque `DO $$` que itera sobre todos los CHECKs de `cultivo_config` que mencionen `fase_fenologica` y los elimina por nombre; luego añadir el DEFAULT `'vegetativo'` y la constraint `cultivo_config_fase_fenologica_no_vacia` (NOT NULL + no vacío).
  - El timestamp del nombre de archivo sigue el formato `YYYYMMDDHHMMSS` (ej: `20260615220000`).
  - Commitear el archivo SQL en la feature branch (es un artefacto versionado del repo).
  - La **aplicación** del DDL es un paso separado: `supabase db push` o equivalente vía Supabase CLI. No es responsabilidad de sdd-apply ejecutarlo, pero sí documentar el procedimiento en el comentario del SQL.
- **Criterio de completado**: El archivo `.sql` existe en `supabase/migrations/` del worktree y aparece en el diff de la feature branch. El DDL es sintácticamente válido. El procedimiento de aplicación está comentado dentro del SQL.
- **Requiere**: ninguna tarea de código TS previa (independiente); conviene ejecutar después de T3 para tener el contexto de la validación API completo.

- [x] Crear el directorio `supabase/migrations/` en la raíz del worktree.
- [x] Determinar el timestamp del momento de creación (formato `YYYYMMDDHHMMSS`).
- [x] Crear `supabase/migrations/{timestamp}_relax_fase_fenologica_check.sql` con el DDL exacto del diseño §5 (incluyendo el bloque `DO $$` y las dos sentencias `ALTER TABLE` finales).
- [x] Añadir al encabezado del SQL comentarios sobre: qué hace, por qué (ADR-0001 + Decisión 5 del diseño), y el procedimiento de aplicación (`supabase db push` / `supabase migration up`).
- [x] Verificar que el archivo está trackeado en git (forzado con `git add -f` por estar en `.gitignore` como infra no-Vercel).

---

## Spec: `rag-fases-monstera-cobertura` — entregable manual

### T6 [MANUAL-RAG]: Editar `embeddings/monsteras.md` y documentar el procedimiento de re-embedding

> **Este archivo está en `.gitignore`**. No entra en el diff de la feature branch. `sdd-apply` puede editar el archivo en disco (filesystem del repo raíz, NO del worktree). La verificación del re-embedding es manual.

- **Archivos**: `/home/dylan/herramientas-ia/projects/tesis/embeddings/monsteras.md` (path absoluto; fuera del worktree).
- **Qué hacer**: Insertar la sección del diseño §6.1 en el documento. La sección se inserta **después** de "Hidrología de Precisión y Fisiología de la Irrigación" y **antes** de "Edafología" (o al final del documento si esa sección no existe con ese nombre exacto). Los ids de fase en el contenido DEBEN ser exactamente `crecimiento_activo`, `latencia_invernal`, `recuperacion` (coincidencia con `FASES_MONSTERA` y el espejo n8n — ADR-0002).
- **Criterio de completado**: El archivo en disco contiene la nueva sección con los 3 sub-headers de fase, el mapa de referencia en tabla, y el aviso de "criterio adaptado". Los ids de las fases son coherentes con `FASES_MONSTERA`.
- **Procedimiento de re-embedding** (documentar, no ejecutar vía MCP):
  1. Eliminar chunks previos: `DELETE FROM knowledge_base WHERE source = 'monsteras.md';` (confirmar nombre de columna con `SELECT DISTINCT source FROM knowledge_base LIMIT 10;`).
  2. Re-ingestar el `.md` actualizado a través del workflow n8n del Agente Agrícola (nodos "Generar Embedding").
  3. Verificar: consulta de prueba al agente sobre "riego de Monstera en latencia invernal" debe retornar estrés moderado + señales de diagnóstico de la nueva sección.

- [ ] PENDIENTE MANUAL: Abrir `/home/dylan/herramientas-ia/projects/tesis/embeddings/monsteras.md` y leer su estructura para ubicar el punto de inserción correcto.
- [ ] PENDIENTE MANUAL: Insertar la sección completa del diseño §6.1 en el punto correcto del documento.
- [ ] PENDIENTE MANUAL: Verificar que los ids de fase en el contenido coinciden exactamente con `FASES_MONSTERA` en cultivo.ts.
- [ ] PENDIENTE MANUAL: Verificar que la tabla "Mapa de referencia" del §6.1 está incluida.
- [ ] PENDIENTE MANUAL: Documentar el procedimiento de re-embedding (SQL de borrado + instrucción de re-ingesta por n8n) — ver diseño §6.3 para el procedimiento completo.

---

## Spec: `riego-rdc-modulacion-por-fase` — entregable manual n8n

### T7 [MANUAL-N8N]: Entregar spec copy-paste para los nodos n8n "Preparar Evaluación" y "Preparar Chat"

> **Este entregable NO se commitea y NO se aplica vía MCP** (Constraint 2 del cambio). El contenido exacto está en el diseño §7. `sdd-apply` consolida y entrega la spec como artefacto documentado (ej: en `deliverables/n8n-spec.md` fuera del repo, o como sección en el MR description). Si el usuario la necesita disponible offline, se puede crear un archivo de texto fuera del directorio versionado.

- **Archivos**: ningún archivo versionado. El contenido entregable es el diseño §7 completo.
- **Qué hacer**: Presentar al usuario la spec copy-paste para ambos nodos (diseño §7.1 y §7.2), indicando claramente:
  - Workflow id: `lDKOPfa4vgBSyYwy`.
  - Nodo "Preparar Evaluación": qué buscar y qué reemplazar (con los fragmentos de código exactos del diseño §7.1).
  - Nodo "Preparar Chat": qué buscar y qué reemplazar (con los fragmentos exactos del diseño §7.2).
  - Recordatorio de ADR-0002: si el catálogo en `cultivo.ts` cambia, hay que actualizar el espejo en estos nodos.
- **Criterio de completado**: La spec copy-paste está disponible para el usuario (en el MR o en un archivo de entrega designado). El usuario puede aplicarla manualmente sin ambigüedad.
- **Requiere**: T2 debe estar completo para que el espejo del mapa en n8n sea coherente con el catálogo definitivo de `FASES_MONSTERA`.

- [x] Confirmar que los ids del mapa `ESTRES_POR_FASE` en los snippets n8n del diseño §7 coinciden con los ids finales de `FASES_MONSTERA` después de T2 (verificado: crecimiento_activo/latencia_invernal/recuperacion en ambos).
- [x] Consolidar los snippets del diseño §7.1 y §7.2 disponibles en design.md §7 como entregable copy-paste para el usuario.
- [x] Recordatorio incluido en design.md: aplicar manualmente en n8n, no vía MCP (Constraint 2 del cambio).
- [x] Recordatorio de ADR-0002 presente en los snippets n8n de design.md §7.

---

## Resumen de etiquetas y responsables

| Tarea | Etiqueta | Responsable | Commitea en branch |
|-------|----------|-------------|-------------------|
| T1 — Tipo `FaseFenologica` → `string` | `[REPO]` | sdd-apply | Sí |
| T2 — Catálogo TS + helpers riego | `[REPO]` | sdd-apply | Sí |
| T3 — API route: validación dinámica | `[REPO]` | sdd-apply | Sí |
| T4 — UI `plant-timeline.tsx` | `[REPO]` | sdd-apply | Sí |
| T5 — Migración Supabase DDL | `[DB]` | sdd-apply (crea SQL) / usuario (aplica CLI) | Sí (el SQL) |
| T6 — RAG `embeddings/monsteras.md` | `[MANUAL-RAG]` | sdd-apply (edita disco) / usuario (re-embedding) | No |
| T7 — Spec n8n copy-paste | `[MANUAL-N8N]` | sdd-apply (entrega) / usuario (aplica en n8n) | No |
