# Push bildirishnoma (Android + iOS 16.4+)

Bu loyihada **oddiy Web Push** qo‘shildi.

- Android: Chrome’da ishlaydi.
- iOS: faqat **iOS 16.4+** va **PWA o‘rnatilgan bo‘lsa** (Safari → Share → Add to Home Screen).

## 1) Supabase jadvalini yarating
Supabase SQL editor’da `scripts/004_push_subscriptions.sql` ni ishga tushiring.

Keyin (tavsiya) takror yuborilmasligi uchun `scripts/005_push_meta.sql` ni ham ishga tushiring.

## 2) VAPID key yarating
Terminalda:

```bash
node scripts/generate-vapid.mjs
```

## 3) Netlify (yoki hosting) env qo‘ying

```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BDIgNkzEg9JpGXvCuESFWEYVZk1n7vht8EHiT_MQ5XkORtd-rq0GcPcQkMhQpfFcu6pibYjFJSYmocC4HlVjdYA
VAPID_PRIVATE_KEY=NVIzBkpe8GJNoi-b7H-aPKpGXgYxMDoxrfWYAUVKQ3U
VAPID_SUBJECT=amontagayev@gmail.com

NEXT_PUBLIC_SUPABASE_URL=https://yrcbciggffugzghddpdz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyY2JjaWdnZmZ1Z3pnaGRkcGR6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODgyOTAyNCwiZXhwIjoyMDg0NDA1MDI0fQ.bT_bI0zME9Q_AWDNXjXI02XK09v1bV951JnSRQ41GoU
# ixtiyoriy (cron himoyasi va sozlamalar)
PUSH_CRON_KEY=your_secret_key
LOW_STOCK_THRESHOLD=3
ORDER_NOTIFY_DAYS_BEFORE=1
```

> Eslatma: `SUPABASE_SERVICE_ROLE_KEY` maxfiy — uni faqat server env’da saqlang.

## 4) Ishlatish
Header’da **“Bildirishnoma”** tugmasini bosing → ruxsat bering.

Keyin **“Test”** tugmasi barcha saqlangan subscription’larga test bildirishnoma yuboradi.

## 5) Avtomatik bildirishnoma (tovar kam / zakaz vaqti)

Loyiha har safar quyidagilarni tekshiradi:

- **Tovar kam qoldi**: `ombor.qoldiq <= LOW_STOCK_THRESHOLD`
- **Zakaz vaqti yaqin**: `zakazlar.qachon_berish_kerak` bugundan `ORDER_NOTIFY_DAYS_BEFORE` kungacha

Cron uchun URL:

```
GET /api/push/auto?key=YOUR_PUSH_CRON_KEY
```

Masalan, har 30 daqiqada yoki kuniga 1 marta chaqirib tursangiz bo‘ladi.
