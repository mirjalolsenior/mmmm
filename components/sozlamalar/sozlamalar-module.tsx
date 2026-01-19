"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PushControls } from "@/components/push/push-controls"
import { Bell, Info } from "lucide-react"

export function SozlamalarModule() {
  return (
    <div className="space-y-6 animate-fadeIn">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Bildirishnomalar
          </CardTitle>
          <CardDescription>
            Android (Chrome) va iOS 16.4+ (PWA o'rnatilganda) uchun push bildirishnomani yoqing va test qiling.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border bg-background/50 p-4 space-y-4">
            <div className="flex items-start gap-3">
              <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Qanday ishlaydi</p>
                <p>
                  "Bildirishnoma" ruxsat so'raydi va qurilmangizni ro'yxatdan o'tkazadi. "Test" darhol push yuboradi.
                </p>
              </div>
            </div>
            <PushControls />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Tizim</CardTitle>
          <CardDescription>Umumiy sozlamalar (keyin qo'shiladi)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Bu bo'limda keyinchalik tema, profil va boshqa sozlamalar qo'shiladi.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
