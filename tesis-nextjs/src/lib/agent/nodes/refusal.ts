// Nodo de rechazo: emite el mensaje de rechazo al stream del usuario
// cuando el guardrail clasifica la consulta como off-topic o injection.
// Escribe manualmente los chunks UIMessageChunk del protocolo AI SDK v6
// (text-start → text-delta → text-end) en lugar de usar streamText,
// ya que el mensaje de rechazo es estático y no requiere LLM.
import type { LangGraphRunnableConfig } from '@langchain/langgraph'
import type { UIMessageStreamWriter } from 'ai'
import type { AgentStateType } from '@/lib/agent/state'
import { REFUSAL_TEXTS } from '@/lib/agent/messages/refusal-texts'

/**
 * Nodo refusal: escribe el texto de rechazo directamente al UIMessageStreamWriter.
 * El writer se obtiene desde config.configurable.writer (no del state — ver state.ts).
 *
 * Firma compatible con LangGraph v1.2.8:
 *   (state, config) => Promise<Partial<State>>
 */
export async function refusalNode(
  state: AgentStateType,
  config?: LangGraphRunnableConfig
): Promise<Partial<AgentStateType>> {
  // Obtener writer desde configurable (estrategia plan B documentada en state.ts)
  const writer = (config?.configurable?.writer ?? null) as UIMessageStreamWriter | null
  if (!writer) {
    throw new Error(
      '[refusal] UIMessageStreamWriter no disponible en config.configurable.writer. ' +
        'Asegúrate de pasar { configurable: { writer } } en graph.invoke()'
    )
  }

  const kind = state.refusal_kind ?? 'off-topic'
  const text = REFUSAL_TEXTS[kind]

  // ID estable para correlacionar los tres chunks del mismo texto
  const id = `refusal-${kind}-${Date.now()}`

  console.log('[refusal]', kind)

  // Protocolo UIMessageChunk de AI SDK v6:
  // text-start → text-delta (con delta: string) → text-end
  // Campos verificados en node_modules/ai/dist/index.d.ts
  writer.write({ type: 'text-start', id })
  writer.write({ type: 'text-delta', id, delta: text })
  writer.write({ type: 'text-end', id })

  // Sin mutaciones al state — solo streaming al cliente
  return {}
}
