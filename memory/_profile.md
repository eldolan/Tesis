---
type: project-profile
updated: "2026-06-15"
---

# tesis-nextjs

## Stack

- **Lenguaje**: TypeScript 5.x (strict mode, target ES2017, moduleResolution: bundler)
- **Framework**: Next.js 16.2.2 (App Router, React 19.2.4)
- **Runtime UI**: React 19 con Server Components y Client Components (`"use client"`)
- **Gestor de paquetes**: npm (package-lock.json presente; pnpm no confirmado — usar npm)
- **Estilos**: Tailwind CSS 4.x + tw-animate-css + tailwind-merge + clsx
- **Componentes UI**: shadcn (v4.1.2) sobre @base-ui/react + lucide-react + framer-motion + @react-spring/web
- **Gráficos**: recharts 3.x
- **Backend/DB**: Supabase (@supabase/supabase-js 2.x + @supabase/ssr 0.10.x) — PostgreSQL + pgvector (vector 1536 dims)
- **Test runner**: ninguno detectado (sin jest.config ni vitest.config)
- **Linter**: ESLint 9 (eslint-config-next/core-web-vitals + typescript)
- **Build/bundler**: Next.js built-in (Turbopack disponible via `next dev --turbo`)
- **CI**: ninguno detectado (sin .github/workflows)

## Arquitectura

- **App Router**: `src/app/` con layout, páginas y API routes
- **Componentes**: `src/components/dashboard/` (plant-timeline, irrigation-chart, soil-chat, etc.)
- **Dominio cultivo**: `src/lib/cultivo.ts` — fuente de verdad de fases fenológicas y niveles de estrés (RDC Callejas)
- **Tipos compartidos**: `src/types/index.ts` (CultivoConfig, FaseFenologica, NivelEstres, etc.)
- **Supabase migrations**: `supabase/migrations/` (una migración RAG: knowledge_base con pgvector + match_documents)
- **RAG vector store**: tabla `knowledge_base` (corpus compartido, acceso service_role via n8n)
- **Automatización/Riego**: n8n externo — workflow "Agente Agrícola" (id: lDKOPfa4vgBSyYwy), NO en este repo
- **Documentación tesis**: `documentacion/` (incluye PDF de Callejas sobre metodología RDC)
- **Embeddings**: directorio `embeddings/` (corpus pre-procesado para RAG)

## Convenciones

- **Commits**: Conventional Commits en inglés (feat, fix, refactor, chore, etc.)
- **Branches**: `feature/{nombre}`, `fix/{nombre}` desde `develop`
- **PR base**: `develop` (integración), `main` (producción)
- **Alias de paths**: `@/*` → `src/*`
- **Idioma código**: comentarios y documentación en español; código/variables en inglés o español según contexto

## Notas del proyecto

- La lógica de decisión de riego vive en n8n (externo), no en este repo. `src/lib/cultivo.ts` define el catálogo de fases y la función `prEfectivo()` que debe mantenerse sincronizada con los nodos de código n8n.
- El campo `nivel_estres` en `CultivoConfig` es la palanca activa de modulación de riego. El campo `fase_fenologica` modula el riego mediante semántica DEFAULT sobrescribible: `nivelEstresEfectivo()` retorna el estrés de la fase activa cuando no hay nivel manual guardado (`nivel_estres === 'ninguno'`), y el nivel manual cuando lo hay.
- El RAG del agente agrícola está en la tabla `knowledge_base` de Supabase, consultada via función SQL `match_documents`.
- user_id de prueba hardcodeado en n8n: `7d2cbed5-...` (ver workflows).
- Fases fenológicas son dinámicas por especie: `fasesParaEspecie(especie)` en `cultivo.ts` retorna el catálogo específico de la especie (ej: 3 fases para Monstera) con fallback a `FASES_GENERICAS` (6 fases) si no hay catálogo propio.
