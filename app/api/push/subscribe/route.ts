import { NextResponse } from "next/server"
import { createSupabaseAdmin } from "../_supabaseAdmin"

export const runtime = "nodejs"

type SubscriptionPayload = {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const subscription = body?.subscription as SubscriptionPayload | undefined

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 })
    }

    const supabase = createSupabaseAdmin()
    const userAgent = req.headers.get("user-agent")

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: userAgent,
      },
      { onConflict: "endpoint" },
    )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
