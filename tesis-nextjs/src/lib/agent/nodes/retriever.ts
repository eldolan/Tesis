// Nodo retriever: recupera documentos relevantes del índice pgvector
// y las lecturas recientes de sensores en paralelo.
// Si embedQuery o search fallan, el nodo retorna con retrieved_docs vacío
// y continúa al nodo respond con menos contexto RAG (graceful degradation).
import { embedQuery } from '@/lib/rag/embed'
import { searchDocsFiltered } from '@/lib/rag/retriever'
import { fetchRecentSensorReadings, formatSensorContext } from '@/lib/agent/sensor-context'
import { extractLastUserText } from '@/lib/agent/messages/extract-user-text'
import type { AgentStateType } from '@/lib/agent/state'

/**
 * Nodo retriever: ejecuta en paralelo el embedding de la consulta y la
 * obtención de lecturas de sensores, luego busca documentos similares
 * en pgvector (con filtro de categoría según intent si aplica).
 *
 * Si la búsqueda filtrada no devuelve resultados, reintenta sin filtro
 * (evita dejar al modelo sin contexto por una clasificación fallida).
 */
export async function retrieverNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const userText = extractLastUserText(state.messages)

  // Paralelizar embedding de la consulta y lectura de sensores
  const [embeddingResult, readings] = await Promise.allSettled([
    embedQuery(userText || 'consulta agrícola'),
    fetchRecentSensorReadings(),
  ])

  const sensorCtx =
    readings.status === 'fulfilled' ? formatSensorContext(readings.value) : ''

  if (readings.status === 'rejected') {
    console.error('[retriever] Error obteniendo lecturas de sensores:', readings.reason)
  }

  let docs: Awaited<ReturnType<typeof searchDocsFiltered>> = []

  if (embeddingResult.status === 'fulfilled') {
    const emb = embeddingResult.value
    const category = state.intent_category

    try {
      if (category) {
        docs = await searchDocsFiltered(emb, { category, threshold: 0.75, matchCount: 5 })
        if (docs.length === 0) {
          console.warn('[retriever] Búsqueda filtrada vacía, reintentando sin filtro de categoría')
          docs = await searchDocsFiltered(emb, { category: null, year: null, threshold: 0.75, matchCount: 5 })
        }
      } else {
        docs = await searchDocsFiltered(emb, { category: null, year: null, threshold: 0.75, matchCount: 5 })
      }
    } catch (error) {
      console.error('[retriever] Error en searchDocsFiltered, continuando sin RAG:', error)
    }
  } else {
    console.error('[retriever] Error en embedQuery, continuando sin RAG:', embeddingResult.reason)
  }

  return {
    retrieved_docs: docs,
    sensor_context: sensorCtx,
  }
}
