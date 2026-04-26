# Documentos para ingesta RAG

Este directorio contiene los archivos de conocimiento que se indexan en la base de datos
vectorial (tabla `documents` en Supabase) para el sistema RAG del asistente agrícola.

## Formatos soportados

- `.md` — Markdown
- `.txt` — Texto plano

> El archivo `README.md` es ignorado automáticamente durante la ingesta.

## Cómo agregar documentos

Simplemente copia tus archivos `.md` o `.txt` en este directorio.
No se requiere ninguna configuración adicional — el script detecta los archivos automáticamente.

**Buenas prácticas para el contenido:**
- Escribir en párrafos separados por línea en blanco (`\n\n`) para que el chunker los divida correctamente
- Usar un archivo por tema (riego, fertilizantes, plagas, etc.)
- Incluir valores numéricos concretos (umbrales, dosis, rangos) para mejorar la precisión del RAG

## Variables de entorno requeridas

Configurar en `.env.local` antes de ejecutar el script:

```
SUPABASE_SERVICE_ROLE_KEY=...   # Clave de servicio de Supabase (Project Settings > API)
NEXT_PUBLIC_SUPABASE_URL=...    # URL del proyecto Supabase
OPENAI_API_KEY=...              # Clave de OpenAI para generar embeddings
```

## Cómo ejecutar la ingesta

```bash
npx tsx scripts/ingest-docs.ts
```

El script es **idempotente**: si se ejecuta varias veces con los mismos documentos,
no duplica registros. Usa upsert por `(source, chunk_index)`.

## Parámetros del chunker

- Divide el texto por párrafos (`\n\n`)
- Agrupa párrafos hasta ~800 caracteres por chunk
- Overlap de 100 caracteres entre chunks consecutivos
- Batches de 50 chunks por llamada a la API de embeddings

## Estructura de la tabla `documents`

| Campo         | Tipo         | Descripción                              |
|---------------|--------------|------------------------------------------|
| `source`      | TEXT         | Nombre del archivo fuente                |
| `chunk_index` | INT          | Índice del chunk dentro del archivo      |
| `content`     | TEXT         | Texto del chunk                          |
| `embedding`   | vector(1536) | Embedding generado por OpenAI            |
| `metadata`    | JSONB        | Metadatos adicionales (extensible)       |
