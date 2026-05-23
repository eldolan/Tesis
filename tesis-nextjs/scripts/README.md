# Scripts

Scripts utilitarios para el pipeline de datos de la tesis.

Todos los scripts se ejecutan con `npx tsx <script>` desde la raíz del proyecto.

---

## Scripts disponibles

### `ingest-docs.ts`

Ingesta documentos en Supabase para el pipeline RAG.

- Lee `.md` y `.txt` en `scripts/docs/` (excluye `README.md`) con metadata `general-knowledge`
- Lee PDFs registrados en el script (raíz del proyecto) con metadata: `category`, `upload_year` (año de carga al índice), `title`, `language`
- Antepone a cada chunk una cabecera contextual para mejorar la calidad del embedding
- Divide cada documento en chunks con solapamiento configurable
- Genera embeddings con OpenAI (`text-embedding-3-small`)
- Hace upsert en la tabla `public.documents` (columna `metadata` en JSONB)
- **Idempotente**: upsert por `source, chunk_index`

Tras añadir la migración `003_metadata_filter.sql`, aplica con `npx supabase db push` (o SQL Editor) para habilitar `match_documents_filtered`.

**PDF:** `@langchain/community`/`PDFLoader` requiere **`pdf-parse` v1** (`pdf-parse@^1`). La v2 rompe la ingesta con `ERR_PACKAGE_PATH_NOT_EXPORTED`.

```bash
npx tsx scripts/ingest-docs.ts
```

### `seed-cities.ts`

Carga el catálogo de ciudades en Supabase (datos iniciales).

```bash
npx tsx scripts/seed-cities.ts
```

---

## Variables de entorno requeridas

Para `ingest-docs.ts` se requieren las siguientes variables en `.env.local`:

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (ej: `https://xxxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | JWT de service_role — permite escribir en Supabase omitiendo RLS |
| `OPENAI_API_KEY` | Clave de API de OpenAI para generar embeddings |

Los scripts cargan `.env.local` automáticamente vía `dotenv` antes de ejecutar.

---

## Troubleshooting: `.env.local` y variables requeridas

### Verificar que no hay duplicados de `SUPABASE_SERVICE_ROLE_KEY`

`dotenv` usa el **primer valor encontrado** al parsear el archivo. Si `SUPABASE_SERVICE_ROLE_KEY` aparece más de una vez, el script usará el primer valor — que podría ser un placeholder o JWT truncado.

**Detectar duplicados:**
```bash
grep -c "SUPABASE_SERVICE_ROLE_KEY" .env.local
# Debe retornar: 1
# Si retorna 2 o más → hay duplicados que deben eliminarse
```

**Saneo:** conservar SOLO la línea con el JWT real:
- El JWT real empieza con `eyJ` y tiene longitud > 200 caracteres
- Eliminar cualquier línea con `your-service-role-key-here` u otro placeholder
- Eliminar cualquier JWT truncado (más corto que el real)

### Verificar que `OPENAI_API_KEY` está presente

```bash
grep -c "OPENAI_API_KEY" .env.local
# Debe retornar: 1
```

Si no está, agregarla al final de `.env.local`:
```
OPENAI_API_KEY=sk-...tu-clave-real-aquí...
```

### El script falla con "Missing Supabase environment variables"

Verificar que `.env.local` existe en la raíz del proyecto (mismo nivel que `package.json`) y contiene las tres variables requeridas con valores reales.

---

## Nota: módulo `admin-node.ts` vs `admin.ts`

`ingest-docs.ts` importa el cliente Supabase desde `src/lib/supabase/admin-node.ts`, **no** desde `src/lib/supabase/admin.ts`.

**Razón**: `admin.ts` incluye `import 'server-only'`, que es un marcador del runtime Next.js. Este import no es resolvible por `tsx` (Node.js standalone) y causa error `MODULE_NOT_FOUND` al ejecutar scripts fuera del runtime Next.js.

`admin-node.ts` es un gemelo idéntico de `admin.ts` sin ese import, diseñado específicamente para scripts Node.js standalone.

> Si modificás la lógica de construcción del cliente Supabase en uno de los gemelos, debés replicar el cambio en el otro. Ambos archivos tienen comentarios cruzados que lo recuerdan.
