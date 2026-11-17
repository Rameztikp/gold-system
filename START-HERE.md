# ابدأ هنا — تشغيل «نظام الذهب»

الكود جاهز، وقاعدة البيانات وحاوية الصور جاهزة على Cloudflare.
باقي خطوة وحدة منك: تعطي GitHub مفاتيح النشر. (المفاتيح ما تنكتب في المحادثة أبدًا.)

## 1) مفتاح Cloudflare
1. ادخل dash.cloudflare.com
2. فوق يمين: صورة الحساب ← **My Profile** ← **API Tokens** ← **Create Token**.
3. اختر القالب **Edit Cloudflare Workers** ← **Use template**.
4. تحت Permissions اضغط **+ Add more** وأضف: `Account` ← `D1` ← `Edit`.
5. **Continue to summary** ← **Create Token** ← انسخ المفتاح.
6. ارجع للصفحة الرئيسية في Cloudflare، وانسخ **Account ID** (يمين الصفحة).

## 2) أسرار GitHub
افتح المستودع ← **Settings** ← **Secrets and variables** ← **Actions** ← **New repository secret**، وأضف 4 أسرار:

| الاسم | القيمة |
|---|---|
| `CLOUDFLARE_API_TOKEN` | المفتاح من الخطوة 1 |
| `CLOUDFLARE_ACCOUNT_ID` | رقم الحساب من الخطوة 1 |
| `SETUP_TOKEN` | كلمة سر طويلة تختارها (20 حرف أو أكثر) — تحتاجها مرة وحدة لإعداد أول مرة |
| `BACKUP_TOKEN` | كلمة سر طويلة ثانية — لسكربت النسخ في اللابتوب |

## 3) النشر
المستودع ← **Actions** ← **Deploy** ← **Run workflow**.
بعد ما يخلص (علامة ✅) افتح: `https://gold-system.<اسم-حسابك>.workers.dev`

## 4) أول مرة من الآيفون
1. افتح الرابط في Safari ← اكتب `SETUP_TOKEN` واسمك واسم مستخدم.
2. اضغط «أضف مفتاح المرور» ← Face ID.
3. Safari ← زر المشاركة ← **Add to Home Screen**.
4. من «الإدارة»: أضف مفتاح احتياطي، وأنشئ رموز الاسترجاع واكتبها في ورقة.
5. أضف مدخل البيانات باسم مستخدم وكلمة مرور.

## 5) النسخ الاحتياطي في لابتوب المحل
انسخ `scripts/backup.ps1` للابتوب، وشغّله مرة باليوم:
`powershell -ExecutionPolicy Bypass -File backup.ps1`

## للمطوّر
- `npm ci` ثم `npm run check` (typecheck + lint + test).
- تشغيل محلي: `cp .dev.vars.example .dev.vars` ← `npm run build` ← `npm run db:migrate:local` ← `npm run dev:worker`.
- تجربة متصفح كاملة: `npm run e2e` (والعامل شغّال على 8787).
