# Exploración: multi-tenant-sensor-isolation

## Estado Actual

[fuente: código `/supabase/migrations/001_create_tables.sql`]

El sistema actualmente es **single-tenant implícito**: las cuatro tablas de sensores
(`sensor_riego_20`, `sensor_riego_40`, `sensor_riego_60`, `sensor_fertilizante`) no tienen
columna `user_id`. RLS está habilitado en todas ellas, pero las policies vigentes son de
**lectura pública** (`USING (true)`) y escritura sin restricción de usuario:

```sql
CREATE POLICY "Allow public read" ON sensor_riego_20 FOR SELECT USING (true);
CREATE POLICY "Service role insert" ON sensor_riego_20 FOR INSERT WITH CHECK (true);
```

Esto significa que cualquier cliente autenticado (o incluso anónimo) puede leer todos los
datos de sensores sin restricción de usuario.

**Auth**: No hay integración de Supabase Auth en el codebase actual. El cliente Supabase
`src/lib/supabase/client.ts` usa `createClient` con la anon key directamente, sin pasar
sesión de usuario. No existe `@supabase/ssr`, no hay middleware de autenticación, ni rutas
protegidas. [fuente: código `src/lib/supabase/client.ts`]

**Ingesta de datos**: El endpoint `POST /api/upload` recibe CSV desde dispositivo IoT,
autenticado vía `X-API-Key` (shared secret), inserta en las cuatro tablas usando
`supabaseAdmin` (service role). No hay `user_id` en ningún insert. [fuente: código
`src/app/api/upload/route.ts`]

**Hooks de frontend**: `useIrrigationData` y `useFertilizerData` hacen `SELECT *` sin filtro
de usuario, con suscripción Realtime a insertas en las tablas de sensores. [fuente: código
`src/hooks/use-irrigation-data.ts`, `src/hooks/use-fertilizer-data.ts`]

**Tablas mencionadas en el intent que NO existen en el codebase**:
- `notifications` — no existe en migración ni en código
- `decisiones_riego` — no existe en migración ni en código
- `chat_sessions` — no existe en migración ni en código
- `documents` — no existe en migración ni en código

[fuente: código `supabase/migrations/001_create_tables.sql`]

**n8n**: existe `N8N_WEBHOOK_URL` y `N8N_AUTH_TOKEN` en `.env.local`, pero no hay código en
`src/` que consuma estas variables. El webhook de n8n es una integración pendiente de
implementar. [fuente: código `.env.local`]

**Tests**: No existen archivos de test en el proyecto. [fuente: código — búsqueda exhaustiva]

---

## Archivos Afectados

| Archivo | Rol | Impacto |
|---------|-----|---------|
| `supabase/migrations/001_create_tables.sql` | DDL inicial de todas las tablas | Punto de referencia; las tablas de sensores necesitan nueva migración con `user_id` |
| `src/lib/supabase/client.ts` | Cliente Supabase browser (anon key) | Debe actualizarse para propagar JWT de sesión del usuario autenticado |
| `src/lib/supabase/server.ts` | Cliente Supabase server (service role) | Necesita variante con session JWT para queries RLS-aware desde Server Components |
| `src/hooks/use-irrigation-data.ts` | Fetch + Realtime para sensores de riego | Debe filtrar por `user_id` del usuario autenticado; suscripción Realtime necesita filtro |
| `src/hooks/use-fertilizer-data.ts` | Fetch + Realtime para sensor fertilizante | Mismo impacto que hook de riego |
| `src/app/api/upload/route.ts` | Ingesta CSV desde dispositivo IoT | Debe recibir `user_id` (o mapearlo desde API key) e incluirlo en cada insert de batch |
| `src/types/index.ts` | Tipos TypeScript de entidades | `SensorRiego` y `SensorFertilizante` deben agregar `user_id: string` |
| `src/app/layout.tsx` | Layout raíz | Necesita integrar Supabase Auth provider/session si se usa SSR auth |
| `src/components/layout/navbar.tsx` | Navbar con iconos de bell/user | Actualmente son `<a href="#">` estáticos; necesita conectar a sesión real |
| `package.json` | Dependencias | Falta `@supabase/ssr` para auth SSR correcta |

**Tablas a crear (nueva migración)**:

| Tabla | Estado | Acción |
|-------|--------|--------|
| `notifications` | No existe | Crear con `user_id` desde el inicio |
| `decisiones_riego` | No existe | Crear con `user_id` desde el inicio |
| `chat_sessions` | No existe | Crear con `user_id` desde el inicio |
| `documents` | No existe | Crear con `user_id` desde el inicio |

---

## Approaches Posibles

### Approach A: Migración incremental — `user_id` nullable + backfill

Agregar `user_id UUID REFERENCES auth.users(id)` como columna **nullable** a las tablas de
sensores existentes. Crear las cuatro tablas nuevas con `user_id NOT NULL`. Actualizar RLS
policies gradualmente.

- **Pros**: No rompe datos existentes en producción. Permite migración sin downtime. Backfill
  puede ejecutarse con un usuario "sistema" o admin.
- **Contras**: Período de transición con datos sin `user_id` hace las policies RLS más
  complejas (`user_id IS NULL OR user_id = auth.uid()`). Requiere backfill script. Mayor
  riesgo de inconsistencia durante el período de transición.
- **Esfuerzo**: L

### Approach B: Migración limpia — `user_id NOT NULL` desde el inicio (RECOMENDADO)

Dado que el proyecto está en desarrollo/tesis (sin datos de producción reales que proteger),
crear una nueva migración que: (1) elimina las policies públicas existentes, (2) agrega
`user_id UUID NOT NULL REFERENCES auth.users(id)` a las cuatro tablas de sensores, (3) crea
las cuatro tablas nuevas con `user_id NOT NULL`, (4) agrega RLS policies
`auth.uid() = user_id` en todas las tablas, (5) agrega índices sobre `user_id`. Actualizar
la ingesta para pasar `user_id`. Integrar `@supabase/ssr` para auth.

- **Pros**: Schema limpio desde el inicio. Policies RLS simples y seguras. No hay datos
  legacy que gestionar. Alineado con el intent del cambio.
- **Contras**: Si hay datos existentes en la BD, requieren borrado o backfill previo. El
  endpoint `/api/upload` debe recibir el `user_id` de alguna forma (ver sub-approach).
- **Esfuerzo**: M

**Sub-decisión para la ingesta** (dentro del Approach B):

- **B1 — Mapeo API Key → user_id**: Crear tabla `device_api_keys(key_hash, user_id)` que
  mapea cada API key de dispositivo a un `user_id`. El endpoint `/api/upload` busca el
  `user_id` a partir del hash de la key. Pros: el dispositivo IoT no necesita cambios.
  Contras: tabla adicional a gestionar.
- **B2 — user_id en header del request**: El dispositivo envía `X-User-Id` además de
  `X-API-Key`. El endpoint valida ambos. Pros: más simple. Contras: el dispositivo debe
  conocer el `user_id` de antemano.
- **B3 — Service role inserta con user_id fijo por deploy**: Una variable de entorno
  `DEFAULT_USER_ID` define el usuario del sistema. Pros: mínimo cambio en ingesta. Contras:
  rompe el modelo multi-tenant real si hay múltiples usuarios.

### Approach C: Tenant a nivel de organización (RLS por grupo)

Introducir una tabla intermedia `tenants` y usar `tenant_id` en lugar de `user_id`. Permite
múltiples usuarios por organización.

- **Pros**: Más escalable para escenarios multi-organización.
- **Contras**: Complejidad innecesaria dado el intent explícito ("cada usuario tiene su
  propio dispositivo IoT"). Over-engineering para el scope actual.
- **Esfuerzo**: XL

---

## Recomendación

**Approach recomendado**: B (migración limpia) + sub-approach B1 (mapeo API key → user_id)

**Justificación**: El proyecto está en etapa de desarrollo/tesis, sin datos de producción
irreemplazables. El Approach B con schema limpio es más directo, produce RLS policies simples
y seguras, y alinea exactamente con el intent del cambio. El sub-approach B1 para la ingesta
preserva la interfaz del dispositivo IoT (no requiere cambios en el firmware/hardware) al
mapear la API key existente al `user_id` del propietario del dispositivo.

**Orden de implementación sugerido**:
1. Agregar `@supabase/ssr` a las dependencias
2. Nueva migración SQL: `user_id NOT NULL` en tablas existentes + crear tablas nuevas + RLS
3. Crear tabla `device_api_keys` + seed con API key existente mapeada al usuario admin/tesis
4. Actualizar `src/app/api/upload/route.ts`: lookup de `user_id` desde API key
5. Actualizar `src/lib/supabase/client.ts` con `createBrowserClient` de `@supabase/ssr`
6. Actualizar `src/lib/supabase/server.ts` con `createServerClient` de `@supabase/ssr`
7. Actualizar hooks para filtrar por usuario autenticado + Realtime con filtro `user_id`
8. Actualizar `src/types/index.ts` con `user_id`
9. Middleware de auth (Next.js middleware.ts) para proteger rutas

---

## Riesgos Identificados

- **Constraint NOT NULL en datos existentes**: Si la BD de desarrollo ya tiene filas en las
  tablas de sensores sin `user_id`, la migración fallará. Mitigación: ejecutar `TRUNCATE`
  previo en la migración, o usar `ALTER COLUMN ... SET DEFAULT` temporal.
- **Realtime con RLS**: Supabase Realtime respeta RLS solo si el cliente pasa el JWT de
  usuario. El cliente actual con anon key sin sesión no recibirá eventos filtrados por
  `user_id`. Mitigación: actualizar cliente con `@supabase/ssr` y pasar sesión correctamente.
- **`@supabase/ssr` no está en package.json**: Requiere `npm install @supabase/ssr`.
  Actualmente el proyecto usa `createClient` directo de `@supabase/supabase-js` sin el
  helper SSR. Los patrones de `createBrowserClient`/`createServerClient` son distintos.
- **Tablas nuevas sin schema definido**: `notifications`, `decisiones_riego`, `chat_sessions`,
  `documents` no tienen schema en ninguna parte del codebase. Deberán definirse en la fase
  `sdd-propose`/`sdd-spec` con base en el intent del sistema (IA agrícola + chat + docs).
- **Sin tests**: No hay cobertura de tests en el proyecto. Cualquier cambio de RLS es
  difícil de verificar automáticamente. Mitigación: crear tests de integración con Supabase
  CLI o confiar en verificación manual con diferentes usuarios.
- **Ingesta desde n8n**: El webhook n8n existe en `.env.local` pero no hay código que lo
  consuma. Si n8n también inserta datos en las tablas de sensores (ruta alternativa a
  `/api/upload`), esa ruta también debe incluir `user_id`. Requiere clarificación.
