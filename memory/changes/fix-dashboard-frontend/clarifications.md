# Clarifications — fix-dashboard-frontend

## Iteración 1 — Preguntas (2026-05-24)

Para fijar el approach del Bug 1 (charts de riego) necesitamos confirmar la **unidad real de la humedad** almacenada en la BD. El eje Y actual está hardcodeado a `[40,100]` (vista sumatoria) y a `["auto","auto"]` (vista apilado), mientras los datos llegan en escala ~0–4. El factor de normalización a 0–100 % depende de cuál sea la unidad de origen.

1. **¿Cuál es la unidad real de la humedad en la BD?** Elegir una:
   - **(a)** Escala 0–4 que representa porcentaje cuartilado → normalizar con `valor × 25` para obtener 0–100 %.
   - **(b)** Fracción 0–1 (m³/m³ o proporción) → normalizar con `valor × 100`.
   - **(c)** Ya está en porcentaje (0–100) y el problema es solo el dominio del eje Y → no normalizar, solo fijar `domain={[0,100]}`.
   - **(d)** Otra (especificar unidad y rango esperado).

2. **¿Prefieres que el factor de normalización se confirme contra una muestra real de la BD durante la fase de design** (consultando una lectura reciente de `notifications`/sensores), en lugar de fijarlo ahora? Sí / No.

3. **Notificaciones (Bug 2): ¿el popover debe marcar notificaciones como leídas** (lo que implicaría una escritura `UPDATE` sobre la tabla, ampliando el scope más allá de read-only), o se mantiene estrictamente de solo lectura en este cambio? Solo lectura / Permitir marcar como leída.

## Iteración 1 — Respuestas (2026-05-24)

1. **Unidad de humedad — RESUELTO (verificado contra BD por el orquestador).** Los sensores operan en escala **0–100%** (es la unidad correcta de la columna `humedad`). Los valores actuales 0–4 son lecturas reales bajas porque los sensores están al aire (sin calibrar / detectando humedad ambiente), no en tierra ni agua. **Decisión: NO normalizar ni escalar.** El fix del Bug 1 es únicamente fijar el dominio del eje Y a `[0,100]` explícito en AMBAS vistas (sumatoria y apilado), reemplazando el `[40,100]` hardcodeado (sumatoria) y el `["auto","auto"]` (apilado). Las lecturas bajas se mostrarán honestamente cerca del piso; cuando los sensores entren en tierra (40–80%) el chart lo reflejará. Las `ReferenceArea` 40–100 siguen teniendo sentido (escala %). → El riesgo "Alta" de factor de normalización incorrecto queda **eliminado** (no hay normalización).

2. **Verificación contra BD — HECHO.** El orquestador ya consultó `sensor_riego_20/40/60`: r20 ∈ {0,2,3,4} (n=309), r40 ∈ {0,1} (n=308), r60 vacía, `temperatura_c` NULL en todas. Confirmado que el dato ya es %, solo con lecturas bajas actuales.

3. **Notificaciones — Permitir marcar como leída.** El popover incluye la acción de marcar como leída → `UPDATE notifications SET read=true WHERE id=... AND user_id=auth.uid()` (RLS aplica). El hook `use-notifications.ts` lee + actualiza `read`. No crea ni elimina filas.

### Nota de scope (data layer)
La causa de fondo de los valores 0–4 (sensores sin calibrar) y de `temperatura_c` NULL y `sensor_riego_60` vacía vive en la **capa de ingesta** (firmware `codigo sensores/main.cpp`, `serial-bridge`, n8n) — fuera de este repo Vercel. Queda como follow-up documentado; NO entra en este cambio frontend.
