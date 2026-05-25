---
type: adr
number: "0004"
title: "legacy-peer-deps=true en .npmrc para integrar @visx/xychart bajo React 19"
status: accepted
date: "2026-05-25"
change_ref: fix-dashboard-realtime-status
decision_ref: DT-1
capability: irrigation-chart
supersedes: null
superseded_by: null
tags: [frontend, dependencies, charting, react19, npm]
---

# ADR-0004: legacy-peer-deps=true para @visx/xychart bajo React 19

## Contexto

El gráfico de humedad del dashboard migra de Recharts a `@visx/xychart` (spec `[[chart-visx-rendering]]`, objetivo 3 del intent). El proyecto corre React 19.2.4 (`react`/`react-dom` 19.2.4 en `package.json`).

`@visx/xychart@3.12.0` declara `peerDependencies` `react: "^16.8.0 || ^17.0.0 || ^18.0.0"` — excluye React 19. Además depende transitivamente de `@visx/react-spring@3.12.0`, que ancla `@react-spring/web: "^9.4.5"` (solo v9). La versión de `@react-spring/web` que soporta React 19 es la v10 (latest 10.1.0). Con la resolución estricta de peers por defecto de npm 7+, el `npm install` aborta con `ERESOLVE` por el doble conflicto (peer react ≤18 y peer @react-spring/web ^9 vs el v10 requerido por React 19).

El proyecto no tiene `.npmrc`. El build de Vercel usa la misma resolución de npm, por lo que el conflicto bloquea también el deploy.

## Decisión

Crear `.npmrc` en la raíz del repositorio con:

```
legacy-peer-deps=true
```

E instalar como dependencias explícitas:

- `@visx/xychart@^3.12.0`
- `@visx/responsive@^3.12.0`
- `@react-spring/web@^10`

`legacy-peer-deps=true` instruye a npm a ignorar los conflictos de peer dependencies (comportamiento pre-npm-7), permitiendo que `@react-spring/web@10` (compatible con React 19) coexista con la declaración `^9` de `@visx/react-spring`. El conflicto es declarativo, no funcional: React 19 es retrocompatible con los hooks de v18 que usa `@react-spring/web`, y la animación de las series de `XYChart` ejecuta sin errores de runtime en la práctica.

Se elige el flag **global de proyecto** (`.npmrc`) en lugar de un `overrides` puntual porque el conflicto involucra una cadena transitiva (`@visx/xychart` → `@visx/react-spring` → `@react-spring/web`) y porque Vercel honra `.npmrc` en build de forma consistente, garantizando paridad entre local y deploy.

## Consecuencias

**Positivas:**
- `npm install` y `npm run build` completan sin `ERESOLVE` en local y en Vercel.
- Habilita el estilo XYChart de visx (objetivo 3) con `@react-spring/web@10` compatible con React 19.
- Solución estándar y mínima para un conflicto de peers puramente declarativo.

**Negativas:**
- `legacy-peer-deps=true` aplica a **todas** las instalaciones del proyecto, no solo a visx: puede enmascarar conflictos de peers genuinos de dependencias futuras.
- Mitigación: revisar el `package-lock.json` generado tras el primer install para confirmar que no se degradaron versiones de otras dependencias; documentar esta decisión como punto de revisión al subir dependencias mayores.

## Alternativas Descartadas

- **`overrides` puntual en `package.json`** (forzar `@react-spring/web` y/o el peer react de visx): más quirúrgico, pero requiere fijar versiones en varios puntos de la cadena transitiva y es frágil ante bumps de `@visx/*`; además no garantiza la misma resolución en el build de Vercel sin configuración adicional.
- **`@visx/xychart@3.12.0` peers forzados con `--force`**: `--force` es más agresivo que `legacy-peer-deps` (ignora más validaciones) y no es persistible de forma limpia en `.npmrc` para el build.
- **Approach B — primitivas visx (`@visx/scale` + `@visx/axis` + `@visx/shape`)**: evita por completo `@react-spring/web` y el peer conflict, pero exige SVG manual, ResizeObserver y tooltip a mano (esfuerzo L). Se reserva como fallback si `@react-spring/web@9/10` produjera fallos de runtime bajo React 19.
- **Mantener Recharts** (Approach C): incumple el objetivo 3 del intent.
