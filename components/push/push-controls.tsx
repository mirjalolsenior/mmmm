"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"

function base64UrlToUint8Array(base64Url: string) {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

function isStandalonePwa() {
  if (typeof window === "undefined") return false
  const w = window as any
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: fullscreen)").matches ||
    w.navigator?.standalone === true
  )
}

export function PushControls() {
  const vapidPublicKey = useMemo(() => process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, [])
  const [status, setStatus] = useState<"idle" | "working" | "enabled" | "error">("idle")
  const [msg, setMsg] = useState<string>("")

  // Initial state: detect if notifications + subscription already exist
  useEffect(() => {
    let cancelled = false

    async function detect() {
      try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
        if (Notification.permission !== "granted") return
        const reg = await navigator.serviceWorker.getRegistration("/")
        if (!reg) return
        const sub = await reg.pushManager.getSubscription()
        if (!cancelled && sub) setStatus("enabled")
      } catch {
        // ignore
      }
    }

    detect()
    return () => {
      cancelled = true
    }
  }, [])

  async function enable() {
    try {
      setStatus("working")
      setMsg("")

      if (!vapidPublicKey) {
        throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY yo'q")
      }

      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("Bu brauzer Push API'ni qo'llamaydi")
      }

      const ua = navigator.userAgent.toLowerCase()
      const isiOS = /iphone|ipad|ipod/.test(ua)
      if (isiOS && !isStandalonePwa()) {
        throw new Error("iOS'da push faqat PWA o'rnatilganda ishlaydi (Add to Home Screen)")
      }

      const perm = await Notification.requestPermission()
      if (perm !== "granted") {
        throw new Error("Notification ruxsat berilmadi")
      }

      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" })
      await reg.update?.()

      const existing = await reg.pushManager.getSubscription()
      const sub =
        existing ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToUint8Array(vapidPublicKey),
        }))

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      })

      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || "Subscribe xatosi")
      }

      setStatus("enabled")
      setMsg("Bildirishnoma yoqildi ✅")
    } catch (e: any) {
      setStatus("error")
      setMsg(e?.message || "Xatolik")
    }
  }

  async function sendTest() {
    try {
      setStatus("working")
      setMsg("")
      // Test tugmasi endi "AUTO" logikani ham ishga tushiradi:
      // - tovar kam bo'lsa
      // - zakaz 1 kun qolganda / o'sha kuni / muddati o'tib ketganda
      const res = await fetch("/api/push/auto?manual=1", { method: "GET" })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Send xatosi")
      setStatus("enabled")
      const sent = Array.isArray(j?.sent) ? j.sent : []
      const summary = sent
        .map((x: any) => `${x.type}: OK ${x.ok ?? 0}, Failed ${x.failed ?? 0}, Removed ${x.removed ?? 0}`)
        .join(" | ")

      setMsg(summary || j?.message || "Auto tekshirildi (yuboriladigan xabar topilmadi).")
    } catch (e: any) {
      setStatus("error")
      setMsg(e?.message || "Xatolik")
    }
  }

  async function disable() {
    try {
      setStatus("working")
      setMsg("")

      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("idle")
        return
      }

      const reg = await navigator.serviceWorker.getRegistration("/")
      const sub = await reg?.pushManager.getSubscription()

      if (sub) {
        // Try to remove from DB too (best-effort)
        fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {})

        await sub.unsubscribe().catch(() => {})
      }

      setStatus("idle")
      setMsg("O'chirildi")
    } catch (e: any) {
      setStatus("error")
      setMsg(e?.message || "Xatolik")
    }
  }

  const isEnabled = status === "enabled"
  const isWorking = status === "working"

  const badge =
    status === "enabled" ? (
      <Badge variant="secondary" className="gap-1">
        <CheckCircle2 className="h-3.5 w-3.5" /> Yoqilgan
      </Badge>
    ) : status === "working" ? (
      <Badge variant="secondary" className="gap-1">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Tekshirilmoqda
      </Badge>
    ) : status === "error" ? (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3.5 w-3.5" /> Xato
      </Badge>
    ) : (
      <Badge variant="outline">O'chirilgan</Badge>
    )

  return (
    <div className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Switch
            checked={isEnabled}
            onCheckedChange={(checked) => (checked ? enable() : disable())}
            disabled={isWorking}
            aria-label="Push bildirishnoma"
          />
          <div className="leading-tight">
            <div className="text-sm font-medium">Push bildirishnoma</div>
            <div className="text-xs text-muted-foreground">Android (Chrome) va iOS 16.4+ (PWA)</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {badge}
          <Button size="sm" onClick={sendTest} disabled={isWorking || !isEnabled}>
            Test yuborish
          </Button>
        </div>
      </div>

      {msg ? <div className="mt-2 text-xs text-muted-foreground">{msg}</div> : null}
    </div>
  )
}
