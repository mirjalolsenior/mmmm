"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"

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
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Mebel Sherdor",
          body: "Test bildirishnoma ✅",
          url: "/",
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Send xatosi")
      setStatus("enabled")
      setMsg(`Yuborildi. OK: ${j.ok}, Failed: ${j.failed}, Removed: ${j.removed}`)
    } catch (e: any) {
      setStatus("error")
      setMsg(e?.message || "Xatolik")
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={enable} disabled={status === "working"}>
        Bildirishnoma
      </Button>
      <Button onClick={sendTest} disabled={status === "working"}>
        Test
      </Button>
      {msg ? <span className="text-xs text-muted-foreground max-w-[260px] truncate">{msg}</span> : null}
    </div>
  )
}
