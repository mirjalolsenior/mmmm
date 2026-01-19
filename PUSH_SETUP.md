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
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...  # generate-vapid chiqargan public key
VAPID_PRIVATE_KEY=...             # generate-vapid chiqargan private key
VAPID_SUBJECT=mailto:you@example.com

NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...     # Supabase Project Settings → API

# ixtiyoriy (cron himoyasi va sozlamalar)
PUSH_CRON_KEY=your_secret_key

# Talab bo‘yicha default qiymatlar:
# - tovar 10 donadan kam bo‘lsa
# - zakaz 1 kun oldin + o‘sha kuni
LOW_STOCK_THRESHOLD=10
ORDER_NOTIFY_DAYS_BEFORE=1
```

> Eslatma: `SUPABASE_SERVICE_ROLE_KEY` maxfiy — uni faqat server env’da saqlang.

## 4) Ishlatish
Ilova ichida **Sozlamalar** bo‘limiga kiring:

- **Bildirishnoma** tugmasini bosing → ruxsat bering.
- **Test** tugmasi barcha saqlangan subscription’larga test bildirishnoma yuboradi.

## 5) Avtomatik bildirishnoma (har soat)

Loyiha har safar quyidagilarni tekshiradi:

- **Tovar kam qoldi**: `ombor.qoldiq <= LOW_STOCK_THRESHOLD` (default: **10**)
- **Zakaz vaqti yaqin**: `zakazlar.qachon_berish_kerak` bugundan `ORDER_NOTIFY_DAYS_BEFORE` kungacha (default: **1 kun oldin + o‘sha kuni**)

### Netlify’da (tavsiya)
Repo ichida `netlify/functions/push-auto.js` bor — u **har soatda avtomatik** ishlaydi (published deploy’da). citeturn0search0

Shuning uchun alohida cron-job qo‘yish shart emas.

### Boshqa hosting bo‘lsa
Siz baribir shu endpoint’ni cron bilan chaqirishingiz mumkin:

```
GET /api/push/auto?key=YOUR_PUSH_CRON_KEY
```
