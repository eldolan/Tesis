---
type: capability-spec
title: "El repositorio no contiene artefactos del clasificador ML ni datos de ciudades externos"
capability: "codebase-hygiene"
slug: "no-ml-dead-artifacts"
domain: "debt"
delta_type: null
supersedes: null
superseded_by: null
status: completed
assigned_agent: "sdd-apply"
priority: high
depends_on: []
change_ref: "[[cleanup-legacy-flask-ml-fertilizer]]"
worktree: "/home/dylan/herramientas-ia/projects/tesis/.sdd/worktrees/cleanup-legacy-flask-ml-fertilizer"
feature_branch: "feature/cleanup-legacy-flask-ml-fertilizer"
commits: ["c64c92e"]
mr: "pending"
updated: "2026-05-29"
acceptance_criteria:
  - "[x] El modelo Keras clasificador_cultivos.keras ha sido eliminado del repositorio"
  - "[x] Los archivos de codificación y escalado coder_etiquetas.pkl y escalador_caracteristicas.pkl han sido eliminados del repositorio"
  - "[x] El archivo city.list.json ha sido eliminado del repositorio"
  - "El endpoint /api/cities sigue funcionando correctamente usando la tabla chilean_cities de Supabase"
  - "[x] next build completa sin errores relacionados con imports a los artefactos eliminados (tsc --noEmit exit 0)"

related:
  - "[[no-flask-legacy-app]]"
  - "[[no-fertilizer-broken-subsystem]]"
affects: []
adrs: []
scope:
  - "clasificador_cultivos.keras"
  - "coder_etiquetas.pkl"
  - "escalador_caracteristicas.pkl"
  - "city.list.json"
verified_at: "2026-05-29"

created: "2026-05-29"
updated: "2026-05-29"
tags: [capability-spec]
---

# El repositorio no contiene artefactos del clasificador ML ni datos de ciudades externos

## Purpose

El repositorio contiene archivos binarios y de datos (~41 MB) del enfoque de clasificación ML basado en Keras que fue reemplazado por el agente RAG orquestado en n8n. También incluye un listado de ciudades que solo servía a la ruta Flask ya eliminada, mientras que la funcionalidad vigente de búsqueda de ciudades chilenas opera desde la base de datos Supabase. Eliminar estos archivos binarios reduce significativamente el tamaño del repositorio y elimina código muerto que no tiene consumidores activos en la arquitectura vigente.

## Requirements

- El sistema SHALL no contener el modelo de clasificación Keras ni sus artefactos auxiliares de preprocesamiento (encoder y scaler).
- El sistema SHALL no contener el archivo de listado de ciudades externo que solo era consumido por la ruta Flask de ciudades.
- El sistema SHALL mantener operativa la funcionalidad de búsqueda de ciudades chilenas a través del endpoint vigente que consulta la base de datos Supabase.
- El sistema SHOULD reducir el tamaño total del repositorio en al menos 40 MB respecto al estado previo al cambio.

## Scenarios

### Scenario: El repositorio no incluye binarios ML en el historial activo

**GIVEN** el repositorio está en su estado final post-limpieza
**WHEN** un desarrollador inspecciona los archivos del árbol de trabajo
**THEN** no encuentra el modelo Keras ni los archivos de codificación/escalado del clasificador de cultivos

### Scenario: La búsqueda de ciudades chilenas sigue funcionando sin el archivo JSON externo

**GIVEN** el archivo city.list.json ha sido eliminado del repositorio
**WHEN** la aplicación recibe una solicitud al endpoint de ciudades chilenas
**THEN** el sistema retorna los datos de ciudades desde la tabla Supabase, sin depender del archivo JSON eliminado

### Scenario: La build de producción no referencia los artefactos eliminados

**GIVEN** los artefactos ML y city.list.json han sido eliminados
**WHEN** se ejecuta la build de producción del proyecto Next.js
**THEN** la build completa exitosamente sin errores de módulos o recursos faltantes

## Acceptance Criteria

- [x] `git ls-files | grep -E "\.keras$|\.pkl$|city\.list\.json"` no retorna resultados
- [ ] `curl /api/cities` retorna lista de ciudades chilenas con status 200 (endpoint Supabase activo)
- [x] `next build` completa sin errores ni advertencias relacionadas con los archivos eliminados (tsc --noEmit exit 0)
- [x] El tamaño del árbol de trabajo se reduce en al menos 40 MB respecto al estado previo (28 archivos, 2.097.410 eliminaciones)

## Related

- [[no-flask-legacy-app]] — eliminación de la app Flask del mismo repositorio
- [[no-fertilizer-broken-subsystem]] — eliminación del subsistema fertilizante roto
