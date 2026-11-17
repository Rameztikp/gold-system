# 05 — المعمارية

## التقنيات
- الخادم: Cloudflare Workers + Hono.
- البيانات: D1 + Drizzle ORM. الصور: R2. التحقق: Zod. مفاتيح المرور: SimpleWebAuthn.
- الواجهة: Vite + TypeScript بدون إطار، وحدات صغيرة.
- الجودة: Vitest، ESLint، TypeScript strict. النشر: GitHub Actions + Wrangler.
- الخطط المجانية فقط.

## الهيكل
```
shared/domain/   منطق نقي (بدون I/O) + اختباراته
shared/api.ts    أنواع ومخططات Zod مشتركة بين الخادم والواجهة
worker/
  index.ts       تجميع التطبيق
  routes/        HTTP فقط: قراءة الطلب، Zod، استدعاء service
  services/      قواعد العمل، السجل، الصلاحيات
  repo/          استعلامات Drizzle — كل دالة تأخذ branchId
  db/            schema + الاتصال
  middleware/    الجلسة، الفرع، Origin، رؤوس الأمان
web/
  index.html, main.ts
  texts.ts       كل النصوص
  core/          api, router, dom (تهريب HTML), theme, format
  screens/       شاشة لكل ملف
  ui/            نوافذ، بطاقات، رسم
migrations/      SQL لـ D1
scripts/backup.ps1
```

## اتجاه الطبقات
routes ← services ← repo ← db. لا رجوع للخلف. `shared/domain` يُستخدم من الجميع ولا يعتمد على أحد.

## قواعد الكود (ESLint)
- دالة ≤ 50 سطرًا، ≤ 3 مدخلات.
- لا `any`.
- النصوص في `web/texts.ts`.
- كل HTML يمر عبر `html` المُهرِّب في `web/core/dom.ts`.
