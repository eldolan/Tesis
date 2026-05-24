/**
 * Estado compartido del agente LangGraph RAG para tesis.
 *
 * DECISIÓN ARQUITECTÓNICA — writer fuera del state:
 * LangGraph v1.2.8 serializa el state en cada step (para checkpointing y tracing).
 * UIMessageStreamWriter no es un POJO (tiene métodos write/merge), por lo que
 * no sobrevive la serialización. Por tanto, el writer se pasa exclusivamente
 * vía config.configurable.writer (LangGraphRunnableConfig) y NO forma parte
 * del AgentState. Los nodos que necesitan escritura reciben el config como
 * segundo argumento según la firma: (state, config) => Promise<Partial<State>>.
 */
import { Annotation } from '@langchain/langgraph'
import type { UIMessage } from 'ai'

// ─── Tipos de dominio del agente ─────────────────────────────────────────────

export type GuardrailCategory = 'on-topic' | 'off-topic' | 'injection'

export type GuardrailResult = {
  allowed: boolean
  category: GuardrailCategory
  reason: string
}

export type RetrievedDoc = {
  id: number
  content: string
  source: string
  similarity: number
  metadata?: Record<string, unknown> | null
}

// ─── AgentState ──────────────────────────────────────────────────────────────

/**
 * Estado del grafo LangGraph.
 * Todos los canales usan Annotation<T>() sin reducer → semántica "last-write-wins"
 * excepto messages que usa un reducer de concatenación.
 */
export const AgentState = Annotation.Root({
  /** Historial de mensajes UI (input principal del grafo) */
  messages: Annotation<UIMessage[]>({
    reducer: (existing, update) => {
      if (Array.isArray(update)) return [...existing, ...update]
      return existing
    },
    default: () => [],
  }),

  /** Resultado de la evaluación del guardrail (clasificación de la consulta) */
  guardrail_result: Annotation<GuardrailResult | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),

  /**
   * Etiqueta de intención RAG: 'general' o una de las categorías de documentos indexados.
   */
  intent: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),

  /**
   * Categoría de documento para pre-filtrar la búsqueda vectorial.
   * null = sin filtro (todos los chunks). Valores: fertilizer-management, plant-care, precision-agriculture.
   */
  intent_category: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),

  /** Documentos recuperados del índice pgvector */
  retrieved_docs: Annotation<RetrievedDoc[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),

  /** Contexto de sensores formateado como string listo para el system prompt */
  sensor_context: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),

  /** Indica si el agente debe rechazar la consulta actual */
  should_refuse: Annotation<boolean>({
    reducer: (_prev, next) => next,
    default: () => false,
  }),

  /** Categoría de rechazo: off-topic o injection */
  refusal_kind: Annotation<'off-topic' | 'injection' | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),

  /** Payload de la última notificación generada (para trazabilidad) */
  notification_payload: Annotation<Record<string, unknown> | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
})

/** Tipo de estado inferido desde la definición de anotaciones */
export type AgentStateType = typeof AgentState.State
