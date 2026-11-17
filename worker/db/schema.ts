import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const branches = sqliteTable('branches', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  currency: text('currency').notNull(),
  countryCode: text('country_code').notNull(),
  timezone: text('timezone').notNull(),
  weekStart: integer('week_start').notNull(),
  version: integer('version').notNull().default(1),
  catsJson: text('cats_json'),
  namesJson: text('names_json'),
  wa: text('wa'),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  branchId: text('branch_id').notNull(),
  name: text('name').notNull(),
  username: text('username').notNull(),
  role: text('role', { enum: ['owner', 'entry'] }).notNull(),
  status: text('status', { enum: ['active', 'suspended'] }).notNull().default('active'),
  passwordHash: text('password_hash'),
  failedAttempts: integer('failed_attempts').notNull().default(0),
  lockedUntil: integer('locked_until'),
  version: integer('version').notNull().default(1),
  createdAt: integer('created_at').notNull(),
}, (t) => [uniqueIndex('users_username').on(t.username)]);

export const passkeys = sqliteTable('passkeys', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  publicKey: text('public_key').notNull(),
  counter: integer('counter').notNull(),
  transports: text('transports'),
  label: text('label').notNull(),
  createdAt: integer('created_at').notNull(),
}, (t) => [index('passkeys_user').on(t.userId)]);

export const recoveryCodes = sqliteTable('recovery_codes', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  codeHash: text('code_hash').notNull(),
  usedAt: integer('used_at'),
}, (t) => [index('recovery_user').on(t.userId)]);

export const challenges = sqliteTable('challenges', {
  id: text('id').primaryKey(),
  challenge: text('challenge').notNull(),
  userId: text('user_id'),
  expiresAt: integer('expires_at').notNull(),
  usedAt: integer('used_at'),
});

export const sessions = sqliteTable('sessions', {
  idHash: text('id_hash').primaryKey(),
  userId: text('user_id').notNull(),
  branchId: text('branch_id').notNull(),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull(),
  revokedAt: integer('revoked_at'),
});

/* الجداول القديمة days/lines/photos (0000_init) فارغة ومتروكة بدون حذف (D-18). */

/** يوم الدفتر بشكل النموذج v16. المبالغ بالفلس والأوزان بأجزاء المئة من الجرام. */
export const ledgerDays = sqliteTable('ledger_days', {
  id: text('id').primaryKey(),
  branchId: text('branch_id').notNull(),
  date: text('date').notNull(),
  buyFils: integer('buy_fils').notNull(),
  sellFils: integer('sell_fils'),
  commFils: integer('comm_fils'),
  xLabel: text('x_label').notNull().default(''),
  xFils: integer('x_fils'),
  status: text('status', { enum: ['open', 'ok', 'lerr'] }).notNull().default('open'),
  note: text('note').notNull().default(''),
  lSales: integer('l_sales'),
  lSw: integer('l_sw'),
  lMk: integer('l_mk'),
  lTot: integer('l_tot'),
  lPurch: integer('l_purch'),
  lPw: integer('l_pw'),
  version: integer('version').notNull().default(1),
  createdBy: text('created_by').notNull(),
  createdAt: integer('created_at').notNull(),
}, (t) => [uniqueIndex('ledger_days_branch_date').on(t.branchId, t.date)]);

/** سطر بيع أو شراء أو مصروف. الإلغاء لا يحذف: x_reason/x_at/x_by. */
export const ledgerLines = sqliteTable('ledger_lines', {
  id: text('id').primaryKey(),
  branchId: text('branch_id').notNull(),
  dayId: text('day_id').notNull(),
  sec: text('sec', { enum: ['sales', 'purch', 'exp'] }).notNull(),
  position: integer('position').notNull(),
  d: text('d').notNull(),
  g: integer('g'),
  m: text('m').notNull().default(''),
  k: text('k').notNull().default(''),
  mkFils: integer('mk_fils'),
  amountFils: integer('amount_fils').notNull(),
  t: text('t').notNull().default(''),
  c: text('c').notNull().default(''),
  emp: text('emp').notNull().default(''),
  xReason: text('x_reason'),
  xAt: integer('x_at'),
  xBy: text('x_by'),
  version: integer('version').notNull().default(1),
  createdBy: text('created_by').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (t) => [index('ledger_lines_day').on(t.branchId, t.dayId, t.sec, t.position)]);

/** صور صفحات الدفتر. «الإزالة» تخفي الصورة فقط (removed_at) ولا تحذفها. */
export const dayPhotos = sqliteTable('day_photos', {
  id: text('id').primaryKey(),
  branchId: text('branch_id').notNull(),
  dayId: text('day_id').notNull(),
  label: text('label', { enum: ['sales', 'cash', 'other'] }).notNull(),
  r2Key: text('r2_key').notNull(),
  bytes: integer('bytes').notNull(),
  contentType: text('content_type').notNull(),
  createdBy: text('created_by').notNull(),
  createdAt: integer('created_at').notNull(),
  removedAt: integer('removed_at'),
  removedBy: text('removed_by'),
}, (t) => [index('day_photos_day').on(t.branchId, t.dayId)]);

export const auditLog = sqliteTable('audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  branchId: text('branch_id').notNull(),
  userId: text('user_id').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(),
  beforeJson: text('before_json'),
  afterJson: text('after_json'),
  reason: text('reason'),
  at: integer('at').notNull(),
  kind: text('kind'),
  title: text('title'),
  detail: text('detail'),
  dayDate: text('day_date'),
  who: text('who'),
}, (t) => [index('audit_branch_at').on(t.branchId, t.at)]);

export const securityLog = sqliteTable('security_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  branchId: text('branch_id'),
  userId: text('user_id'),
  event: text('event').notNull(),
  ip: text('ip'),
  userAgent: text('user_agent'),
  at: integer('at').notNull(),
});

/** رموز إعداد أول مرة (بديل SETUP_TOKEN). مجزّأة، وكل رمز مرة واحدة. */
export const setupCodes = sqliteTable('setup_codes', {
  codeHash: text('code_hash').primaryKey(),
  expiresAt: integer('expires_at').notNull(),
  usedAt: integer('used_at'),
});
