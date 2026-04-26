// Utilidad para extraer el texto del último mensaje de rol 'user'
// desde el array de UIMessage del estado del agente.
// Reutilizado en guardrailNode y retrieverNode para evitar duplicación (DRY).
import type { UIMessage } from 'ai'

/**
 * Encuentra el último mensaje con role === 'user' y concatena todos
 * sus parts de tipo 'text'. Retorna string vacío si no hay mensaje user
 * o si el mensaje no tiene parts de texto.
 */
export function extractLastUserText(messages: UIMessage[]): string {
  // Iterar en reverso para encontrar el último mensaje user eficientemente
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role !== 'user') continue

    // El mensaje puede tener parts (array de TextUIPart, FileUIPart, etc.)
    // o puede ser un mensaje simple con campo content (compatibilidad)
    if (msg.parts && msg.parts.length > 0) {
      const textParts = msg.parts
        .filter((p): p is Extract<typeof p, { type: 'text' }> => p.type === 'text')
        .map((p) => p.text)
        .join('\n')
      if (textParts.trim()) return textParts.trim()
    }

    // Fallback: usar content si existe como string (compatibilidad con mensajes legacy)
    const msgAny = msg as unknown as { content?: unknown }
    if (typeof msgAny.content === 'string') {
      return (msgAny.content as string).trim()
    }
  }

  return ''
}
