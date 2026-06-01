---
type: capability-spec
title: "El dashboard y la ruta de ingesta no contienen el subsistema fertilizante/NPK roto"
capability: "codebase-hygiene"
slug: "no-fertilizer-broken-subsystem"
domain: "debt"
delta_type: null
supersedes: null
superseded_by: null
status: completed
assigned_agent: "sdd-apply"
priority: high
depends_on:
  - "[[no-flask-legacy-app]]"
change_ref: "[[cleanup-legacy-flask-ml-fertilizer]]"
worktree: "/home/dylan/herramientas-ia/projects/tesis/.sdd/worktrees/cleanup-legacy-flask-ml-fertilizer"
feature_branch: "feature/cleanup-legacy-flask-ml-fertilizer"
commits: ["c64c92e"]
mr: "pending"
updated: "2026-05-29"
acceptance_criteria:
  - "[x] El componente fertilizer-chart.tsx ha sido eliminado del repositorio"
  - "[x] El hook use-fertilizer-data.ts ha sido eliminado del repositorio"
  - "[x] src/app/api/upload/route.ts no contiene ninguna referencia a sensor_fertilizante ni lógica NPK"
  - "[x] src/app/api/upload/route.ts existe y la ruta de ingesta de datos de sensor sigue operativa para los datos de riego"
  - "[x] El DashboardGrid no importa ni renderiza FertilizerChart (confirmado por grep)"
  - "[x] next build completa sin errores TypeScript relacionados con los símbolos eliminados (tsc --noEmit exit 0)"

related:
  - "[[no-flask-legacy-app]]"
  - "[[no-ml-dead-artifacts]]"
  - "[[sensor-ingestion]]"
affects:
  - "[[sensor-ingestion]]"
  - "[[irrigation-chart]]"
adrs: []
scope:
  - "src/components/dashboard/fertilizer-chart.tsx"
  - "src/hooks/use-fertilizer-data.ts"
  - "src/app/api/upload/route.ts"
  - "src/components/dashboard/DashboardGrid.tsx"
verified_at: "2026-05-29"

created: "2026-05-29"
updated: "2026-05-29"
tags: [capability-spec]
---

# El dashboard y la ruta de ingesta no contienen el subsistema fertilizante/NPK roto

## Purpose

El sistema de monitoreo agrícola incluye un componente de visualización de fertilizante y un hook de datos que consultan una tabla de base de datos que no existe en Supabase. Esto produce un widget vacío en el dashboard sin ningún mensaje de error visible para el usuario, degradando silenciosamente la experiencia. Además, la ruta de ingesta de datos del sensor procesa y descarta datos NPK hacia esa misma tabla inexistente. Eliminar este subsistema roto elimina el comportamiento silencioso defectuoso y deja la ruta de ingesta limpia para los datos de riego que sí funcionan.

## Requirements

- El sistema SHALL no contener el componente de gráfica de fertilizante ni el hook de datos de fertilizante.
- El sistema SHALL no contener lógica de procesamiento NPK ni intentos de escritura a la tabla `sensor_fertilizante` en la ruta de ingesta de datos.
- El sistema SHALL conservar la ruta de ingesta de datos del sensor (`/api/upload`) operativa para los datos de riego (temperatura, humedad, conductividad) con autenticación por API key.
- El sistema SHALL no mostrar ningún widget silenciosamente vacío en el dashboard relacionado con fertilizante.
- El sistema SHOULD que el dashboard compile y renderice sin errores TypeScript tras la eliminación de los componentes y hooks.

## Scenarios

### Scenario: El dashboard no muestra el widget de fertilizante roto

**GIVEN** un usuario autenticado accede al dashboard de monitoreo agrícola
**WHEN** el dashboard carga y renderiza todos sus componentes
**THEN** no aparece ningún widget de fertilizante ni gráfica NPK, sin mensajes de error silenciosos ni espacios vacíos inesperados

### Scenario: La ingesta de datos del sensor de riego sigue funcionando

**GIVEN** un dispositivo IoT envía datos de sensor al endpoint de ingesta con su API key válida
**WHEN** la ruta de ingesta procesa la solicitud
**THEN** los datos de temperatura, humedad y conductividad del suelo se almacenan correctamente en las tablas de riego de Supabase, sin intentar procesar ni insertar datos NPK

### Scenario: La build del proyecto no referencia símbolos del subsistema eliminado

**GIVEN** el subsistema fertilizante ha sido eliminado completamente
**WHEN** se ejecuta la build de producción del proyecto Next.js
**THEN** la build completa exitosamente sin errores TypeScript por imports o referencias a FertilizerChart, useFertilizerData, o tipos relacionados con fertilizante

### Scenario: No quedan referencias huérfanas en el código del dashboard

**GIVEN** el componente FertilizerChart y el hook useFertilizerData han sido eliminados
**WHEN** se inspeccionan los archivos del dashboard y de la aplicación
**THEN** no existe ningún import o referencia a los símbolos eliminados en el código fuente activo

## Acceptance Criteria

- [x] `git ls-files | grep -E "fertilizer-chart\.tsx|use-fertilizer-data\.ts"` no retorna resultados
- [x] `grep -r "sensor_fertilizante\|FertilizerChart\|useFertilizerData\|FertilizerData" src/` no retorna resultados
- [x] `grep -r "N_20cm\|P_20cm\|K_20cm\|nitrogeno\|fosforo\|potasio" src/app/api/upload/` no retorna resultados relacionados con inserción NPK
- [x] `src/app/api/upload/route.ts` existe y conserva lógica completa de riego (batch20/40/60/batchOnboard)
- [x] `next build` completa sin errores TypeScript (tsc --noEmit exit 0)
- [x] El archivo TypeScript de tipos (`src/types/index.ts`) no contiene `SensorFertilizante` ni `FertilizerData`

## Related

- [[no-flask-legacy-app]] — eliminación de la app Flask del mismo repositorio
- [[no-ml-dead-artifacts]] — eliminación de artefactos ML del mismo repositorio
- [[sensor-ingestion]] — spec de la ruta de ingesta de datos que debe conservarse operativa
- [[irrigation-chart]] — visualización de datos de riego que permanece intacta
