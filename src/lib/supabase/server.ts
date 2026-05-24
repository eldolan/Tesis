import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * Crea un cliente Supabase para Server Components y Route Handlers.
 * Lee y escribe cookies de sesión del request actual.
 * Las cookies usan await porque next/headers es asíncrono en Next.js 15+.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll puede fallar en Server Components de solo lectura.
            // El proxy (middleware) se encarga de refrescar las cookies.
          }
        },
      },
    }
  )
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Cliente Supabase con service role key para operaciones privilegiadas
 * (escritura de datos de sensores, verificación de API keys, rate limiting).
 * No persiste sesión ni refresca tokens: acceso directo a la base de datos.
 */
export const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
