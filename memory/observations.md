# Observations

## 2026-05-23 | architecture | Autenticación de dispositivos IoT via SHA-256 hash lookup
Los dispositivos IoT se autentican via X-API-Key cuyo hash SHA-256 se busca en device_api_keys para resolver user_id. Reemplaza la validación estática con variable de entorno SENSOR_API_KEY. Ver ADR-0001.

## 2026-05-23 | architecture | Patrón de clientes Supabase con @supabase/ssr
Tres tipos de clientes: browser (createBrowserClient), server con sesión (createServerClient + cookies), admin (service role singleton). Separados en client.ts y server.ts. Ver ADR-0002.

## 2026-05-23 | architecture | Aislamiento multi-tenant via user_id + RLS
Todas las tablas de datos tienen user_id NOT NULL con RLS auth.uid()=user_id. Constraints UNIQUE cambian de (timestamp) a (user_id, timestamp). Service role bypassa RLS para ingesta. Ver ADR-0003.
