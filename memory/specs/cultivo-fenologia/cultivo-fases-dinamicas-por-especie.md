---
type: capability-spec
title: "Catálogo de fases fenológicas dinámicas por especie"
capability: "cultivo-fenologia"
slug: "cultivo-fases-dinamicas-por-especie"
domain: "feature"
delta_type: null
supersedes: null
superseded_by: null
status: review
assigned_agent: "sdd-apply"
priority: high
depends_on: []
change_ref: "[[fases-cultivo-funcionales]]"
worktree: "/home/dylan/herramientas-ia/projects/tesis/.sdd/worktrees/fases-cultivo-funcionales"
feature_branch: "feature/fases-cultivo-funcionales"
commits:
  - "63b1e8c"
  - "554ded5"
  - "0cd8662"
mr: ""
acceptance_criteria:
  - "[x] El catálogo de fases es consultable por especie y retorna las fases específicas de esa especie"
  - "[x] Al consultar una especie sin catálogo propio, el sistema retorna el conjunto genérico de 6 fases"
  - "[x] Cada fase incluye un nivel de estrés RDC recomendado"
  - "[x] La API de cultivo rechaza fases que no pertenecen al catálogo de la especie activa"
  - "[x] La UI muestra únicamente las fases del catálogo de la especie configurada para el cultivo"

related:
  - "[[cultivo-fase-cableada-riego]]"
  - "[[cultivo-plant-timeline-ui]]"
affects:
  - "[[riego-rdc-modulacion-por-fase]]"
adrs:
  - "[[0001-fase-fenologica-string-validada-en-runtime]]"
scope:
  - "src/lib/cultivo.ts"
  - "src/types/index.ts"
  - "src/app/api/cultivo/route.ts"
verified_at: null

created: "2026-06-15"
updated: "2026-06-15"
tags: [capability-spec]
---

# Catálogo de fases fenológicas dinámicas por especie

## Purpose

El sistema de cultivo usa un conjunto único y fijo de fases fenológicas para todas las especies, sin distinción. Esto impide que distintas plantas con ciclos de vida diferentes reciban recomendaciones de riego apropiadas a su biología. Esta spec establece que el sistema mantiene un catálogo de fases organizado por especie y lo usa en todas las interacciones de cultivo — consultas de UI, validación de API y cálculos de riego.

## Requirements

- El sistema SHALL mantener un catálogo de fases fenológicas organizado por especie, donde cada especie tiene sus propias fases con identificadores únicos y niveles de estrés RDC recomendados.
- El sistema SHALL ofrecer un conjunto de 6 fases genéricas como fallback para especies sin catálogo propio.
- El sistema SHALL exponer una función que, dada una especie, retorna las fases disponibles para esa especie (propias o genéricas).
- El sistema SHALL validar que la fase fenológica registrada en un cultivo pertenezca al catálogo de la especie de ese cultivo.
- El sistema SHALL rechazar actualizaciones de fase que usen valores no presentes en el catálogo de la especie.
- El sistema SHOULD incluir en el catálogo, como mínimo, la especie Monstera con sus fases propias.

## Scenarios

### Scenario: Consulta de fases para especie con catálogo propio

**GIVEN** el sistema tiene un catálogo de fases para la especie Monstera  
**WHEN** se solicitan las fases disponibles para un cultivo de Monstera  
**THEN** el sistema retorna las fases específicas de Monstera (no el conjunto genérico)

### Scenario: Consulta de fases para especie sin catálogo

**GIVEN** el sistema no tiene un catálogo de fases específico para la especie "Tomate"  
**WHEN** se solicitan las fases disponibles para un cultivo de Tomate  
**THEN** el sistema retorna el conjunto de 6 fases genéricas como fallback

### Scenario: Cambio de fase a valor válido

**GIVEN** un cultivo de Monstera con fase "crecimiento_activo"  
**WHEN** el usuario registra un cambio de fase a "latencia_invernal" (que existe en el catálogo de Monstera)  
**THEN** el sistema acepta el cambio y guarda la nueva fase

### Scenario: Cambio de fase a valor inválido

**GIVEN** un cultivo de Monstera  
**WHEN** el usuario intenta registrar una fase que no existe en el catálogo de Monstera  
**THEN** el sistema rechaza la operación e informa que la fase no es válida para esa especie

### Scenario: Catálogo disponible sin consulta a base de datos

**GIVEN** el catálogo de fases está definido en la capa de aplicación  
**WHEN** cualquier componente necesita las fases de una especie  
**THEN** el catálogo se resuelve sin realizar consultas adicionales a la base de datos

## Acceptance Criteria

- [x] El catálogo de fases es consultable por especie y retorna las fases específicas de esa especie
- [x] Al consultar una especie sin catálogo propio, el sistema retorna el conjunto genérico de 6 fases
- [x] Cada fase incluye un nivel de estrés RDC recomendado
- [x] La API de cultivo rechaza fases que no pertenecen al catálogo de la especie activa
- [x] La UI muestra únicamente las fases del catálogo de la especie configurada para el cultivo

## Related

- [[cultivo-fase-cableada-riego]] — la fase activa del catálogo determina el estrés RDC por defecto en el riego
- [[cultivo-plant-timeline-ui]] — la UI de línea de tiempo consume el catálogo dinámico de fases
