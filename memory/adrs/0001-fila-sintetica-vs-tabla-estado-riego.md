---
type: adr
id: "0001"
slug: fila-sintetica-vs-tabla-estado-riego
title: "Fila sintética en sensor_riego_20 vs tabla dedicada para señal de estado inmediata"
status: accepted
created: "2026-06-16"
change: estado-riego-no-actualiza-tras-agente-chat
---

# ADR-0001: Fila sintética en `sensor_riego_20` vs tabla dedicada `estado_riego`

## Contexto

El agente de chat (n8n) controla el enchufe de riego vía Tuya API pero no escribe en Supabase. El frontend detecta el estado de riego escuchando INSERTs en `sensor_riego_20` a través de Realtime. El gap entre la acción del agente y la próxima lectura del hardware (~5 min) genera una UX de latencia inaceptable.

Se necesita un mecanismo para que el INSERT ocurra de forma inmediata tras la acción del agente.

## Decisión

Usar **fila sintética en `sensor_riego_20`** marcada con `es_valido = false`, en lugar de crear una tabla dedicada `estado_riego`.

La fila sintética porta:
- `es_evento_riego = true/false` (señal de estado)
- `es_valido = false` (marca que excluye la fila de gráficos y cálculos de humedad)
- `humedad = 0.0` (satisface constraint NOT NULL; filtrada antes de cualquier render)

## Justificación

| Criterio | Fila sintética (elegida) | Tabla `estado_riego` (descartada) |
|----------|--------------------------|-----------------------------------|
| Esfuerzo | S — 2 nodos en n8n | M — migración + frontend + n8n |
| Cambio schema | No | Sí (nueva tabla + RLS + Realtime) |
| Cambio frontend | No | Sí (nueva suscripción) |
| Separación de concerns | Mezcla señales de control con mediciones | Limpia |
| Riesgo de contaminación de datos | Bajo (es_valido=false filtrado en todas las rutas de consumo) | Ninguno |
| Reversibilidad | Alta (quitar 2 nodos) | Media (requiere migración de rollback) |

La separación de concerns que ofrece la tabla dedicada es arquitectónicamente preferible a largo plazo, pero el costo de implementación no está justificado para un fix de urgencia con un único usuario. La deuda se documenta en el backlog como candidato futuro.

## Consecuencias

**Positivas:**
- Dashboard refleja el estado en <1 s tras la acción del agente.
- Zero cambios en el frontend y zero migraciones de schema.
- Reversible: eliminar los 2 nodos de n8n restaura el estado anterior.

**Negativas / deuda técnica:**
- `sensor_riego_20` contiene filas no provenientes del hardware físico. Cualquier query futura sobre esta tabla debe ser consciente de `es_valido = false`.
- El campo `humedad = 0.0` en filas sintéticas puede confundir análisis ad-hoc directos sobre la tabla (sin filtro `es_valido`).
- A escala multi-tenant (múltiples usuarios), cada usuario necesitaría su propio `user_id` en las filas sintéticas; el `user_id` hardcodeado en n8n deberá refactorizarse (deuda: `fix-user-id-hardcoded-n8n`).

## Referencias

- Propuesta: `changes/estado-riego-no-actualiza-tras-agente-chat/proposal.md`
- Diseño: `changes/estado-riego-no-actualiza-tras-agente-chat/design.md`
