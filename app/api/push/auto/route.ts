import { NextResponse } from "next/server"
import webpush from "web-push"
import { createSupabaseAdmin } from "../_supabaseAdmin"

export const runtime = "nodejs"

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

function isoDateUTC(d: Date) {
  return d.toISOString().slice(0, 10)
}

function hourUTC(d: Date) {
  return String(d.getUTCHours()).padStart(2, "0")
}

async function sendToAll(payload: { title: string; body: string; url: string }) {
  const env = assertEnv()
  if (!env.ok) {
    throw new Error(`Missing VAPID env vars: ${env.missing.join(", ")}`)
  }
  webpush.setVapidDetails(env.subject, env.publicKey, env.privateKey)

  const supabase = createSupabaseAdmin()
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth")

  if (error) throw new Error(error.message)

  const results: { ok: number; failed: number; removed: number; total: number } = {
    ok: 0,
    failed: 0,
    removed: 0,
    total: (data || []).length,
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

  return results
}

async function isAlreadySentToday(markerKey: string) {
  const supabase = createSupabaseAdmin()
  const { data, error } = await supabase.from("push_meta").select("key").eq("key", markerKey).maybeSingle()
  if (error) {
    // Table might not exist yet. If so, skip de-dupe (user wanted easy).
    return false
  }
  return Boolean(data?.key)
}

async function markSent(markerKey: string) {
  const supabase = createSupabaseAdmin()
  await supabase
    .from("push_meta")
    .upsert({ key: markerKey, value: { sent_at: new Date().toISOString() } }, { onConflict: "key" })
    .catch(() => null)
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)

    // Optional protection for cron calls
    const required = process.env.PUSH_CRON_KEY
    if (required) {
      const provided = url.searchParams.get("key") || req.headers.get("x-cron-key")
      if (!provided || provided !== required) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    // Fail fast with a clear message if VAPID env vars are missing.
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

    // User requirement: low stock < 10 and due orders (1 day before + same day)
    // You can still override via ENV if needed.
    const threshold = Number.parseInt(process.env.LOW_STOCK_THRESHOLD || "10", 10)
    const daysBefore = Number.parseInt(process.env.ORDER_NOTIFY_DAYS_BEFORE || "1", 10)

    const now = new Date()
    const today = isoDateUTC(now)
    const future = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysBefore))
    const futureDay = isoDateUTC(future)

    const supabase = createSupabaseAdmin()

    // 1) Low stock (ombor.qoldiq)
    const { data: lowStock, error: lowErr } = await supabase
      .from("ombor")
      .select("tovar_nomi,raqami,qoldiq")
      .lte("qoldiq", threshold)
      .order("qoldiq", { ascending: true })
      .limit(20)

    if (lowErr) {
      // don't fail the whole run
      console.warn("[push/auto] low stock query error:", lowErr.message)
    }

    // 2) Orders: 1 day before + same day + overdue (zakazlar.qachon_berish_kerak)
    //    We fetch everything up to `futureDay` (today + daysBefore), then split by date.
    const { data: dueOrders, error: dueErr } = await supabase
      .from("zakazlar")
      .select("id,tovar_turi,raqami,qachon_berish_kerak,qancha_qoldi")
      .not("qachon_berish_kerak", "is", null)
      .lte("qachon_berish_kerak", futureDay)
      .order("qachon_berish_kerak", { ascending: true })
      .limit(20)

    if (dueErr) {
      console.warn("[push/auto] due orders query error:", dueErr.message)
    }

    const summary: any = {
      ok: true,
      today,
      futureDay,
      threshold,
      daysBefore,
      sent: [] as any[],
      skipped: [] as any[],
    }

    // Send low stock once per hour (so it can auto-send every hour when still low)
    if ((lowStock || []).length > 0) {
      const marker = `low_stock_${today}_${hourUTC(now)}`
      const already = await isAlreadySentToday(marker)
      if (!already) {
        const items = (lowStock || []).slice(0, 3)
        const rest = (lowStock || []).length - items.length
        const body =
          items
            .map((x) => `${x.tovar_nomi}${x.raqami ? ` (${x.raqami})` : ""}: qoldiq ${x.qoldiq}`)
            .join(", ") + (rest > 0 ? `, +${rest} ta` : "")

        const res = await sendToAll({
          title: "Tovar kam qoldi",
          body,
          url: "/",
        })
        await markSent(marker)
        summary.sent.push({ type: "low_stock", ...res })
      } else {
        summary.skipped.push({ type: "low_stock", reason: "already_sent_this_hour" })
      }
    }

    // Send due orders once per hour, but split into:
    // - 1 day before (date === futureDay)
    // - same day (date === today)
    // - overdue (date < today)
    if ((dueOrders || []).length > 0) {
      const toIso = (v: any) => String(v).slice(0, 10)

      const overdue = (dueOrders || []).filter((o) => toIso(o.qachon_berish_kerak) < today)
      const sameDay = (dueOrders || []).filter((o) => toIso(o.qachon_berish_kerak) === today)
      const beforeDay = (dueOrders || []).filter((o) => toIso(o.qachon_berish_kerak) === futureDay)

      const buildBody = (list: any[]) => {
        const items = list.slice(0, 3)
        const rest = list.length - items.length
        return (
          items
            .map((o) => {
              const d = toIso(o.qachon_berish_kerak)
              const name = `${o.tovar_turi}${o.raqami ? ` (${o.raqami})` : ""}`
              return `${name} - ${d}`
            })
            .join(", ") + (rest > 0 ? `, +${rest} ta` : "")
        )
      }

      // 1 kun oldin
      if (beforeDay.length > 0) {
        const marker = `due_orders_before_${today}_${hourUTC(now)}`
        const already = await isAlreadySentToday(marker)
        if (!already) {
          const res = await sendToAll({
            title: "Zakaz 1 kun qoldi",
            body: buildBody(beforeDay),
            url: "/",
          })
          await markSent(marker)
          summary.sent.push({ type: "due_orders_1day_before", count: beforeDay.length, ...res })
        } else {
          summary.skipped.push({ type: "due_orders_1day_before", reason: "already_sent_this_hour" })
        }
      }

      // o'sha kuni
      if (sameDay.length > 0) {
        const marker = `due_orders_today_${today}_${hourUTC(now)}`
        const already = await isAlreadySentToday(marker)
        if (!already) {
          const res = await sendToAll({
            title: "Bugun zakaz vaqti",
            body: buildBody(sameDay),
            url: "/",
          })
          await markSent(marker)
          summary.sent.push({ type: "due_orders_today", count: sameDay.length, ...res })
        } else {
          summary.skipped.push({ type: "due_orders_today", reason: "already_sent_this_hour" })
        }
      }

      // muddati o'tib ketgan (har soat eslatadi)
      if (overdue.length > 0) {
        const marker = `due_orders_overdue_${today}_${hourUTC(now)}`
        const already = await isAlreadySentToday(marker)
        if (!already) {
          const res = await sendToAll({
            title: "Zakaz muddati o'tib ketdi",
            body: buildBody(overdue),
            url: "/",
          })
          await markSent(marker)
          summary.sent.push({ type: "due_orders_overdue", count: overdue.length, ...res })
        } else {
          summary.skipped.push({ type: "due_orders_overdue", reason: "already_sent_this_hour" })
        }
      }
    }

    // Nothing to send
    if (summary.sent.length === 0) {
      summary.message = "Bugun yuboriladigan bildirishnoma topilmadi (yoki avval yuborilgan)."
    }

    return NextResponse.json(summary)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
