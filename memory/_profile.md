---
type: project-profile
updated: "2026-06-16"
---

# tesis-nextjs

## Stack

- **Lenguaje**: TypeScript 5.x
- **Framework**: Next.js 16.2.2
- **Runtime**: Node.js runtime
- **UI Library**: React 19.2.4
- **Package manager**: pnpm 10.33.0
- **Styling**: Tailwind CSS 4.x + Tailwind Merge
- **Test runner**: Not configured
- **Linter**: ESLint 9.x (eslint-config-next)
- **Build/bundler**: Next.js built-in (Turbopack for dev)
- **CI**: GitHub Actions

## Dependencias destacadas

- **Backend/Auth**: Supabase (@supabase/ssr, @supabase/supabase-js)
- **UI Components**: Base UI React, shadcn, Lucide React, cmdk
- **Charts**: Recharts 3.8.0
- **Animation**: Framer Motion 12.38.0, React Spring
- **Markdown**: react-markdown, remark-gfm

## Convenciones

- **Commits**: Conventional Commits (english)
- **Branches**: feature/, fix/, feature/*, ver estructura en repo
- **PR base**: develop (integration target)
- **Type safety**: Strict TypeScript configuration in place

## Notas del proyecto

Tesis project: Sistema de riego inteligente con Dashboard real-time en Next.js 16 con React 19.
Backend: Supabase (PostgreSQL + Realtime + Edge Functions).
Agente de chat: n8n workflow (orchestration de riego).
Observación inicial: Issue en real-time sync — estado de riego no se refleja en UI tras actualización en n8n.
