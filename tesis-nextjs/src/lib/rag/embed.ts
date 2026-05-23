// Módulo de embeddings para el pipeline RAG.
// Usa AI SDK v6 con @ai-sdk/openai para generar vectores de 1536 dimensiones
// compatibles con la columna vector(1536) de la tabla documents.
import { embed, embedMany } from 'ai'
import { openai } from '@ai-sdk/openai'

// Modelo de embeddings — text-embedding-3-small produce vectores de 1536 dims
// y tiene mejor relación costo/rendimiento para RAG en español.
const EMBEDDING_MODEL = openai.embedding('text-embedding-3-small')

/**
 * Genera el embedding de un único texto de consulta.
 * Usado en tiempo de inferencia (cuando el usuario hace una pregunta).
 *
 * @param text - Texto a embeddear (ej: la pregunta del usuario)
 * @returns Vector de números flotantes de 1536 dimensiones
 */
export async function embedQuery(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: EMBEDDING_MODEL,
    value: text,
  })
  return embedding
}

/**
 * Genera embeddings para múltiples chunks de texto en paralelo.
 * Usado durante la ingesta de documentos (script ingest-docs.ts).
 *
 * El orden de los embeddings retornados corresponde al orden del array de entrada.
 *
 * @param chunks - Array de textos a embeddear
 * @returns Array de vectores, uno por cada chunk de entrada
 */
export async function embedDocs(chunks: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: EMBEDDING_MODEL,
    values: chunks,
  })
  return embeddings
}
