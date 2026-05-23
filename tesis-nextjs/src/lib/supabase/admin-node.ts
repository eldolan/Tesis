// ⚠️ Este módulo tiene un gemelo: src/lib/supabase/admin.ts (con `import 'server-only'`).
// Cualquier cambio a la construcción del cliente debe replicarse en ambos.
// Razón del split: `server-only` es un marcador del runtime Next.js no resolvible por tsx.
// Usar este módulo SOLO en scripts Node.js standalone (fuera del runtime Next.js).

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Singleton para reutilizar la conexión dentro del mismo proceso Node.
// En scripts standalone el proceso vive mientras dure la ejecución.
let cachedClient: SupabaseClient | null = null

/**
 * Retorna un cliente Supabase autenticado con la service_role key.
 * Usar SOLO en scripts Node.js standalone (ingest-docs.ts, seeds, etc.).
 *
 * A diferencia del cliente anon, este cliente:
 * - Omite Row Level Security (RLS) en todas las tablas
 * - Puede insertar/actualizar/eliminar datos protegidos
 * - NUNCA debe pasarse a componentes cliente ni incluirse en bundles públicos
 */
export function getSupabaseServiceRole(): SupabaseClient {
  if (cachedClient) return cachedClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'getSupabaseServiceRole: faltan variables de entorno requeridas. ' +
        'Verificar NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local'
    )
  }

  cachedClient = createClient(url, key, {
    auth: {
      // Sin sesión persistente — este cliente es stateless por diseño
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return cachedClient
}
