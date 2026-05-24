# Observations

## 2026-05-23 | architecture | Autenticación de dispositivos IoT via SHA-256 hash lookup
Los dispositivos IoT se autentican via X-API-Key cuyo hash SHA-256 se busca en device_api_keys para resolver user_id. Reemplaza la validación estática con variable de entorno SENSOR_API_KEY. Ver ADR-0001.

## 2026-05-23 | architecture | Patrón de clientes Supabase con @supabase/ssr
Tres tipos de clientes: browser (createBrowserClient), server con sesión (createServerClient + cookies), admin (service role singleton). Separados en client.ts y server.ts. Ver ADR-0002.

## 2026-05-23 | architecture | Aislamiento multi-tenant via user_id + RLS
Todas las tablas de datos tienen user_id NOT NULL con RLS auth.uid()=user_id. Constraints UNIQUE cambian de (timestamp) a (user_id, timestamp). Service role bypassa RLS para ingesta. Ver ADR-0003.

## 2026-05-24 | debt-candidate | Re-fetch infinito potencial en hooks de riego/fertilizante
**Detectado por**: sdd-explore en `fix-dashboard-frontend`
**Ubicación**: src/hooks/use-irrigation-data.ts:91-120, src/hooks/use-fertilizer-data.ts:44-59
**Descripción**: El callback Realtime resetea `initialized.current = false` y llama directamente a `fetchInitial()`. Si llegan múltiples INSERT events en ráfaga (p. ej., batch upload), se disparan múltiples re-fetches completos de toda la tabla en paralelo. Sin debounce ni throttle, puede saturar las conexiones de Supabase y producir race conditions en el estado.
**Promoción sugerida**: `sdd new fix-realtime-refetch-debounce --domain debt`

## 2026-05-24 | finding | Directorio duplicado `tesis-nextjs/` es código muerto
**Detectado por**: orquestador en `fix-dashboard-frontend` (post sdd-spec).
La app activa es **`src/` en la raíz** (tsconfig `@/*` → `./src/*`, `package.json`/`next.config.ts` en raíz). Existe además `tesis-nextjs/src/...` con una copia stale de los componentes (incluye un `notifications-listener.tsx` huérfano no importado por la app raíz, que usa el pattern obsoleto `import { supabase }` y campos en español `severity/tipo/titulo/mensaje` que NO existen en la tabla real). sdd-spec asignó por error scope a `tesis-nextjs/src/...`; el orquestador corrigió los paths a `src/...`. **Follow-up**: eliminar `tesis-nextjs/` (deuda de limpieza, fuera de scope de este cambio).

## 2026-05-24 | data-verification | Schema real de tablas (verificado contra BD por orquestador)
- `notifications`: columnas `id, user_id, title, message, read(bool, nullable), created_at` — **coincide** con el tipo `Notification` de `src/types/index.ts`. 223 filas, todas `read=false`. La UI debe usar estos campos (NO los del listener huérfano).
- `sensor_riego_20/40/60`: columna `humedad` ya en escala 0–100% (verificado: r20 ∈ {0,2,3,4}, r40 ∈ {0,1}, r60 vacía; valores bajos = sensores al aire). `temperatura_c` llega NULL. NO normalizar en frontend.
