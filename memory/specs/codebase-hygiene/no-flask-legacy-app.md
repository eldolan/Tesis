---
type: capability-spec
title: "El repositorio no contiene la aplicación Flask legacy"
capability: "codebase-hygiene"
slug: "no-flask-legacy-app"
domain: "debt"
delta_type: null
supersedes: null
superseded_by: null
status: review
assigned_agent: "sdd-apply"
priority: high
depends_on: []
change_ref: "[[cleanup-legacy-flask-ml-fertilizer]]"
worktree: "/home/dylan/herramientas-ia/projects/tesis/.sdd/worktrees/cleanup-legacy-flask-ml-fertilizer"
feature_branch: "feature/cleanup-legacy-flask-ml-fertilizer"
commits: ["c64c92e"]
mr: ""
acceptance_criteria:
  - "[x] Los archivos app.py y wsgi.py han sido eliminados del repositorio"
  - "[x] El directorio panel_control/ y todo su contenido han sido eliminados del repositorio"
  - "[x] El archivo requirements.txt no contiene dependencias exclusivas de Flask (Flask, Flask-SQLAlchemy, gunicorn, Werkzeug, Jinja2, blinker, itsdangerous, click, greenlet, SQLAlchemy, psycopg2-binary, MarkupSafe)"
  - "[x] El archivo requirements.txt conserva requests, PyJWT y python-dotenv (consumidos por serial_bridge.py)"
  - "[x] next build completa sin errores relacionados con imports Python o Flask (tsc --noEmit exit 0)"

related:
  - "[[no-ml-dead-artifacts]]"
  - "[[no-fertilizer-broken-subsystem]]"
affects:
  - "[[sensor-ingestion]]"
adrs: []
scope:
  - "app.py"
  - "wsgi.py"
  - "panel_control/**"
  - "requirements.txt"
verified_at: null

created: "2026-05-29"
updated: "2026-05-29"
tags: [capability-spec]
---

# El repositorio no contiene la aplicación Flask legacy

## Purpose

El repositorio `eldolan/Tesis` contiene código y configuración de una app Flask que precedió a la arquitectura vigente (Next.js + n8n + Supabase). Esta app ya no se ejecuta, no recibe mantenimiento y confunde a desarrolladores y agentes sobre la arquitectura real del sistema. Eliminarla reduce la superficie de ambigüedad y alinea el contenido del repositorio con la arquitectura que la tesis documenta.

## Requirements

- El sistema SHALL no contener los puntos de entrada de la aplicación Flask (`app.py`, `wsgi.py`) ni el paquete del panel de control (`panel_control/`).
- El sistema SHALL mantener en `requirements.txt` únicamente las dependencias Python con consumidores vivos confirmados (`requests`, `PyJWT`, `python-dotenv`), eliminando todas las exclusivas de Flask.
- El sistema SHALL conservar intacto el script de puente serial (`scripts/serial-bridge/serial_bridge.py`) y sus dependencias operativas.
- El sistema SHOULD mantener una lista mínima y justificada de dependencias Python para que el propósito de `requirements.txt` sea inequívoco.

## Scenarios

### Scenario: Desarrollador que clona el repo no encuentra la app Flask

**GIVEN** un desarrollador clona el repositorio por primera vez
**WHEN** explora la raíz del proyecto buscando el punto de entrada de la aplicación
**THEN** encuentra únicamente el proyecto Next.js y los scripts de soporte IoT, sin rastros de la app Flask legacy

### Scenario: requirements.txt no instala el servidor web Flask

**GIVEN** el repositorio está en su estado final post-limpieza
**WHEN** un desarrollador ejecuta la instalación de dependencias Python desde requirements.txt
**THEN** no se instala Flask, gunicorn, ni ninguna de sus dependencias exclusivas, y el entorno Python resultante no puede servir la app Flask

### Scenario: Scripts de soporte IoT siguen funcionando

**GIVEN** el repositorio está en su estado final post-limpieza
**WHEN** el script de puente serial requiere sus dependencias Python
**THEN** las dependencias que consume (`requests`, `PyJWT`, `python-dotenv`) siguen presentes en `requirements.txt`

## Acceptance Criteria

- [x] `git ls-files | grep -E "^app\.py$|^wsgi\.py$|^panel_control/"` no retorna resultados
- [x] `grep -E "^Flask|^Flask-SQLAlchemy|^gunicorn|^Werkzeug|^Jinja2|^blinker|^itsdangerous|^click|^greenlet|^SQLAlchemy|^psycopg2-binary|^MarkupSafe" requirements.txt` no retorna resultados
- [x] `grep -E "^requests|^PyJWT|^python-dotenv" requirements.txt` retorna las tres dependencias conservadas
- [x] `scripts/serial-bridge/serial_bridge.py` existe sin modificaciones

## Related

- [[no-ml-dead-artifacts]] — eliminación de artefactos ML del mismo repositorio
- [[no-fertilizer-broken-subsystem]] — eliminación del subsistema fertilizante roto
