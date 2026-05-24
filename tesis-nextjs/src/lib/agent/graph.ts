// Grafo LangGraph del asistente agrícola RAG.
// Define el flujo: guardrail → (refusal | intent → retriever → respond)
// y expone runAgent() para ser invocado desde el route handler de Next.js.
import { StateGraph, START, END } from '@langchain/langgraph'
import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from 'ai'
import { AgentState } from '@/lib/agent/state'
import { guardrailNode } from '@/lib/agent/nodes/guardrail'
import { refusalNode } from '@/lib/agent/nodes/refusal'
import { intentNode } from '@/lib/agent/nodes/intent'
import { retrieverNode } from '@/lib/agent/nodes/retriever'
import { respondNode } from '@/lib/agent/nodes/respond'

/**
 * Construye y compila el grafo LangGraph.
 * Se cachea a nivel de módulo para evitar recompilaciones en cada request.
 *
 * Topología:
 *   START → guardrail
 *   guardrail → refusal (si should_refuse)
 *   guardrail → intent  (si no should_refuse)
 *   intent → retriever
 *   retriever → respond
 *   respond → END
 *   refusal → END
 */
function buildGraph() {
  return new StateGraph(AgentState)
    .addNode('guardrail', guardrailNode)
    .addNode('refusal', refusalNode)
    .addNode('classify', intentNode)
    .addNode('retriever', retrieverNode)
    .addNode('respond', respondNode)
    .addEdge(START, 'guardrail')
    .addConditionalEdges(
      'guardrail',
      (state) => (state.should_refuse ? 'refusal' : 'classify'),
      { refusal: 'refusal', classify: 'classify' }
    )
    .addEdge('classify', 'retriever')
    .addEdge('retriever', 'respond')
    .addEdge('respond', END)
    .addEdge('refusal', END)
    .compile()
}

// Grafo compilado cacheado a nivel de módulo (singleton por worker de Node.js)
const compiledGraph = buildGraph()

/**
 * Punto de entrada público del agente.
 * Crea un UIMessageStream, invoca el grafo pasando el writer vía configurable,
 * y retorna la Response SSE compatible con AI SDK v6 useChat.
 *
 * @param messages - Historial de mensajes UIMessage desde el cliente
 * @returns Response streaming en formato UI message stream
 */
export async function runAgent(messages: UIMessage[]): Promise<Response> {
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // El writer se pasa exclusivamente vía config.configurable (no en el state)
      // Decisión documentada en src/lib/agent/state.ts
      await compiledGraph.invoke(
        { messages },
        { configurable: { writer } }
      )
    },
    onError: (error) => {
      console.error('[graph] Error en el agente:', error)
      return 'Ocurrió un error al procesar tu consulta. Por favor intenta de nuevo.'
    },
  })

  return createUIMessageStreamResponse({ stream })
}
