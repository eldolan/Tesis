import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  // .trim() defensivo: ver nota en client.ts (salto de línea final en la env var).
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
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
          }
        },
      },
    }
  )
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim()
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()

export const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
