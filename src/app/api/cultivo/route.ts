import { createClient } from "@/lib/supabase/server"
import { FASES, NIVELES_ESTRES, FASE_DEFAULT, ESTRES_DEFAULT } from "@/lib/cultivo"
import type { FaseFenologica, NivelEstres } from "@/types"

const FASES_VALIDAS = new Set(FASES.map((f) => f.id))
const ESTRES_VALIDOS = new Set(NIVELES_ESTRES.map((n) => n.id))

// GET /api/cultivo — configuración del cultivo del usuario autenticado.
// Si aún no tiene fila, devuelve los valores por defecto (no crea nada).
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("cultivo_config")
    .select("especie, fase_fenologica, nivel_estres, updated_at")
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) {
    console.error("Error leyendo cultivo_config:", error)
    return Response.json({ error: "Error leyendo configuración" }, { status: 500 })
  }

  return Response.json(
    data ?? {
      especie: "genérico",
      fase_fenologica: FASE_DEFAULT,
      nivel_estres: ESTRES_DEFAULT,
      updated_at: null,
    },
  )
}

// POST /api/cultivo — crea o actualiza la configuración (upsert por user_id).
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const especie = typeof body.especie === "string" ? body.especie.trim().slice(0, 120) : ""
  const fase = body.fase_fenologica as FaseFenologica
  const estres = body.nivel_estres as NivelEstres

  if (!especie) {
    return Response.json({ error: "La especie es requerida." }, { status: 400 })
  }
  if (!FASES_VALIDAS.has(fase)) {
    return Response.json({ error: "Fase fenológica inválida." }, { status: 400 })
  }
  if (!ESTRES_VALIDOS.has(estres)) {
    return Response.json({ error: "Nivel de estrés inválido." }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("cultivo_config")
    .upsert(
      {
        user_id: user.id,
        especie,
        fase_fenologica: fase,
        nivel_estres: estres,
      },
      { onConflict: "user_id" },
    )
    .select("especie, fase_fenologica, nivel_estres, updated_at")
    .single()

  if (error) {
    console.error("Error guardando cultivo_config:", error)
    return Response.json({ error: "Error guardando configuración" }, { status: 500 })
  }

  return Response.json(data)
}
