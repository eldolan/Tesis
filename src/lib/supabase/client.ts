import { createBrowserClient } from '@supabase/ssr'

/**
 * Crea un cliente Supabase para uso en componentes del navegador.
 * Gestiona cookies de sesión automáticamente vía @supabase/ssr.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
