# 04 — نموذج البيانات (D1 / SQLite)

قواعد عامة:
- المبالغ بالفلس، الأوزان بأجزاء المئة من الجرام — أعداد صحيحة.
- لا حذف أبدًا. الإلغاء بسبب ويُكتب في السجل.
- كل سجل قابل للتعديل له `version`؛ التعارض يرجع 409.
- معرّف السطر والصورة UUIDv7 يولّده الجهاز (الحفظ المكرر لنفس المعرّف لا يُنشئ نسخة ثانية).
- التعديل وقيده في السجل في عملية واحدة (`db.batch`).

| الجدول | أهم الأعمدة |
|---|---|
| `branches` | id, name, currency, country_code, timezone, week_start (0=أحد..6=سبت), version |
| `users` | id, branch_id, name, username, role (owner/entry), status (active/suspended), password_hash, failed_attempts, locked_until, version |
| `passkeys` | id (credential id), user_id, public_key, counter, transports, label, created_at |
| `recovery_codes` | id, user_id, code_hash, used_at |
| `sessions` | id_hash, user_id, branch_id, expires_at, created_at |
| `days` | id, branch_id, date (YYYY-MM-DD), gold_price_fils, note, ledger_* (6 بنود), status, version |
| `lines` | id (UUIDv7), branch_id, day_id, kind (sale/purchase/expense), position, description, pieces, weight_cg, amount_fils, wages_fils, commission_fils, extra_fils, cancelled, cancel_reason, version, created_by, created_at, updated_at |
| `photos` | id (UUIDv7), branch_id, day_id, r2_key, bytes, width, height, created_by, created_at |
| `audit_log` | id, branch_id, user_id, entity, entity_id, action, before_json, after_json, reason, at — إضافة فقط |
| `security_log` | id, branch_id, user_id, event, ip, user_agent, at — إضافة فقط |

المخطط الكامل: `worker/db/schema.ts`، والهجرات: `migrations/`.
