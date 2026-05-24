// Este módulo solo puede ejecutarse en el servidor.
// 'server-only' lanza un error en tiempo de compilación si se importa
// desde un componente cliente o desde código de browser, garantizando
// que la service_role key nunca se exponga al cliente.
// ⚠️ Gemelo para scripts Node.js standalone: src/lib/supabase/admin-node.ts (sin `server-only`).
// Cualquier cambio a la construcción del cliente debe replicarse en ambos.
import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Singleton para reutilizar la conexión dentro del mismo proceso Node.
// En Edge Runtime cada invocación es stateless, por lo que el caché
// no aplica — pero el error de env vars sí.
let cachedClient: SupabaseClient | null = null

/**
 * Retorna un cliente Supabase autenticado con la service_role key.
 * Usar SOLO en código server-side (Route Handlers, Server Actions, scripts).
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
