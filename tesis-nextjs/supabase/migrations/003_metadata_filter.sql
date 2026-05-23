-- =============================================================
-- Migración 003: RPC de búsqueda vectorial con filtro por metadata
-- (categoría, año de carga) para RAG con menos tokens.
-- =============================================================

-- Búsqueda semántica con filtros opcionales sobre JSONB metadata.
CREATE OR REPLACE FUNCTION public.match_documents_filtered(
  query_embedding  vector(1536),
  match_threshold  float  DEFAULT 0.75,
  match_count      int    DEFAULT 5,
  filter_category  text   DEFAULT NULL,
  filter_year      int    DEFAULT NULL
)
RETURNS TABLE (
  id         bigint,
  content    text,
  source     text,
  metadata   jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    d.id,
    d.content,
    d.source,
    d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM public.documents d
  WHERE
    1 - (d.embedding <=> query_embedding) > match_threshold
    AND (
      filter_category IS NULL
      OR d.metadata->>'category' = filter_category
    )
    AND (
      filter_year IS NULL
      OR (d.metadata->>'upload_year')::int = filter_year
    )
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;

COMMENT ON FUNCTION public.match_documents_filtered IS
  'RAG: similitud coseno (pgvector) con filtros opcionales por category y upload_year en metadata.';
