// Herramienta LLM para crear notificaciones proactivas en Supabase.
// El LLM la invoca cuando detecta condiciones críticas o accionables
// en los datos de sensores (no para cada consulta rutinaria).
//
// API de tool() en AI SDK v6: usa inputSchema (no parameters) — verificado
// en node_modules/ai/docs/03-ai-sdk-core/15-tools-and-tool-calling.mdx
import { tool } from 'ai'
import { z } from 'zod'
import { getSupabaseServiceRole } from '@/lib/supabase/admin'

export const notifySchema = z.object({
  severity: z.enum(['info', 'warning', 'critical']),
  tipo: z.string().describe('Categoría corta: riego, salud, fertilización, temperatura, etc.'),
  titulo: z.string().max(120),
  mensaje: z.string().max(500),
  recomendacion: z
    .string()
    .max(500)
    .describe('Acción recomendada específica y concreta para el usuario'),
})

export const triggerNotificationTool = tool({
  description:
    'Crea una notificación proactiva para el usuario cuando se detecta una condición crítica ' +
    'o relevante en sensores o plantas. Usar solo para eventos accionables reales: ' +
    'humedad crítica, valores NPK fuera de rango, pH anormal, temperatura extrema, ' +
    'evento de riego detectado. NO usar para consultas informativas rutinarias.',
  inputSchema: notifySchema,
  execute: async (input) => {
    try {
      const supabase = getSupabaseServiceRole()
      const { error } = await supabase
        .from('notifications')
        .insert({ ...input, payload: {} })

      if (error) {
        console.error('[notify] insert failed:', error.message)
        return { ok: false, error: error.message }
      }

      console.log('[notify] created:', input.severity, input.titulo)
      return { ok: true }
    } catch (e) {
      console.error('[notify] exception:', e)
      return { ok: false, error: String(e) }
    }
  },
})
