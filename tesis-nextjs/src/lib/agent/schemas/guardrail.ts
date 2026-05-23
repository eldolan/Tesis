// Schema Zod v4 para la evaluación del guardrail de entrada.
// El LLM produce un JSON con esta estructura que clasifica la consulta
// como on-topic, off-topic o intento de prompt injection.
import { z } from 'zod'

export const guardrailSchema = z.object({
  allowed: z.boolean(),
  category: z.enum(['on-topic', 'off-topic', 'injection']),
  reason: z.string(),
})

export type GuardrailSchema = z.infer<typeof guardrailSchema>
