// Contexto de sensores extraído del Route Handler de chat.
// Este módulo aísla la lectura y el formateo de las últimas lecturas
// de los sensores de suelo para que el nodo retriever del agente
// LangGraph pueda reutilizarlo sin duplicar código.

import { getSupabaseAdmin } from '@/lib/supabase/server'
import type { SensorRiego, SensorFertilizante } from '@/types'

// Re-exportamos los tipos de dominio ya existentes para que los nodos
// del agente no necesiten importar directamente desde @/types.
export type { SensorRiego, SensorFertilizante }

export type SensorReadings = {
  riego20: SensorRiego[]
  riego40: SensorRiego[]
  riego60: SensorRiego[]
  fertilizante: SensorFertilizante[]
}

/**
 * Consulta las últimas 5 lecturas de cada tabla de sensores en paralelo.
 * Resiliente a fallos parciales: si una tabla falla, retorna array vacío
 * para esa tabla y continúa con el resto.
 */
export async function fetchRecentSensorReadings(): Promise<SensorReadings> {
  const supabase = getSupabaseAdmin()

  const [res20, res40, res60, resFert] = await Promise.all([
    supabase.from('sensor_riego_20').select('*').order('timestamp', { ascending: false }).limit(5),
    supabase.from('sensor_riego_40').select('*').order('timestamp', { ascending: false }).limit(5),
    supabase.from('sensor_riego_60').select('*').order('timestamp', { ascending: false }).limit(5),
    supabase.from('sensor_fertilizante').select('*').order('timestamp', { ascending: false }).limit(5),
  ])

  return {
    riego20: (res20.data ?? []) as SensorRiego[],
    riego40: (res40.data ?? []) as SensorRiego[],
    riego60: (res60.data ?? []) as SensorRiego[],
    fertilizante: (resFert.data ?? []) as SensorFertilizante[],
  }
}

// Formateador interno para una lectura de sensor de riego.
// Solo usa el último registro (índice 0) para el bloque de datos en tiempo real.
function formatRiegoSensor(
  readings: SensorRiego[],
  label: string,
): string {
  const r = readings[0]
  if (!r) return `${label}: sin datos`

  const ts = new Date(r.timestamp).toLocaleString('es-CL', { timeZone: 'America/Santiago' })
  const lines = [
    `${label} [${ts}]`,
    `  Humedad: ${r.humedad}%`,
    `  Temperatura suelo: ${r.temperatura_c}°C`,
    `  Conductividad: ${r.conductividad_us_cm} µS/cm`,
    `  pH: ${r.ph}`,
  ]

  if (r.temperatura_onboard != null) lines.push(`  Temp. ambiente: ${r.temperatura_onboard}°C`)
  if (r.humedad_onboard != null) lines.push(`  Hum. ambiente: ${r.humedad_onboard}%`)
  lines.push(`  Evento de riego: ${r.es_evento_riego ? 'Sí' : 'No'}`)

  return lines.join('\n')
}

/**
 * Formatea las lecturas de sensores en un bloque de texto legible para el LLM.
 * Solo incluye datos + umbrales de referencia — las instrucciones al asistente
 * deben vivir en el nodo respond.ts del agente, no aquí.
 *
 * Umbrales tomados de buildSystemPrompt() en src/app/api/chat/route.ts:
 *   - Humedad: 90–100% lleno | 70–90% recarga | 55–70% estrés | <55% estrés extremo
 *   - NPK: N 20–40 mg/kg | P 10–25 mg/kg | K 100–200 mg/kg
 *   - pH óptimo: 6.0–7.0
 *   - Temperatura suelo ideal: 15–25°C
 */
export function formatSensorContext(readings: SensorReadings): string {
  const { riego20, riego40, riego60, fertilizante } = readings

  // Bloque de fertilizante NPK
  const latestFert = fertilizante[0]
  const fertBlock = latestFert
    ? [
        `Último registro [${new Date(latestFert.timestamp).toLocaleString('es-CL', { timeZone: 'America/Santiago' })}]`,
        `  Nitrógeno (N): ${latestFert.nitrogen} mg/kg`,
        `  Fósforo (P):   ${latestFert.phosphorus} mg/kg`,
        `  Potasio (K):   ${latestFert.potassium} mg/kg`,
      ].join('\n')
    : 'Sin datos de fertilizante'

  return `\
═══════════════════════════════════════
DATOS EN TIEMPO REAL DEL SISTEMA
(última lectura de cada sensor)
═══════════════════════════════════════

SENSORES DE RIEGO:
${formatRiegoSensor(riego20, 'Sensor 20cm (superficial)')}

${formatRiegoSensor(riego40, 'Sensor 40cm (medio)')}

${formatRiegoSensor(riego60, 'Sensor 60cm (profundo)')}

FERTILIZANTE NPK:
${fertBlock}

═══════════════════════════════════════
UMBRALES DE REFERENCIA
═══════════════════════════════════════
Humedad del suelo:
  90–100%  → Nivel de lleno
  70–90%   → Punto de recarga
  55–70%   → Inicio de estrés
  < 55%    → Estrés extremo (regar urgente)

NPK óptimo:
  N: 20–40 mg/kg | P: 10–25 mg/kg | K: 100–200 mg/kg

pH óptimo para cultivos: 6.0–7.0
Temperatura suelo ideal: 15–25°C
═══════════════════════════════════════`
}