// Módulo de recuperación de documentos para el pipeline RAG.
// Busca en la tabla documents usando match_documents o match_documents_filtered (pgvector + coseno).
import { getSupabaseServiceRole } from '@/lib/supabase/admin'

/** Metadatos indexados por chunk (JSONB en Supabase). */
export type DocMetadata = {
  category?: string | null
  upload_year?: number | string | null
  language?: string | null
  title?: string | null
  [key: string]: unknown
}

/**
 * Documento recuperado desde la base de datos vectorial.
 */
export type RetrievedDoc = {
  id: number
  content: string
  source: string
  similarity: number
  metadata?: DocMetadata | null
}

/**
 * Busca los documentos más similares semánticamente al embedding de consulta.
 *
 * @deprecated Preferir searchDocsFiltered para aprovechar filtros de metadata.
 */
export async function searchDocs(
  queryEmbedding: number[],
  threshold = 0.75,
  matchCount = 5
): Promise<RetrievedDoc[]> {
  const supabase = getSupabaseServiceRole()

  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: matchCount,
  })

  if (error) {
    console.error('[retriever] Error en match_documents:', error.message)
    return []
  }

  if (!data) {
    return []
  }

  return (data as RetrievedDoc[]).map((row) => ({
    ...row,
    metadata: null,
  }))
}

export type SearchDocsFilteredOptions = {
  category?: string | null
  year?: number | null
  threshold?: number
  matchCount?: number
}

/**
 * Búsqueda semántica con filtros opcionales por categoría y año de carga en metadata.
 * Reduce el espacio de búsqueda cuando el intent del usuario es específico.
 */
export async function searchDocsFiltered(
  queryEmbedding: number[],
  options?: SearchDocsFilteredOptions
): Promise<RetrievedDoc[]> {
  const supabase = getSupabaseServiceRole()
  const threshold = options?.threshold ?? 0.75
  const matchCount = options?.matchCount ?? 5
  const filterCategory = options?.category ?? null
  const filterYear = options?.year ?? null

  const { data, error } = await supabase.rpc('match_documents_filtered', {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: matchCount,
    filter_category: filterCategory,
    filter_year: filterYear,
  })

  if (error) {
    console.error('[retriever] Error en match_documents_filtered:', error.message)
    return []
  }

  if (!data) {
    return []
  }

  return (data as RetrievedDoc[]).map((row) => ({
    id: row.id,
    content: row.content,
    source: row.source,
    similarity: row.similarity,
    metadata: (row as { metadata?: DocMetadata | null }).metadata ?? null,
  }))
}
