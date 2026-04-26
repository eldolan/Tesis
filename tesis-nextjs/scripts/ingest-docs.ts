/**
 * Script de ingesta de documentos para el pipeline RAG.
 *
 * Lee archivos .md, .txt en scripts/docs/ y PDFs del directorio del proyecto
 * según un registro con metadata (categoría, año de carga, título, idioma).
 * Genera embeddings y hace upsert en Supabase (idempotente por source + chunk_index).
 *
 * Uso:
 *   npx tsx scripts/ingest-docs.ts
 *
 * Variables de entorno requeridas (en .env.local):
 *   SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, OPENAI_API_KEY
 */

import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'

// Cargar .env.local antes de importar módulos que lean env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// Importaciones diferidas para que dotenv ya haya cargado las vars
import { embedDocs } from '../src/lib/rag/embed'
import { getSupabaseServiceRole } from '../src/lib/supabase/admin-node'

// ─── Metadatos por documento (año = año en que se sube al índice, no el de publicación) ───
type SourceMetadata = {
  category: string
  upload_year: number
  language: string
  title: string
}

const PDF_REGISTRY: { file: string; metadata: SourceMetadata }[] = [
  {
    file: '4._FertiliCalc_a_decision_support_system_for_fertilizer_management.pdf',
    metadata: {
      category: 'fertilizer-management',
      upload_year: 2026,
      language: 'en',
      title: 'FertiliCalc: a decision support system for fertilizer management',
    },
  },
  {
    file: 'Guia-para-cultivar-suculentas.pdf',
    metadata: {
      category: 'plant-care',
      upload_year: 2026,
      language: 'es',
      title: 'Guía para cultivar suculentas',
    },
  },
  {
    file: 'pone.0319268.pdf',
    metadata: {
      category: 'precision-agriculture',
      upload_year: 2026,
      language: 'en',
      title: 'Smart IoT-driven precision agriculture: land mapping, crop prediction, and irrigation',
    },
  },
]

// Documentación Markdown/txt en scripts/docs (metadata por defecto)
const DOCS_DIR_DEFAULT_METADATA: SourceMetadata = {
  category: 'general-knowledge',
  upload_year: 2026,
  language: 'es',
  title: '',
}

// ─── Configuración del chunker ───────────────────────────────────────────────
const CHUNK_MAX_CHARS = 800
const CHUNK_OVERLAP = 100
const EMBED_BATCH = 50

type Row = {
  source: string
  chunk_index: number
  content: string
  metadata: Record<string, unknown>
}

function chunkText(text: string): string[] {
  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)

  const chunks: string[] = []
  let current = ''

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para

    if (candidate.length <= CHUNK_MAX_CHARS) {
      current = candidate
    } else {
      if (current) {
        chunks.push(current)
        const overlap = current.slice(-CHUNK_OVERLAP)
        current = overlap ? `${overlap}\n\n${para}` : para
      } else {
        chunks.push(para)
        current = para.slice(-CHUNK_OVERLAP)
      }
    }
  }

  if (current.trim()) {
    chunks.push(current.trim())
  }

  return chunks
}

function buildChunkHeader(meta: SourceMetadata, sourceFile: string): string {
  const title = meta.title || sourceFile
  return `[Categoría: ${meta.category} | Título: ${title} | Año carga: ${meta.upload_year}]`
}

/**
 * Carga el texto de un PDF con LangChain PDFLoader.
 */
async function loadPdfText(absolutePath: string): Promise<string> {
  const loader = new PDFLoader(absolutePath, { splitPages: true })
  const pages = await loader.load()
  return pages.map((d) => d.pageContent).join('\n\n')
}

/**
 * Añade cabecera contextual a cada chunk para mejorar el embedding.
 */
function applyChunkHeaders(
  rawChunks: string[],
  header: string
): string[] {
  return rawChunks.map((chunk) => `${header}\n\n${chunk}`)
}

async function main() {
  const requiredVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY']
  const missing = requiredVars.filter((v) => !process.env[v])
  if (missing.length > 0) {
    console.error(`[ingest] ERROR: faltan variables de entorno: ${missing.join(', ')}`)
    process.exit(1)
  }

  const projectRoot = process.cwd()
  const docsDir = path.resolve(projectRoot, 'scripts/docs')
  const allRows: Row[] = []

  // ─── Markdown / texto en scripts/docs/ ───
  if (fs.existsSync(docsDir)) {
    const textFiles = fs
      .readdirSync(docsDir)
      .filter((f) => (f.endsWith('.md') || f.endsWith('.txt')) && f !== 'README.md')

    for (const file of textFiles) {
      const filePath = path.join(docsDir, file)
      const fileText = fs.readFileSync(filePath, 'utf-8')
      const meta: SourceMetadata = {
        ...DOCS_DIR_DEFAULT_METADATA,
        title: file.replace(/\.(md|txt)$/i, ''),
      }
      const header = buildChunkHeader(meta, file)
      const chunks = applyChunkHeaders(chunkText(fileText), header)
      const metadata: Record<string, unknown> = {
        category: meta.category,
        upload_year: meta.upload_year,
        language: meta.language,
        title: meta.title,
        source_path: `scripts/docs/${file}`,
      }

      console.log(`[ingest] ${file} → ${chunks.length} chunk(s)`)
      for (let i = 0; i < chunks.length; i++) {
        allRows.push({ source: file, chunk_index: i, content: chunks[i], metadata })
      }
    }
  } else {
    console.warn('[ingest] No existe scripts/docs/ — se omiten .md/.txt')
  }

  // ─── PDFs en la raíz del proyecto ───
  for (const { file, metadata: meta } of PDF_REGISTRY) {
    const filePath = path.join(projectRoot, file)
    if (!fs.existsSync(filePath)) {
      console.error(`[ingest] ADVERTENCIA: no se encontró el PDF: ${filePath}`)
      continue
    }
    const rawText = await loadPdfText(filePath)
    if (!rawText.trim()) {
      console.error(`[ingest] PDF vacío o no legible: ${file}`)
      continue
    }
    const header = buildChunkHeader(meta, file)
    const chunks = applyChunkHeaders(chunkText(rawText), header)
    const rowMetadata: Record<string, unknown> = {
      category: meta.category,
      upload_year: meta.upload_year,
      language: meta.language,
      title: meta.title,
      source_path: file,
    }
    console.log(`[ingest] ${file} → ${chunks.length} chunk(s)`)
    for (let i = 0; i < chunks.length; i++) {
      allRows.push({ source: file, chunk_index: i, content: chunks[i], metadata: rowMetadata })
    }
  }

  if (allRows.length === 0) {
    console.log('[ingest] No hay filas que procesar')
    return
  }

  console.log(
    `[ingest] Generando embeddings para ${allRows.length} chunk(s) en batches de ${EMBED_BATCH}...`
  )

  const flatEmbeddings: number[][] = []
  for (let start = 0; start < allRows.length; start += EMBED_BATCH) {
    const batch = allRows.slice(start, start + EMBED_BATCH)
    const texts = batch.map((r) => r.content)
    const vectors = await embedDocs(texts)
    flatEmbeddings.push(...vectors)
    const batchEnd = Math.min(start + EMBED_BATCH, allRows.length)
    console.log(`[ingest] Embeddings: ${start + 1}–${batchEnd} / ${allRows.length}`)
  }

  const rowsWithEmbeddings = allRows.map((row, i) => ({
    ...row,
    embedding: flatEmbeddings[i],
  }))

  const supabase = getSupabaseServiceRole()

  const { error } = await supabase.from('documents').upsert(rowsWithEmbeddings, {
    onConflict: 'source,chunk_index',
  })

  if (error) {
    console.error('[ingest] ERROR al hacer upsert:', error.message)
    process.exit(1)
  }

  console.log(
    `[ingest] ✓ Upsert exitoso — ${rowsWithEmbeddings.length} fila(s) en public.documents`
  )
}

main().catch((err) => {
  console.error('[ingest] ERROR inesperado:', err)
  process.exit(1)
})
