// Nodo de clasificación de intención RAG: asigna una categoría de documento
// para pre-filtrar la búsqueda en pgvector y reducir tokens.
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { extractLastUserText } from '@/lib/agent/messages/extract-user-text'
import type { AgentStateType } from '@/lib/agent/state'

const intentSchema = z.object({
  category: z
    .enum(['fertilizer-management', 'plant-care', 'precision-agriculture'])
    .nullable()
    .describe(
      'Categoría de documento más relevante, o null si la consulta es transversal o no encaja claramente'
    ),
})

/**
 * Clasifica la consulta y rellena intent + intent_category para el retriever.
 */
export async function intentNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const userText = extractLastUserText(state.messages) || ''

  if (!userText.trim()) {
    return { intent: 'general', intent_category: null }
  }

  try {
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: intentSchema,
      system: `Eres un clasificador de consultas para un asistente agrícola con tres bases documentales:
- fertilizer-management: fertilización, NPK, dosis, FertiliCalc, balance de fertilizantes, requerimientos de nutrientes, suelo y umbrales de P/K.
- plant-care: cuidado de plantas en maceta, suculentas o cactus, riego de ornamentales, sustrato, luz, macetas, propagación en hogar o jardín.
- precision-agriculture: agricultura de precisión, IoT, sensores de campo, teledetección, Landsat, NDVI, aprendizaje automático de cultivos, riego difuso, sistemas con Arduino/ESP, Bangladesh u estudios con satélite.

Devuelve category=null si la pregunta es demasiado general, mezcla muchos temas, solo pide el estado de sensores del dashboard, o no encaja en una sola categoría.`,
      prompt: `Clasifica la siguiente consulta del usuario:

"""${userText}"""`,
      temperature: 0,
      maxOutputTokens: 80,
    })

    if (object.category == null) {
      return { intent: 'general', intent_category: null }
    }
    return { intent: object.category, intent_category: object.category }
  } catch (e) {
    console.error('[intent] Error al clasificar:', e)
    return { intent: 'general', intent_category: null }
  }
}
