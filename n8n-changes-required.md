# Cambios Requeridos en n8n

Guía paso a paso para configurar los workflows de n8n con el nuevo flujo de datos del serial bridge.  
No se requiere conocimiento previo del proyecto — cada sección es autocontenida.

## Prerrequisitos

- [ ] Migración SQL 002 aplicada al proyecto Supabase cloud:
  ```bash
  supabase db push --project-ref <tu-project-ref>
  ```
- [ ] n8n corriendo en Docker (`http://192.168.0.236:5678` o `https://n8n.mimichis.cl`)
- [ ] Acceso de administrador a la UI de n8n

---

## 1. Importar Workflows

Los archivos JSON están en `n8n-workflows/` dentro del repositorio.

### 1.1 WF1 — Ingesta de Sensores

1. En n8n, ir al menú de hamburguesa (☰) → **Settings** → **Import from File**
2. Seleccionar el archivo: `n8n-workflows/workflow1-ingesta.json`
3. Confirmar la importación — el workflow aparecerá como inactivo

### 1.2 WF2 — Simulador

1. **Settings** → **Import from File**
2. Seleccionar: `n8n-workflows/workflow2-simulador.json`
3. El simulador requiere que WF1 esté activo para funcionar (ver sección 7)

### 1.3 WF3 — Agente Agrícola

1. **Settings** → **Import from File**
2. Seleccionar: `n8n-workflows/workflow3-agente-agricola.json`
3. Requiere credenciales configuradas (ver sección 2) antes de activarse

---

## 2. Configurar Credenciales

### 2.1 Supabase

| Campo | Valor |
|-------|-------|
| Nombre en n8n | `Supabase account` |
| Host | `<SUPABASE_URL>` (de `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`) |
| API Key | `<SUPABASE_SERVICE_ROLE_KEY>` (de Supabase Dashboard → Settings → API → service_role) |

Nodos que usan esta credencial en **WF1**:
- `Leer última hum 20`
- `Leer última hum 40`
- `Insertar sensor_riego_20`
- `Insertar sensor_riego_40`

Nodos en **WF3**: aproximadamente 12 nodos de consulta a tablas Supabase.

Pasos para crear la credencial:
1. En n8n ir a **Credentials** (menú lateral izquierdo)
2. Clic en **Add Credential** → buscar "Supabase"
3. Ingresar Host y API Key
4. Guardar con el nombre exacto: `Supabase account`

### 2.2 OpenAI

| Campo | Valor |
|-------|-------|
| Nombre en n8n | `OpenAI account` |
| API Key | `<OPENAI_API_KEY>` (de tu cuenta en platform.openai.com) |

Nodos que la usan: aproximadamente 8 nodos de inferencia en WF3.

### 2.3 IFTTT

| Campo | Valor |
|-------|-------|
| Tipo | HTTP Request (no tiene credencial nativa) |
| Webhook URL riego ON | `https://maker.ifttt.com/trigger/riego_on/with/key/<IFTTT_KEY>` |
| Webhook URL riego OFF | `https://maker.ifttt.com/trigger/riego_off/with/key/<IFTTT_KEY>` |

Nodos: 2 nodos `Tool IFTTT` en WF3. La URL completa va directamente en el campo URL de cada nodo.

---

## 3. Modificar Nodo "Validar y Procesar" en WF1

Este es el cambio más importante. El payload que llega al webhook cambió de formato.

### 3.1 Payload anterior (ya no válido)

```json
{
  "sensor_20": { "humedad": 45 },
  "sensor_40": { "humedad": 62 },
  "ds18b20_temp": 22.5
}
```

### 3.2 Payload nuevo (serial bridge → n8n)

```json
{
  "h20": 45,
  "h40": 62,
  "temp_amb": 22.5,
  "hum_amb": 68.3
}
```

### 3.3 Código JavaScript actualizado

Abrir el nodo **"Validar y Procesar"** en WF1 y reemplazar **todo el código** con:

```javascript
const data = $('Webhook').first().json.body;
const lastHum20 = $('Leer última hum 20').first().json?.humedad ?? null;
const lastHum40 = $('Leer última hum 40').first().json?.humedad ?? null;

// Mapear contrato JSON del serial bridge al schema Supabase
const hum20 = Math.max(data.h20 ?? 0, 0);
const hum40 = Math.max(data.h40 ?? 0, 0);
const tempAmb = data.temp_amb ?? null;
const humAmb = data.hum_amb ?? null;
const now = new Date().toISOString();

const UMBRAL = 10;
function detectarRiego(actual, anterior) {
  if (actual == null || anterior == null || anterior <= 0) return false;
  return ((actual - anterior) / anterior) * 100 >= UMBRAL;
}

const esRiego20 = detectarRiego(hum20, lastHum20);
const esRiego40 = detectarRiego(hum40, lastHum40);

const humPromedio = (hum20 + hum40) / 2;
let alerta = null;
if (humPromedio < 55) alerta = 'humedad_critica';
else if (esRiego20 || esRiego40) alerta = 'evento_riego';

return [{
  json: {
    registro_20: {
      timestamp: now,
      temperatura_c: null,
      humedad: Math.round(hum20 * 100) / 100,
      temperatura_onboard: tempAmb,
      humedad_onboard: humAmb,
      es_evento_riego: esRiego20
    },
    registro_40: {
      timestamp: now,
      temperatura_c: null,
      humedad: Math.round(hum40 * 100) / 100,
      temperatura_onboard: tempAmb,
      humedad_onboard: humAmb,
      es_evento_riego: esRiego40
    },
    alerta,
    resumen: { hum20, hum40, tempAmb, humAmb, humPromedio, esRiego20, esRiego40 }
  }
}];
```

**Cambios clave respecto al código anterior:**
- `data.sensor_20.humedad` → `data.h20`
- `data.sensor_40.humedad` → `data.h40`
- `data.ds18b20_temp` → eliminado (sensor no existe en el hardware)
- `temperatura_c` siempre es `null` (no hay sensor DS18B20)
- Nuevos campos de salida: `temperatura_onboard` y `humedad_onboard` (desde HTS221)

---

## 4. Modificar Nodo "Insertar sensor_riego_20" en WF1

Abrir el nodo **"Insertar sensor_riego_20"** y agregar los siguientes campos en la sección `fieldsUi`:

| Campo | Expresión n8n |
|-------|---------------|
| `temperatura_onboard` | `{{ $json.registro_20.temperatura_onboard }}` |
| `humedad_onboard` | `{{ $json.registro_20.humedad_onboard }}` |

Si el nodo usa modo "Mapping" (no "Fields"), agregar las mismas expresiones en el JSON de body:
```json
{
  "temperatura_onboard": "={{ $json.registro_20.temperatura_onboard }}",
  "humedad_onboard": "={{ $json.registro_20.humedad_onboard }}"
}
```

---

## 5. Modificar Nodo "Insertar sensor_riego_40" en WF1

Análogo a la sección 4, pero con referencias a `registro_40`:

| Campo | Expresión n8n |
|-------|---------------|
| `temperatura_onboard` | `{{ $json.registro_40.temperatura_onboard }}` |
| `humedad_onboard` | `{{ $json.registro_40.humedad_onboard }}` |

---

## 6. Sincronizar Token de Autenticación

WF3 tiene un nodo **"Auth"** con un token hardcodeado que protege el endpoint del agente agrícola.  
El frontend Next.js necesita ese mismo token para hacer requests.

Pasos:
1. Abrir WF3 en n8n → buscar el nodo llamado **"Auth"**
2. Copiar el valor del token que aparece en ese nodo (campo `value` o similar)
3. Abrir el archivo `.env.local` en la raíz de `projects/tesis/`
4. Agregar o actualizar la variable:
   ```bash
   N8N_AUTH_TOKEN=<token-copiado-del-nodo-auth>
   ```
5. Hacer redeploy del proyecto en Vercel (o reiniciar el servidor de desarrollo)

---

## 7. Activar Workflows

**Orden de activación** (importante — WF2 depende de WF1 activo):

1. Activar **WF1 — Ingesta de Sensores** primero
   - Ir al listado de workflows → toggle ON en WF1
   - El webhook `/webhook/sensor-data` queda activo
2. Activar **WF2 — Simulador**
   - WF2 envía POSTs al webhook de WF1; requiere WF1 activo
3. Activar **WF3 — Agente Agrícola**
   - Solo activar si las credenciales (sección 2) están todas configuradas

---

## 8. Verificación con curl

Probar el webhook de WF1 antes de conectar el Arduino:

```bash
curl -X POST http://192.168.0.236:5678/webhook/sensor-data \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <SENSOR_API_KEY>" \
  -d '{"h20":45,"h40":62,"temp_amb":22.5,"hum_amb":68.3}'
```

Reemplazar `<SENSOR_API_KEY>` con el valor del nodo de autenticación de WF1.

**Resultado esperado:**
- HTTP 200
- Body: `{"message":"ok"}` o similar
- En Supabase: nueva fila en `sensor_riego_20` y otra en `sensor_riego_40` con:
  - `humedad` = 45 (o 62 respectivamente)
  - `temperatura_onboard` = 22.5
  - `humedad_onboard` = 68.3
  - `temperatura_c` = NULL
  - `conductividad_us_cm` = NULL
  - `ph` = NULL

---

## 9. Checklist Post-Configuración

Verificar que todo funciona antes de conectar el Arduino:

- [ ] WF1 activo y procesando: enviar curl de prueba → aparecen filas en Supabase
- [ ] Campos `temperatura_onboard` y `humedad_onboard` tienen valores (no NULL) en las filas insertadas
- [ ] Campos `conductividad_us_cm`, `ph`, `temperatura_c` son NULL en las filas insertadas
- [ ] WF2 simulando datos: abrir Supabase dashboard y verificar que llegan filas automáticamente
- [ ] WF3 responde al chat: desde el dashboard Next.js, enviar un mensaje y recibir respuesta
- [ ] Token sincronizado: el frontend puede comunicarse con WF3 sin error 401/403
