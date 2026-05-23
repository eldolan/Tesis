import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")
  const clientIp = forwarded?.split(",")[0]?.trim() || "127.0.0.1"

  try {
    const supabase = getSupabaseAdmin()
    const { data: allowed } = await supabase.rpc("check_auth_rate_limit", {
      p_ip_address: clientIp,
    })

    if (allowed === false) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    // If rate limit check fails, allow through
    return NextResponse.json({ ok: true })
  }
}
