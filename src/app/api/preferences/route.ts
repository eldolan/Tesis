import { createClient } from "@/lib/supabase/server"

// GET /api/preferences — preferencias del usuario autenticado.
// Si aún no tiene fila, devuelve ciudad_usuario_id: null (no crea nada).
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("user_preferences")
    .select("ciudad_usuario_id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) {
    console.error("Error leyendo user_preferences:", error)
    return Response.json({ error: "Error leyendo preferencias" }, { status: 500 })
  }

  return Response.json({ ciudad_usuario_id: data?.ciudad_usuario_id ?? null })
}

// POST /api/preferences — crea o actualiza la preferencia (upsert por user_id).
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body || !("ciudad_usuario_id" in body)) {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const raw = body.ciudad_usuario_id
  const ciudad =
    raw === null
      ? null
      : Number.isInteger(raw) && raw > 0
        ? raw
        : undefined

  if (ciudad === undefined) {
    return Response.json({ error: "ciudad_usuario_id inválido" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: user.id,
        ciudad_usuario_id: ciudad,
      },
      { onConflict: "user_id" },
    )
    .select("ciudad_usuario_id")
    .single()

  if (error) {
    console.error("Error guardando user_preferences:", error)
    return Response.json({ error: "Error guardando preferencias" }, { status: 500 })
  }

  return Response.json({ ciudad_usuario_id: data.ciudad_usuario_id })
}
