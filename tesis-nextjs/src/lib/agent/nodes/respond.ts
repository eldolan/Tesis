// Nodo respond: genera la respuesta del asistente agrícola con streaming.
// Combina el contexto de sensores y los documentos RAG recuperados en el
// system prompt, y puede invocar triggerNotificationTool cuando detecta
// condiciones accionables en los datos.
import { streamText, convertToModelMessages } from 'ai'
import { openai } from '@ai-sdk/openai'
import type { LangGraphRunnableConfig } from '@langchain/langgraph'
import type { UIMessageStreamWriter } from 'ai'
import type { AgentStateType } from '@/lib/agent/state'
import { triggerNotificationTool } from '@/lib/agent/tools/notify'

/**
 * Construye el system prompt combinando:
 * 1. Rol e instrucciones del asistente agrícola
 * 2. Contexto de sensores en tiempo real
 * 3. Documentos indexados recuperados del RAG (o nota si vacíos)
 * 4. Instrucciones sobre cuándo usar trigger_notification
 */
function buildSystemPrompt(sensorContext: string, retrievedDocs: AgentStateType['retrieved_docs']): string {
  // Formatear documentos RAG (incluye metadata cuando existe)
  const docsBlock =
    retrievedDocs.length > 0
      ? retrievedDocs
          .map((doc) => {
            const m = doc.metadata
            const metaLine =
              m && typeof m === 'object'
                ? (() => {
                    const parts: string[] = []
                    if (m.category != null) parts.push(`categoría: ${String(m.category)}`)
                    if (m.title != null) parts.push(`título: ${String(m.title)}`)
                    if (m.upload_year != null) parts.push(`año de carga: ${String(m.upload_year)}`)
                    if (m.language != null) parts.push(`idioma: ${String(m.language)}`)
                    return parts.length ? ` [${parts.join(' | ')}]` : ''
                  })()
                : ''
            return `[Fuente: ${doc.source}]${metaLine}\n${doc.content}`
          })
          .join('\n\n')
      : 'No hay documentos indexados para complementar esta respuesta.'

  return `Eres un asistente agrícola especializado en monitoreo de suelo e irrigación para un sistema IoT.
Tu objetivo es ayudar al usuario a interpretar datos de sensores, detectar problemas y tomar decisiones informadas.

INSTRUCCIONES:
- Responde siempre en español, de forma concisa y práctica
- Cita las fuentes cuando uses información de documentos indexados
- Usa los datos reales de sensores para contextualizar tu respuesta
- Si detectas condiciones críticas o accionables en los datos, invoca trigger_notification

ALCANCE: riego, humedad, sensores de suelo, pH, conductividad, temperatura, nutrientes NPK,
fertilización, plantas, cultivos y recomendaciones agronómicas.

═══════════════════════════════════════
DATOS EN TIEMPO REAL DEL SISTEMA
═══════════════════════════════════════
${sensorContext || 'Sin lecturas de sensores disponibles en este momento.'}

═══════════════════════════════════════
DOCUMENTOS DE REFERENCIA (RAG)
═══════════════════════════════════════
${docsBlock}

═══════════════════════════════════════
USO DE trigger_notification
═══════════════════════════════════════
Invocar SOLO para condiciones accionables reales:
- Humedad del suelo < 55% (estrés extremo) → severity: "critical"
- Humedad < 70% (inicio de estrés) → severity: "warning"
- Valores NPK fuera de rango (N<20 o N>40, P<10 o P>25, K<100 o K>200 mg/kg) → severity: "warning"
- pH fuera de rango óptimo (< 6.0 o > 7.0) → severity: "warning"
- Temperatura suelo < 10°C o > 30°C → severity: "warning"
- Evento de riego detectado (es_evento_riego: Sí) → severity: "info"
NO invocar para consultas informativas rutinarias sin condición anómala.
Siempre incluir recomendacion concreta y accionable.`
}

/**
 * Nodo respond: genera la respuesta con streamText y la mergea al writer.
 * El writer se obtiene desde config.configurable.writer (no del state — ver state.ts).
 *
 * Firma compatible con LangGraph v1.2.8: (state, config) => Promise<Partial<State>>
 */
export async function respondNode(
  state: AgentStateType,
  config?: LangGraphRunnableConfig
): Promise<Partial<AgentStateType>> {
  const writer = (config?.configurable?.writer ?? null) as UIMessageStreamWriter | null
  if (!writer) {
    throw new Error(
      '[respond] UIMessageStreamWriter no disponible en config.configurable.writer. ' +
        'Asegúrate de pasar { configurable: { writer } } en graph.invoke()'
    )
  }

  const system = buildSystemPrompt(state.sensor_context, state.retrieved_docs)

  const modelMessages = await convertToModelMessages(state.messages)

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system,
    messages: modelMessages,
    tools: {
      trigger_notification: triggerNotificationTool,
    },
    maxOutputTokens: 700,
    temperature: 0.4,
  })

  // Mergear el stream de AI SDK v6 directamente al writer.
  // toUIMessageStream() retorna AsyncIterableStream (extiende ReadableStream),
  // compatible con writer.merge(ReadableStream) — verificado en index.d.ts
  writer.merge(result.toUIMessageStream())

  return {}
}
