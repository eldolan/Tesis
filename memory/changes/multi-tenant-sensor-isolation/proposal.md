---
type: proposal
change_name: "multi-tenant-sensor-isolation"
domain: "feature"
status: approved
iteration: 2
created: "2026-05-23"
updated: "2026-05-23"
tags: [proposal]
---

# Propuesta: multi-tenant-sensor-isolation

## Intent

Aislar los datos de sensores IoT por usuario individual (`auth.users`), de modo que cada usuario solo vea y gestione los datos de su propio dispositivo. Actualmente el sistema es single-tenant implícito: las cuatro tablas de sensores no tienen `user_id`, las policies RLS son públicas (`USING(true)`), y el cliente Supabase no propaga sesión de usuario. Adicionalmente, las lecturas de temperatura y humedad del sensor onboard del dispositivo (Arduino/Raspberry Pi) están mezcladas como columnas nullable en las tablas `sensor_riego_*`, cuando conceptualmente son datos distintos a la humedad del suelo. Este cambio establece la base de seguridad multi-tenant y normaliza el schema separando datos onboard a su propia tabla.

## Scope

**Incluye:**
- Migración SQL: agregar `user_id UUID NOT NULL REFERENCES auth.users(id)` a las 4 tablas de sensores existentes + crear 4 tablas nuevas (`notifications`, `decisiones_riego`, `chat_sessions`, `documents`) con `user_id NOT NULL`
- Nueva tabla `sensor_onboard` con columnas `user_id`, `device_id`, `temperatura`, `humedad`, `created_at` para lecturas del sensor onboard del dispositivo IoT
- Eliminar columnas `temperatura_onboard` y `humedad_onboard` de las tablas `sensor_riego_20`, `sensor_riego_40`, `sensor_riego_60`
- Tabla `device_api_keys` para mapear API key de dispositivo IoT a `user_id`
- RLS policies `auth.uid() = user_id` en todas las tablas (incluyendo `sensor_onboard`)
- Integración de `@supabase/ssr` para auth SSR en cliente browser y server
- Middleware Next.js para proteger rutas
- Actualización de hooks (`useIrrigationData`, `useFertilizerData`) para filtrar por usuario
- Actualización del endpoint `/api/upload` para resolver `user_id` desde API key y escribir datos onboard en la tabla separada
- Actualización de componentes frontend que muestren temperatura/humedad onboard para leer desde `sensor_onboard`

**Excluye explícitamente:**
- Multi-tenancy a nivel de organización (Approach C descartado — over-engineering para el scope)
- Migración de datos existentes (se asume TRUNCATE previo — proyecto en desarrollo/tesis)
- Implementación de UI de login/registro (solo la infraestructura de auth)
- Integración con n8n (webhook pendiente sin código en el codebase)
- Tests automatizados (fuera de scope de este cambio)

## Approach Propuesto

**Approach B + B1 + normalización onboard**: Migración limpia con `user_id NOT NULL` desde el inicio, mapeo API key a `user_id` vía tabla `device_api_keys`, y separación de lecturas onboard a tabla dedicada. El dispositivo IoT sigue enviando su `X-API-Key` sin cambios; el backend resuelve el `user_id` buscando el hash de la key en `device_api_keys`. Las lecturas de temperatura y humedad del sensor onboard se escriben en `sensor_onboard` en vez de las columnas nullable en `sensor_riego_*`, que se eliminan. Se instala `@supabase/ssr` para crear clientes browser/server que propaguen el JWT de sesión, habilitando que RLS filtre automáticamente. Las policies actuales `USING(true)` se reemplazan por `USING(auth.uid() = user_id)`. El frontend se actualiza para que los hooks de datos reciban solo registros del usuario autenticado, y los componentes que muestran datos onboard apuntan a la nueva tabla.

## Esfuerzo Estimado

**M** — 9-10 archivos existentes a modificar + 1 migración SQL nueva + 2 tablas nuevas (`device_api_keys`, `sensor_onboard`) + eliminación de columnas en 3 tablas + instalación de 1 dependencia. La separación de datos onboard agrega trabajo incremental menor (una tabla extra, ajuste de ingesta y queries), pero sigue siendo estructural sin lógica de negocio compleja.

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Constraint NOT NULL falla si hay datos existentes sin `user_id` | Media | TRUNCATE previo en la migración (aceptable en desarrollo/tesis) |
| Realtime no filtra por RLS si el cliente no pasa JWT | Media | Integrar `@supabase/ssr` correctamente; verificar que suscripciones usen session client |
| Schema de tablas nuevas (`notifications`, etc.) no definido en codebase | Baja | Definir schema mínimo en fase sdd-spec basado en el intent del sistema |
| n8n webhook podría insertar datos sin `user_id` por ruta alternativa | Baja | Fuera de scope; documentar como requisito futuro si n8n se integra |
| Frontend referencia columnas onboard eliminadas causando errores de runtime | Media | Buscar todas las referencias a `temperatura_onboard` y `humedad_onboard` en sdd-explore/sdd-spec y actualizar en sdd-apply |

## Trade-offs

- **A favor**: Schema limpio sin deuda técnica legacy; datos onboard separados de datos de humedad del suelo (normalización correcta); policies RLS simples y auditables; no requiere cambios en firmware del dispositivo IoT (la API key existente se reutiliza); alineado con el modelo 1 usuario = 1 dispositivo del intent
- **En contra**: Requiere borrar datos existentes en desarrollo (aceptable para tesis); la tabla `device_api_keys` agrega un lookup extra en cada ingesta (impacto negligible); las 4 tablas nuevas se crean con schema mínimo que podría requerir alteraciones futuras; la separación onboard requiere actualizar tanto ingesta como queries de lectura
