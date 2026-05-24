---
type: adr
number: "0001"
title: "Autenticación de dispositivos IoT via SHA-256 hash lookup en device_api_keys"
status: accepted
date: "2026-05-23"
change_ref: multi-tenant-sensor-isolation
decision_ref: DT-3
supersedes: null
superseded_by: null
tags: [security, iot, ingestion]
---

# ADR-0001: Autenticación de dispositivos IoT via SHA-256 hash lookup

## Contexto

El sistema necesita autenticar dispositivos IoT que envían datos via `/api/upload` con un header `X-API-Key`. En el modelo multi-tenant, cada API key debe mapearse a un `user_id` propietario del dispositivo. El firmware del dispositivo no puede modificarse para incluir JWT ni tokens de sesión de Supabase Auth.

## Decisión

Almacenar las API keys como hashes SHA-256 en la tabla `device_api_keys`. El endpoint calcula `sha256(X-API-Key)` y hace un lookup directo contra `key_hash` (PRIMARY KEY) para obtener `user_id` y `device_id`. Se elimina la validación estática con `SENSOR_API_KEY` de las variables de entorno.

## Consecuencias

**Positivas:**
- Lookup O(1) via PK en vez de comparison O(n) contra todas las keys
- Keys protegidas en BD (hash irreversible, sin salt necesario para API keys de alta entropía)
- Compatible con el firmware existente (el dispositivo sigue enviando X-API-Key)
- Escalable a múltiples dispositivos/usuarios sin cambios en el endpoint

**Negativas:**
- Requiere un proceso de administración para registrar keys en device_api_keys (manual o via UI futura)
- Si un dispositivo pierde su key, no hay forma de recuperarla (solo generar una nueva)
- La variable de entorno SENSOR_API_KEY deja de usarse (breaking change para deploys existentes)

## Alternativas Descartadas

- **bcrypt**: diseñado para passwords interactivos, no para API keys. Overhead de hashing innecesario.
- **Timing-safe comparison contra todas las keys**: O(n), no escala.
- **JWT por dispositivo via Supabase Auth**: requiere cambios en el firmware del Arduino/Raspberry Pi.
