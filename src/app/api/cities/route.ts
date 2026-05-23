import { getSupabaseAdmin } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const search = url.searchParams.get("search")

  const supabaseAdmin = getSupabaseAdmin()
  let query = supabaseAdmin
    .from("chilean_cities")
    .select("id, name")
    .order("name", { ascending: true })

  if (search) {
    query = query.ilike("name", `%${search}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
