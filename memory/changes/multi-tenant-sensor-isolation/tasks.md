# Tasks: multi-tenant-sensor-isolation

> Generado por: sdd-tasks  
> Fecha: 2026-05-23  
> Fast path: full  
> Orden de ejecución: respeta dependencias explícitas entre specs y fases del diseño.

---

## Resumen de fases y dependencias

```
FASE 1 — DB (migración SQL)
  T1: supabase/migrations/002_multi_tenant.sql
      └─ T1.1 TRUNCATE tablas existentes
      └─ T1.2 Tablas nuevas independientes (device_api_keys, notifications, decisiones_riego, chat_sessions, documents)
      └─ T1.3 Tabla sensor_onboard
      └─ T1.4 ALTER tablas sensores existentes (user_id, UNIQUE compuesto, drop columnas onboard)
      └─ T1.5 DROP policies antiguas
      └─ T1.6 ENABLE RLS + policies nuevas (9 tablas)
      └─ T1.7 Índices
      └─ T1.8 Realtime publication para sensor_onboard

FASE 2 — Deps + Auth infra
  T2: package.json                   (depende de: ninguno)
  T3: src/lib/supabase/client.ts     (depende de: T2)
  T4: src/lib/supabase/server.ts     (depende de: T2)

FASE 3 — Middleware
  T5: middleware.ts                  (depende de: T3, T4)

FASE 4 — Ingesta API
  T6: src/app/api/upload/route.ts    (depende de: T1, T4)

FASE 5 — Tipos TypeScript
  T7: src/types/index.ts             (depende de: T1)

FASE 6 — Hooks frontend
  T8: src/hooks/use-irrigation-data.ts   (depende de: T3, T7)
  T9: src/hooks/use-fertilizer-data.ts   (depende de: T3, T7)
```

---

## FASE 1 — Base de datos

### T1 — Migración SQL única: `supabase/migrations/002_multi_tenant.sql`

**Specs:** `data-isolation/user-id-column-sensors`, `data-isolation/device-api-keys-table`, `data-isolation/new-tables-schema`, `onboard-normalization/sensor-onboard-table`, `data-isolation/rls-policies-sensors`  
**Archivo:** `supabase/migrations/002_multi_tenant.sql` (crear)  
**Dependencias previas:** ninguna  
**Criterio de completado:** el archivo existe, aplica sin error con `supabase db push` o `supabase migration up`, y el schema resultante pasa las verificaciones de la fase sdd-verify.

> El archivo debe comenzar con un comentario que indique la versión y el propósito. Todas las operaciones dentro de este archivo se ejecutan en una sola transacción implícita de Supabase.

#### T1.1 — TRUNCATE tablas de sensores existentes
- [ ] Agregar `TRUNCATE TABLE sensor_riego_20, sensor_riego_40, sensor_riego_60, sensor_fertilizante CASCADE;`
- [ ] Agregar `TRUNCATE TABLE api_rate_limits CASCADE;` (si la tabla existe)
- [ ] Colocar los TRUNCATEs al inicio de la migración, antes de cualquier ALTER

#### T1.2 — Crear tablas nuevas independientes (sin FK a tablas modificadas)
- [ ] Crear tabla `device_api_keys`:
  - `key_hash text PRIMARY KEY`
  - `user_id uuid NOT NULL REFERENCES auth.users(id)`
  - `device_id text`
  - `created_at timestamptz DEFAULT now()`
  - Comentario: `-- key_hash = encode(sha256(api_key::bytea), 'hex')`
- [ ] Crear tabla `notifications`:
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id uuid NOT NULL REFERENCES auth.users(id)`
  - `message text NOT NULL`
  - `read boolean DEFAULT false`
  - `created_at timestamptz DEFAULT now()`
- [ ] Crear tabla `decisiones_riego`:
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id uuid NOT NULL REFERENCES auth.users(id)`
  - `decision text NOT NULL`
  - `razon text`
  - `sensor_data jsonb`
  - `created_at timestamptz DEFAULT now()`
- [ ] Crear tabla `chat_sessions`:
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id uuid NOT NULL REFERENCES auth.users(id)`
  - `title text`
  - `created_at timestamptz DEFAULT now()`
  - `updated_at timestamptz DEFAULT now()`
- [ ] Crear tabla `documents`:
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id uuid NOT NULL REFERENCES auth.users(id)`
  - `name text NOT NULL`
  - `content text`
  - `type text`
  - `created_at timestamptz DEFAULT now()`

#### T1.3 — Crear tabla `sensor_onboard`
- [ ] Crear tabla `sensor_onboard`:
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id uuid NOT NULL REFERENCES auth.users(id)`
  - `device_id text`
  - `temperatura numeric(5,2)`
  - `humedad numeric(5,2)`
  - `created_at timestamptz DEFAULT now()`
- [ ] Agregar constraint `UNIQUE(user_id, created_at)` en `sensor_onboard`

#### T1.4 — ALTER tablas de sensores existentes (tras TRUNCATE)
- [ ] Para cada una de las 4 tablas (`sensor_riego_20`, `sensor_riego_40`, `sensor_riego_60`, `sensor_fertilizante`):
  - [ ] `ALTER TABLE <tabla> ADD COLUMN user_id uuid NOT NULL REFERENCES auth.users(id);`
- [ ] Para las 3 tablas de riego (`sensor_riego_20`, `sensor_riego_40`, `sensor_riego_60`):
  - [ ] `ALTER TABLE <tabla> DROP COLUMN temperatura_onboard;`
  - [ ] `ALTER TABLE <tabla> DROP COLUMN humedad_onboard;`
- [ ] Reemplazar `UNIQUE(timestamp)` por `UNIQUE(user_id, timestamp)` en las 4 tablas de sensores:
  - [ ] `ALTER TABLE sensor_riego_20 DROP CONSTRAINT IF EXISTS sensor_riego_20_timestamp_key;`
  - [ ] `ALTER TABLE sensor_riego_20 ADD CONSTRAINT sensor_riego_20_user_id_timestamp_key UNIQUE (user_id, timestamp);`
  - [ ] Repetir para `sensor_riego_40`, `sensor_riego_60`, `sensor_fertilizante`

#### T1.5 — DROP policies antiguas (USING(true))
- [ ] Para cada tabla de sensores existente, eliminar policies previas de tipo `USING (true)`:
  - [ ] `DROP POLICY IF EXISTS "Allow public read" ON sensor_riego_20;`
  - [ ] `DROP POLICY IF EXISTS "Service role insert" ON sensor_riego_20;`
  - [ ] Repetir para `sensor_riego_40`, `sensor_riego_60`, `sensor_fertilizante`
  - [ ] Revisar y eliminar cualquier otra policy pública existente en estas 4 tablas

#### T1.6 — ENABLE RLS + crear policies nuevas (9 tablas)

Las 9 tablas son: `sensor_riego_20`, `sensor_riego_40`, `sensor_riego_60`, `sensor_fertilizante`, `sensor_onboard`, `notifications`, `decisiones_riego`, `chat_sessions`, `documents`.

Para cada una de las 9 tablas:
- [ ] `ALTER TABLE <tabla> ENABLE ROW LEVEL SECURITY;`
- [ ] Crear policy SELECT: `CREATE POLICY "select_own_<tabla>" ON <tabla> FOR SELECT USING (auth.uid() = user_id);`
- [ ] Crear policy INSERT (usuario browser): `CREATE POLICY "insert_own_<tabla>" ON <tabla> FOR INSERT WITH CHECK (auth.uid() = user_id);`
- [ ] Crear policy INSERT (service role): `CREATE POLICY "service_role_insert_<tabla>" ON <tabla> FOR INSERT TO service_role WITH CHECK (true);`

Para `device_api_keys` (sin policy de usuario, solo service_role):
- [ ] `ALTER TABLE device_api_keys ENABLE ROW LEVEL SECURITY;`
- [ ] `CREATE POLICY "service_role_all_device_api_keys" ON device_api_keys TO service_role USING (true) WITH CHECK (true);`

#### T1.7 — Crear índices sobre `user_id`
- [ ] `CREATE INDEX idx_sensor_riego_20_user_id ON sensor_riego_20(user_id);`
- [ ] `CREATE INDEX idx_sensor_riego_40_user_id ON sensor_riego_40(user_id);`
- [ ] `CREATE INDEX idx_sensor_riego_60_user_id ON sensor_riego_60(user_id);`
- [ ] `CREATE INDEX idx_sensor_fertilizante_user_id ON sensor_fertilizante(user_id);`
- [ ] `CREATE INDEX idx_sensor_onboard_user_id ON sensor_onboard(user_id);`
- [ ] `CREATE INDEX idx_sensor_onboard_created_at ON sensor_onboard(created_at DESC);`
- [ ] `CREATE INDEX idx_device_api_keys_user_id ON device_api_keys(user_id);`
- [ ] `CREATE INDEX idx_notifications_user_id ON notifications(user_id);`
- [ ] `CREATE INDEX idx_decisiones_riego_user_id ON decisiones_riego(user_id);`
- [ ] `CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);`
- [ ] `CREATE INDEX idx_documents_user_id ON documents(user_id);`

#### T1.8 — Agregar `sensor_onboard` a Realtime publication
- [ ] `ALTER PUBLICATION supabase_realtime ADD TABLE sensor_onboard;`

---

## FASE 2 — Dependencias y clientes Supabase

### T2 — Agregar dependencia `@supabase/ssr`

**Specs:** `auth-integration/ssr-supabase-client`  
**Archivo:** `package.json` (modificar)  
**Dependencias previas:** ninguna  
**Criterio de completado:** `package.json` lista `@supabase/ssr` en `dependencies` y el módulo está disponible en `node_modules/`.

- [ ] Ejecutar `npm install @supabase/ssr` en el worktree (o agregar la entrada manualmente a `package.json` y ejecutar `npm install`)
- [ ] Verificar que `@supabase/ssr` aparece en la sección `dependencies` de `package.json` con versión compatible

### T3 — Reescribir `src/lib/supabase/client.ts`

**Specs:** `auth-integration/ssr-supabase-client`  
**Archivo:** `src/lib/supabase/client.ts` (modificar)  
**Dependencias previas:** T2  
**Criterio de completado:** el archivo exporta `createClient()` como función (no singleton), usa `createBrowserClient` de `@supabase/ssr`, y `npx tsc --noEmit` pasa sin errores en este archivo.

- [ ] Reemplazar import de `createClient` desde `@supabase/supabase-js` por `createBrowserClient` desde `@supabase/ssr`
- [ ] Eliminar el export del singleton `supabase` (si existe como variable de módulo)
- [ ] Exportar función `createClient()` que invoca `createBrowserClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)` y retorna el cliente
- [ ] Usar las mismas variables de entorno: `process.env.NEXT_PUBLIC_SUPABASE_URL!` y `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!`
- [ ] El archivo debe incluir solo el export de `createClient` — sin efectos de módulo ni instancia global visible

### T4 — Reescribir `src/lib/supabase/server.ts`

**Specs:** `auth-integration/ssr-supabase-client`  
**Archivo:** `src/lib/supabase/server.ts` (modificar)  
**Dependencias previas:** T2  
**Criterio de completado:** el archivo exporta `createClient()` async con sesión via cookies y `supabaseAdmin` con service role. `npx tsc --noEmit` pasa sin errores.

- [ ] Agregar import de `createServerClient` desde `@supabase/ssr`
- [ ] Agregar import de `cookies` desde `next/headers`
- [ ] Agregar import de `createClient` desde `@supabase/supabase-js` (solo para `supabaseAdmin`)
- [ ] Exportar función `async function createClient()` que:
  - Llama a `const cookieStore = await cookies()`
  - Usa `createServerClient(url, anonKey, { cookies: { getAll: () => cookieStore.getAll(), setAll: (cookiesToSet) => { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } } })`
  - Retorna el cliente con sesión del usuario
- [ ] Mantener export de `supabaseAdmin` como singleton con `createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })`
- [ ] Verificar que `supabaseAdmin` usa `SUPABASE_SERVICE_ROLE_KEY` (no la anon key)

---

## FASE 3 — Middleware de autenticación

### T5 — Crear `middleware.ts` (raíz del worktree / proyecto)

**Specs:** `auth-integration/middleware-auth`  
**Archivo:** `middleware.ts` (crear en la raíz del proyecto, al mismo nivel que `next.config.ts`)  
**Dependencias previas:** T3, T4  
**Criterio de completado:** el archivo existe en la raíz, exporta `middleware` como función default y `config` con `matcher`. Un request sin cookies a una ruta protegida redirige a `/login`.

- [ ] Crear `middleware.ts` con import de `createServerClient` desde `@supabase/ssr`
- [ ] Importar `NextRequest`, `NextResponse` desde `next/server`
- [ ] Implementar la función `middleware(request: NextRequest)`:
  - Crear `supabaseResponse = NextResponse.next({ request })`
  - Instanciar `createServerClient` con `request.cookies.getAll()` y `supabaseResponse.cookies.set(...)`
  - Llamar `const { data: { user } } = await supabase.auth.getUser()` para refrescar sesión
  - Si `!user` y la ruta no es `/login` ni comienza con `/auth`, redirigir a `/login`
  - Retornar `supabaseResponse` (para propagar cookies refrescadas)
- [ ] Exportar `config` con `matcher` que excluye:
  - `_next/static/**`
  - `_next/image/**`
  - `favicon.ico`
  - Archivos con extensión (`.png`, `.jpg`, `.svg`, etc.)
  - `/api/upload` exacto
  - `/login`
  - `/auth/**`

---

## FASE 4 — Endpoint de ingesta

### T6 — Modificar `src/app/api/upload/route.ts`

**Specs:** `sensor-ingestion/api-upload-user-resolution`, `sensor-ingestion/api-upload-onboard-write`  
**Archivo:** `src/app/api/upload/route.ts` (modificar)  
**Dependencias previas:** T1 (tabla `device_api_keys` debe existir), T4 (`supabaseAdmin` disponible)  
**Criterio de completado:** el endpoint resuelve `user_id` desde API key, incluye `user_id` en todos los inserts, escribe onboard en `sensor_onboard`, no referencia columnas `temperatura_onboard`/`humedad_onboard`, y retorna 401 para keys no registradas.

#### T6.1 — Reemplazar validación estática por hash lookup
- [ ] Agregar import de `createHash` desde `node:crypto` (o `'crypto'`)
- [ ] Eliminar la validación estática con `timingSafeEqual` y la variable de entorno `SENSOR_API_KEY`
- [ ] Al inicio del handler POST: extraer `X-API-Key` del header
- [ ] Si no hay header `X-API-Key`, retornar `NextResponse.json({ error: 'Unauthorized' }, { status: 401 })` inmediatamente
- [ ] Calcular `const keyHash = createHash('sha256').update(apiKey).digest('hex')`
- [ ] Consultar `supabaseAdmin.from('device_api_keys').select('user_id, device_id').eq('key_hash', keyHash).single()`
- [ ] Si `data` es null o hay error, retornar HTTP 401
- [ ] Extraer `const { user_id, device_id } = data`

#### T6.2 — Agregar `user_id` a todos los batch objects
- [ ] En la construcción de `batch20` (filas para `sensor_riego_20`): agregar `user_id` a cada objeto del array
- [ ] En la construcción de `batch40` (filas para `sensor_riego_40`): agregar `user_id` a cada objeto del array
- [ ] En la construcción de `batch60` (filas para `sensor_riego_60`): agregar `user_id` a cada objeto del array
- [ ] En la construcción de `batchFert` (filas para `sensor_fertilizante`): agregar `user_id` a cada objeto del array
- [ ] Eliminar los campos `temperatura_onboard` y `humedad_onboard` de los objetos de `batch20`, `batch40`, `batch60`

#### T6.3 — Cambiar `onConflict` en upserts
- [ ] Cambiar `onConflict: "timestamp"` a `onConflict: "user_id,timestamp"` en el upsert de `sensor_riego_20`
- [ ] Cambiar `onConflict: "timestamp"` a `onConflict: "user_id,timestamp"` en el upsert de `sensor_riego_40`
- [ ] Cambiar `onConflict: "timestamp"` a `onConflict: "user_id,timestamp"` en el upsert de `sensor_riego_60`
- [ ] Cambiar `onConflict: "timestamp"` a `onConflict: "user_id,timestamp"` en el upsert de `sensor_fertilizante`

#### T6.4 — Crear `batchOnboard` e insertar en `sensor_onboard`
- [ ] Construir `batchOnboard`: array de objetos `{ user_id, device_id, temperatura, humedad }` extrayendo las columnas onboard del CSV (una fila por fila del CSV, no 3 repetidas)
- [ ] Si `batchOnboard` no está vacío, insertar en `sensor_onboard` via `supabaseAdmin.from('sensor_onboard').upsert(batchOnboard, { onConflict: 'user_id,created_at', ignoreDuplicates: true })`
- [ ] Si el CSV no incluye datos onboard (columnas ausentes o nulas), omitir el insert sin error

#### T6.5 — Actualizar queries de "last humidity" (si existen)
- [ ] Buscar en el archivo cualquier query a `sensor_riego_*` que obtenga la última humedad para comparar con threshold
- [ ] Agregar filtro `eq('user_id', user_id)` a esas queries para que no mezclen datos de usuarios

---

## FASE 5 — Tipos TypeScript

### T7 — Actualizar `src/types/index.ts`

**Specs:** `auth-integration/hooks-user-filter`, `onboard-normalization/frontend-onboard-query`  
**Archivo:** `src/types/index.ts` (modificar)  
**Dependencias previas:** T1 (schema definido)  
**Criterio de completado:** `npx tsc --noEmit` pasa sin errores. No existen `temperatura_onboard` ni `humedad_onboard` en ningún tipo. `SensorRiego` y `SensorFertilizante` tienen `user_id: string`. Existen los nuevos tipos.

- [ ] En `SensorRiego`: agregar campo `user_id: string`
- [ ] En `SensorRiego`: eliminar campos `temperatura_onboard` y `humedad_onboard`
- [ ] En `SensorFertilizante`: agregar campo `user_id: string`
- [ ] Agregar interfaz `SensorOnboard`:
  ```
  id: string
  user_id: string
  device_id: string | null
  temperatura: number | null
  humedad: number | null
  created_at: string
  ```
- [ ] Agregar interfaz `Notification`:
  ```
  id: string
  user_id: string
  message: string
  read: boolean
  created_at: string
  ```
- [ ] Agregar interfaz `DecisionRiego`:
  ```
  id: string
  user_id: string
  decision: string
  razon: string | null
  sensor_data: Record<string, unknown> | null
  created_at: string
  ```
- [ ] Agregar interfaz `ChatSession`:
  ```
  id: string
  user_id: string
  title: string | null
  created_at: string
  updated_at: string
  ```
- [ ] Agregar interfaz `UserDocument`:
  ```
  id: string
  user_id: string
  name: string
  content: string | null
  type: string | null
  created_at: string
  ```
- [ ] Verificar que todos los tipos exportados no tienen referencias a `temperatura_onboard` ni `humedad_onboard`

---

## FASE 6 — Hooks de datos de sensores

### T8 — Modificar `src/hooks/use-irrigation-data.ts`

**Specs:** `auth-integration/hooks-user-filter`, `onboard-normalization/frontend-onboard-query`  
**Archivo:** `src/hooks/use-irrigation-data.ts` (modificar)  
**Dependencias previas:** T3 (cliente browser), T7 (tipos actualizados)  
**Criterio de completado:** el hook usa `createClient` de `src/lib/supabase/client.ts`, obtiene `user_id` via `getUser()`, agrega filtro Realtime, retorna vacío si no autenticado. `npx tsc --noEmit` pasa sin errores.

- [ ] Cambiar el import del cliente Supabase: usar `createClient` desde `@/lib/supabase/client` (en vez del import anterior)
- [ ] Al inicializar el hook: llamar `const supabase = createClient()` dentro del hook (no a nivel de módulo)
- [ ] Obtener el usuario autenticado: `const { data: { user } } = await supabase.auth.getUser()`
- [ ] Si `!user`, retornar el estado inicial con arrays vacíos y no establecer suscripciones Realtime
- [ ] Guardar `user.id` en una variable local para usarla en filtros Realtime
- [ ] En cada uno de los 3 canales Realtime (sensor_riego_20, sensor_riego_40, sensor_riego_60): agregar `filter: \`user_id=eq.${user.id}\`` a la configuración del canal
- [ ] Eliminar cualquier referencia a `temperatura_onboard` o `humedad_onboard` en el hook
- [ ] Actualizar los tipos de los arrays de estado para que usen `SensorRiego` actualizado (con `user_id`, sin campos onboard)

### T9 — Modificar `src/hooks/use-fertilizer-data.ts`

**Specs:** `auth-integration/hooks-user-filter`  
**Archivo:** `src/hooks/use-fertilizer-data.ts` (modificar)  
**Dependencias previas:** T3 (cliente browser), T7 (tipos actualizados)  
**Criterio de completado:** el hook usa `createClient` de `src/lib/supabase/client.ts`, obtiene `user_id` via `getUser()`, agrega filtro Realtime, retorna vacío si no autenticado.

- [ ] Cambiar el import del cliente Supabase: usar `createClient` desde `@/lib/supabase/client`
- [ ] Al inicializar el hook: llamar `const supabase = createClient()` dentro del hook (no a nivel de módulo)
- [ ] Obtener el usuario autenticado: `const { data: { user } } = await supabase.auth.getUser()`
- [ ] Si `!user`, retornar el estado inicial con array vacío y no establecer suscripción Realtime
- [ ] En el canal Realtime de `sensor_fertilizante`: agregar `filter: \`user_id=eq.${user.id}\``
- [ ] Actualizar tipos del estado para que usen `SensorFertilizante` actualizado (con `user_id`)

---

## Checklist de verificación post-implementación

Estos ítems se validarán en la fase `sdd-verify`, no son tareas de implementación:

- [ ] `npx tsc --noEmit` sin errores
- [ ] `grep -r "temperatura_onboard\|humedad_onboard" src/` no retorna resultados
- [ ] `grep -n "SENSOR_API_KEY" src/app/api/upload/route.ts` no retorna resultados
- [ ] La migración aplica sin error en Supabase local (`supabase db push`)
- [ ] Las 9 tablas multi-tenant tienen RLS habilitado con policies correctas
- [ ] `device_api_keys` no es accesible para usuarios autenticados via JWT
- [ ] Un request sin sesión a ruta protegida recibe redirección a `/login`
- [ ] Un request a `/api/upload` sin sesión NO es redirigido por el middleware

---

## Notas de implementación

- **Orden estricto:** completar T1 antes de T6. Completar T2 antes de T3 y T4. Completar T3 y T4 antes de T5. Completar T3 y T7 antes de T8 y T9.
- **Sin tests:** el proyecto no tiene tests automatizados; no se marcan tareas como `[TDD]`.
- **Worktree:** todos los paths son relativos a `/home/dylan/herramientas-ia/projects/tesis/.sdd/worktrees/multi-tenant-sensor-isolation/`.
- **Variables de entorno:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — deben existir en `.env.local`.
- **DT-7 (una fila onboard por batch):** en T6.4, el `batchOnboard` tiene exactamente una fila por cada fila del CSV que sea del tipo "onboard" (no 3 repetidas para los 3 sensores de riego).
- **DT-8 (UNIQUE compuesto):** el cambio de `onConflict` en T6.3 es consecuencia directa del cambio de constraint en T1.4 — ambos deben alinearse.
