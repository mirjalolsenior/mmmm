import { NextResponse } from "next/server"
import webpush from "web-push"
import { createSupabaseAdmin } from "../_supabaseAdmin"

export const runtime = "nodejs"

type SendBody = {
  title?: string
  body?: string
  url?: string
}

function assertEnv() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com"

  const missing: string[] = []
  if (!publicKey) missing.push("NEXT_PUBLIC_VAPID_PUBLIC_KEY")
  if (!privateKey) missing.push("VAPID_PRIVATE_KEY")

  return {
    ok: missing.length === 0,
    missing,
    publicKey: publicKey || "",
    privateKey: privateKey || "",
    subject,
  }
}

export async function POST(req: Request) {
  try {
    const env = assertEnv()
    if (!env.ok) {
      return NextResponse.json(
        {
          error: "Missing VAPID env vars",
          missing: env.missing,
          hint: "Netlify/Vercel ENV ga VAPID keylarni qo'ying (NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT)",
        },
        { status: 400 },
      )
    }

    const { publicKey, privateKey, subject } = env
    webpush.setVapidDetails(subject, publicKey, privateKey)

    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint,p256dh,auth")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const body = (await req.json().catch(() => ({}))) as SendBody
    const payload = {
      title: body.title || "Mebel Sherdor",
      body: body.body || "Test bildirishnoma ✅",
      url: body.url || "/",
    }

    const results: { ok: number; failed: number; removed: number } = {
      ok: 0,
      failed: 0,
      removed: 0,
    }

    for (const row of data || []) {
      const subscription = {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      }

      try {
        await webpush.sendNotification(subscription as any, JSON.stringify(payload))
        results.ok++
      } catch (err: any) {
        results.failed++
        const statusCode = err?.statusCode
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", row.endpoint)
          results.removed++
        }
      }
    }

    return NextResponse.json({ ok: true, ...results, total: (data || []).length })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}