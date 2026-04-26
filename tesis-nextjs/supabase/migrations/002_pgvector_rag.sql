-- =============================================================
-- Migración 002: pgvector + RAG + Notificaciones
-- Aplicar con: npx supabase db push
--              o desde Supabase Studio > SQL Editor
-- =============================================================

-- 1. Extensión pgvector (requerida para embeddings)
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================
-- 2. Tabla de documentos para RAG
-- Almacena chunks de texto con su embedding vectorial.
-- Upsert idempotente por (source, chunk_index).
-- =============================================================
CREATE TABLE IF NOT EXISTS public.documents (
  id            BIGSERIAL PRIMARY KEY,
  source        TEXT        NOT NULL,
  chunk_index   INT         NOT NULL,
  content       TEXT        NOT NULL,
  metadata      JSONB       DEFAULT '{}'::jsonb,
  embedding     vector(1536),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, chunk_index)
);

-- Índice IVFFlat para búsqueda aproximada por coseno (eficiente a escala)
CREATE INDEX IF NOT EXISTS documents_embedding_idx
  ON public.documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- =============================================================
-- 3. Tabla de notificaciones del sistema
-- Generadas por el agente cuando detecta condiciones anómalas.
-- Soporta Realtime para actualizaciones en tiempo real al cliente.
-- =============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id              BIGSERIAL PRIMARY KEY,
  severity        TEXT        NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  tipo            TEXT        NOT NULL,
  titulo          TEXT        NOT NULL,
  mensaje         TEXT        NOT NULL,
  recomendacion   TEXT,
  payload         JSONB       DEFAULT '{}'::jsonb,
  read            BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- 4. RPC: match_documents
-- Búsqueda semántica de documentos por similitud coseno.
-- Retorna los N documentos más similares al embedding de consulta
-- que superen el umbral de similitud dado.
-- =============================================================
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding  vector(1536),
  match_threshold  float   DEFAULT 0.75,
  match_count      int     DEFAULT 5
)
RETURNS TABLE (
  id          bigint,
  content     text,
  source      text,
  similarity  float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    d.id,
    d.content,
    d.source,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM public.documents d
  WHERE 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- =============================================================
-- 5. Row Level Security
-- =============================================================

-- --- documents ---
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario (incluido anon) puede leer documentos
CREATE POLICY "documents_select_public"
  ON public.documents FOR SELECT
  USING (true);

-- Solo service_role puede insertar/actualizar/eliminar
CREATE POLICY "documents_insert_service_role"
  ON public.documents FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "documents_update_service_role"
  ON public.documents FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "documents_delete_service_role"
  ON public.documents FOR DELETE
  USING (auth.role() = 'service_role');

-- --- notifications ---
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario puede leer notificaciones
CREATE POLICY "notifications_select_public"
  ON public.notifications FOR SELECT
  USING (true);

-- Cualquier usuario puede marcar notificaciones como leídas (UPDATE)
CREATE POLICY "notifications_update_public"
  ON public.notifications FOR UPDATE
  USING (true);

-- Solo service_role puede crear notificaciones
CREATE POLICY "notifications_insert_service_role"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Nadie puede eliminar notificaciones
-- (no se crea policy DELETE → acción bloqueada por RLS)

-- =============================================================
-- 6. Habilitar Realtime para notificaciones
-- Permite que el cliente reciba nuevas notificaciones en tiempo real.
-- =============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
