# 04 — نموذج البيانات (D1)

- المبالغ بالفلس، الأوزان بأجزاء المئة من الجرام — أعداد صحيحة. على السلك (API) بالدرهم والجرام كما في النموذج (`worker/repo/wire.ts`).
- لا حذف: إلغاء السطر بسبب (`x_reason`)، إزالة الصورة إخفاء (`removed_at`)، المستخدم يُوقف.
- كل سجل قابل للتعديل له `version`؛ التعارض 409. التعديل وقيده في السجل في دفعة واحدة.
- معرّف السطر والصورة UUIDv7 من الجهاز.

| الجدول | الأعمدة |
|---|---|
| `ledger_days` | id, branch_id, date, buy_fils, sell_fils, comm_fils, x_label, x_fils, status (open/ok/lerr), note, l_sales, l_sw, l_mk, l_tot, l_purch, l_pw, version |
| `ledger_lines` | id, branch_id, day_id, sec (sales/purch/exp), position, d, g, m, k, mk_fils, amount_fils, t (كسر/جديد), c, emp, x_reason, x_at, x_by, version |
| `day_photos` | id, branch_id, day_id, label (sales/cash/other), r2_key, bytes, content_type, created_by, removed_at, removed_by |
| `audit_log` | … + kind, title, detail, day_date, who (شكل سجل النموذج) |
| `branches` | name, currency, country_code, timezone, week_start, cats_json, names_json, wa |
| `users`, `passkeys`, `recovery_codes`, `sessions`, `challenges`, `setup_codes`, `security_log` | الدخول والأمان |

الهجرات: `migrations/0000…0002`. الجداول `days`/`lines`/`photos` من 0000 فارغة ومتروكة (D-18).
