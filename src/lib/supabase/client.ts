import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // .trim() defensivo: un salto de línea final en la env var (gotcha de Vercel
  // al pegar el valor) corrompe la credencial y rompe la auth del WebSocket Realtime.
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()
  )
}
