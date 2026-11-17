# 06 — الأمان

| البند | التنفيذ |
|---|---|
| صاحب المحل | مفتاح مرور (WebAuthn، userVerification=required)، مفتاح احتياطي ثانٍ، 10 رموز استرجاع (مجزّأة SHA-256) |
| مدخل البيانات | كلمة مرور PBKDF2-SHA256 (100,000 دورة، ملح 16 بايت)، قفل 15 دقيقة بعد 5 محاولات فاشلة |
| الجلسة | كوكي `__Host-session` (Secure, HttpOnly, SameSite=Strict, Path=/)، 12 ساعة، المعرّف مخزّن مجزّأ |
| الطلبات | فحص `Origin` لكل طلب غير GET، رؤوس `X-Frame-Options: DENY` و`frame-ancestors 'none'` و CSP صارم |
| الفرع | كل استعلام يأخذ `branchId` من الجلسة، لا من الطلب |
| الصور | فحص البايتات الأولى (JPEG/PNG/WebP)، إعادة الترميز في الجهاز تحذف GPS، حد 5MB |
| السجلات | `audit_log` و`security_log` إضافة فقط |
| الأسرار | `SETUP_TOKEN` عبر `wrangler secret put`، لا شيء في Git؛ `.dev.vars` في `.gitignore` |
| المتابعة | gitleaks و Dependabot في GitHub |
| الحسابات | التحقق بخطوتين على GitHub و Cloudflare (مهمة المستخدم) |
| التأكيد بالبصمة قبل الأعمال الحساسة | المرحلة 5 (لم يُنفّذ بعد) |
