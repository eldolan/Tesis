---
type: spec
title: "Middleware Next.js para proteger rutas y refrescar sesión"
capability: auth-integration
slug: middleware-auth
domain: feature
delta_type: code-change
supersedes: null
superseded_by: null
status: completed
assigned_agent: null
priority: high
depends_on: [ssr-supabase-client]
change_ref: multi-tenant-sensor-isolation
acceptance_criteria:
  - Existe archivo middleware.ts en la raíz del proyecto Next.js
  - Las rutas del dashboard son inaccesibles para usuarios no autenticados (redirigen a login)
  - El middleware refresca el token de sesión automáticamente antes de que expire
  - Las rutas públicas (login, registro, /api/upload) no están protegidas por el middleware
related: [ssr-supabase-client]
affects:
  - middleware.ts
adrs: []
scope: ./
verified_at: 2026-05-23
---

## Purpose

Proteger las rutas del dashboard de la aplicación de modo que solo usuarios autenticados puedan acceder, y mantener la sesión de Supabase refrescada automáticamente entre requests para que el JWT no expire durante el uso normal.

## Requirements

- El proyecto SHALL crear el archivo `middleware.ts` en la raíz del proyecto Next.js (al mismo nivel que `next.config.ts`).
- El middleware SHALL interceptar todas las rutas del dashboard (e.g., `/dashboard/*`, o la ruta raíz `/` si es la app principal) y verificar si existe sesión activa.
- Si no existe sesión activa, el middleware SHALL redirigir al usuario a la página de login o a la ruta de autenticación de Supabase.
- El middleware SHALL refrescar el token de sesión usando `supabase.auth.getUser()` para mantener la sesión válida.
- Las rutas `/api/upload` y cualquier página de autenticación SHALL estar excluidas de la protección del middleware (matcher pattern adecuado).
- El middleware SHOULD usar `createServerClient` de `@supabase/ssr` con manejo de cookies de request/response.

## Scenarios

**Scenario 1 — Usuario no autenticado es redirigido a login**

GIVEN que un usuario no autenticado intenta acceder a una ruta protegida del dashboard  
WHEN el middleware intercepta la request  
THEN verifica que no hay sesión activa  
AND redirige al usuario a la página de login  
AND no permite acceder al contenido del dashboard

**Scenario 2 — Usuario autenticado accede normalmente**

GIVEN que el usuario A tiene una sesión activa válida  
WHEN navega a una ruta protegida del dashboard  
THEN el middleware verifica la sesión  
AND permite el acceso  
AND refresca el token de sesión si está próximo a expirar

**Scenario 3 — Endpoint /api/upload no es interceptado**

GIVEN que el dispositivo IoT envía datos a `/api/upload` con su API key  
WHEN la request llega al servidor  
THEN el middleware NO intercepta esta ruta (excluida del matcher)  
AND el endpoint procesa la request normalmente con su propia autenticación via API key

**Scenario 4 — Sesión expirada redirige a login**

GIVEN que el usuario A tenía una sesión que expiró  
WHEN navega a cualquier ruta del dashboard  
THEN el middleware detecta que el token es inválido o expirado  
AND redirige al usuario a la página de login

## Acceptance Criteria

- Existe el archivo `middleware.ts` en la raíz del proyecto con el matcher configurado.
- Un request sin cookies de sesión a una ruta del dashboard recibe una respuesta de redirección (HTTP 302/307).
- Un request con cookies de sesión válidas a una ruta del dashboard pasa correctamente.
- Un request a `/api/upload` sin cookies de sesión no es redirigido por el middleware.
- El middleware está exportado como función default y tiene el `config` con `matcher` definido.
