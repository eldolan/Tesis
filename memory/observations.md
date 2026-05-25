# Observations

## 2026-05-24 | debt-candidate | FertilizerChart excluido del bento y con Recharts sin migrar
**Detectado por**: sdd-explore en `fix-dashboard-realtime-status`
**Ubicación**: `src/components/dashboard/fertilizer-chart.tsx`
**Descripción**: `FertilizerChart` existe como componente completo (con Recharts, hook `useFertilizerData`, Realtime) pero no está importado ni renderizado en `DashboardGrid`. Si el objetivo 3 migra `IrrigationChart` a visx, `FertilizerChart` queda como la única componente usando Recharts — inconsistencia de stack.
**Promoción sugerida**: incluir migración en este cambio o `sdd new fix-fertilizer-chart-visx --domain debt`

## 2026-05-24 | pre-adr | Necesidad de .npmrc legacy-peer-deps para @visx/xychart bajo React 19
**Detectado por**: sdd-explore en `fix-dashboard-realtime-status`
**Ubicación**: raíz del proyecto (`.npmrc` inexistente)
**Descripción**: `@visx/xychart@3.12.0` declara peer `react: '^16.8.0 || ^17.0.0 || ^18.0.0'`; su dep transitiva `@visx/react-spring@3.12.0` requiere `@react-spring/web: '^9.4.5'` (no v10). El proyecto usa React 19.2.4. Instalar visx requiere `.npmrc` con `legacy-peer-deps=true`. Decisión de ADR pendiente.

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

## 2026-05-25 | architecture | legacy-peer-deps=true para @visx/xychart bajo React 19
Migración del gráfico a @visx/xychart@3.12.0 requiere `.npmrc legacy-peer-deps=true` por doble peer conflict: peer react ≤18 y dep transitiva @visx/react-spring → @react-spring/web ^9 (vs v10 que soporta React 19). Conflicto declarativo, no funcional. Flag global elegido sobre overrides puntual por la cadena transitiva y paridad con build de Vercel. Ver ADR-0004.

## 2026-05-25 | discrepancia-spec | dashboard-bento-grid AC vs proposal sobre FertilizerChart
**Detectado por**: sdd-design en `fix-dashboard-realtime-status`.
El AC de `[[dashboard-bento-grid]]` dice "FertilizerChart permanece en el layout (aunque en Recharts)", pero `FertilizerChart` NO está montado en `DashboardGrid` hoy (componente huérfano) y la proposal APROBADA lo excluye del bento y lo registra como deuda (DT-2/DT-3). Decisión de diseño (D8): respetar la proposal — no integrar FertilizerChart; el AC se satisface trivialmente (no se rompe lo que no se monta). **Follow-up para sdd-verify**: no marcar FAIL por este AC; la proposal es la fuente de verdad de scope. No se crea delta de spec (discrepancia de redacción, no evolución de comportamiento).

## 2026-05-25 | design-decision | Gaps en visx por filtrado de nulls por serie
@visx/xychart AnimatedLineSeries no tiene flag connectNulls. Gaps (spec irrigation-chart-sensor-gaps) se resuelven filtrando nulls por serie (cada serie recibe su array sin nulos) en vez de segmentar. Cubre gaps de borde (caso típico, ingesta densa); un hueco interior largo se conectaría con recta. Mitigación reservada (no por defecto): segmentar la serie afectada solo si sdd-verify lo evidencia.
