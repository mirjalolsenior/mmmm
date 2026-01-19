import { NextResponse } from "next/server"
import { createSupabaseAdmin } from "../_supabaseAdmin"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const endpoint = body?.endpoint as string | undefined

    if (!endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 })
    }

    const supabase = createSupabaseAdmin()
    const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
