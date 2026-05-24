---
type: adr
number: "0002"
title: "Patrón de clientes Supabase con @supabase/ssr: browser, server y admin"
status: accepted
date: "2026-05-23"
change_ref: multi-tenant-sensor-isolation
decision_ref: DT-4
supersedes: null
superseded_by: null
tags: [auth, supabase, architecture]
---

# ADR-0002: Patrón de clientes Supabase con @supabase/ssr

## Contexto

El proyecto necesita que las queries de frontend y Server Components propaguen la sesión del usuario para que RLS filtre automáticamente. El cliente actual usa `createClient` directo de `@supabase/supabase-js` sin sesión, y `supabaseAdmin` con service role. Se necesita integrar `@supabase/ssr` manteniendo la capacidad de operaciones privilegiadas.

## Decisión

Establecer tres tipos de clientes Supabase:

1. **Browser client** (`src/lib/supabase/client.ts`): `createBrowserClient` de `@supabase/ssr`. Exportado como función `createClient()`. Propaga cookies de sesión automáticamente. Usado por hooks y componentes client.

2. **Server client** (`src/lib/supabase/server.ts` — `createClient()`): `createServerClient` de `@supabase/ssr` con `cookies()` de `next/headers`. Función async. Usado por Server Components y Route Handlers que necesitan datos filtrados por RLS.

3. **Admin client** (`src/lib/supabase/server.ts` — `supabaseAdmin`): `createClient` de `@supabase/supabase-js` con service role key. Singleton. Usado exclusivamente para operaciones privilegiadas (ingesta, admin tasks). Bypass de RLS.

## Consecuencias

**Positivas:**
- Separación clara de responsabilidades: client-side, server-side con sesión, server-side privilegiado
- RLS funciona automáticamente para queries de usuario sin filtros manuales
- Tree-shaking efectivo: el browser client no carga código de server
- Patrón alineado con documentación oficial de Supabase

**Negativas:**
- Todos los imports de `supabase` existentes deben actualizarse al nuevo patrón de función
- `createClient` como nombre es ambiguo entre browser y server — se diferencia por el path de import

## Alternativas Descartadas

- **Singleton browser**: `createBrowserClient` ya es singleton internamente; exponer como función es el patrón idiomático
- **Un solo archivo con todo**: mezcla server/client, causa errores de importación en el boundary de Next.js
