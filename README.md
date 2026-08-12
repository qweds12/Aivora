# Aivora AI — Final Production Scaffold

هذه حزمة كاملة قابلة للتشغيل لمنصة AI SaaS، وليست مجرد صفحة HTML.

## الموجود
- واجهة احترافية Responsive / RTL.
- 6 أدوات AI.
- API Backend بـ Node.js + Express.
- نقطة `/api/generate` لمحرك AI حقيقي مع fallback تجريبي.
- عدم كشف مفاتيح API للمتصفح.
- Projects محلية في MVP.
- خطط Free / Pro / Business.
- نقطة Checkout جاهزة للربط مع Stripe.
- `.env.example` لكل الأسرار.
- Health endpoint.

## تشغيل محلي
1. ثبّت Node.js 20 أو أحدث.
2. انسخ `.env.example` إلى `.env`.
3. شغّل `npm install`.
4. شغّل `npm start`.
5. افتح `http://localhost:3000`.

## تفعيل AI الحقيقي
ضع:
AI_API_KEY=...
AI_BASE_URL=https://YOUR_PROVIDER/v1
AI_MODEL=...
ويجب أن يكون مزودك متوافقاً مع صيغة Chat Completions. لا تضع المفتاح في `public/`.

## ما يلزم للإنتاج الحقيقي
- Supabase Auth + PostgreSQL للمستخدمين والمشاريع والـ Credits.
- Stripe Checkout + Webhooks لتأكيد الاشتراكات.
- تخزين ملفات عبر Supabase Storage أو S3.
- مزود صور/فيديو منفصل لأن الفيديو والصور لهما تكاليف مختلفة.
- Rate limiting وlogs وmonitoring.
- سياسات الخصوصية وشروط الاستخدام.
- دومين وHTTPS واستضافة Backend.
- مفاتيح API حقيقية وميزانية تشغيل.

## ملاحظة
لا يمكن تضمين مفاتيح الدفع أو مفاتيح AI الحقيقية داخل ملف ZIP؛ يجب أن تبقى في متغيرات البيئة على الخادم.
