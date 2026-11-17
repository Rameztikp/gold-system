import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const branches = sqliteTable('branches', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  currency: text('currency').notNull(),
  countryCode: text('country_code').notNull(),
  timezone: text('timezone').notNull(),
  weekStart: integer('week_start').notNull(),
  version: integer('version').notNull().default(1),
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

export const days = sqliteTable('days', {
  id: text('id').primaryKey(),
  branchId: text('branch_id').notNull(),
  date: text('date').notNull(),
  goldPriceFils: integer('gold_price_fils'),
  note: text('note').notNull().default(''),
  ledgerSalesFils: integer('ledger_sales_fils'),
  ledgerSalesCg: integer('ledger_sales_cg'),
  ledgerPurchasesFils: integer('ledger_purchases_fils'),
  ledgerPurchasesCg: integer('ledger_purchases_cg'),
  ledgerExpensesFils: integer('ledger_expenses_fils'),
  ledgerWagesFils: integer('ledger_wages_fils'),
  status: text('status', { enum: ['matched', 'ledger_error', 'not_compared'] }).notNull().default('not_compared'),
  version: integer('version').notNull().default(1),
  createdBy: text('created_by').notNull(),
  createdAt: integer('created_at').notNull(),
}, (t) => [uniqueIndex('days_branch_date').on(t.branchId, t.date)]);

export const lines = sqliteTable('lines', {
  id: text('id').primaryKey(),
  branchId: text('branch_id').notNull(),
  dayId: text('day_id').notNull(),
  kind: text('kind', { enum: ['sale', 'purchase', 'expense'] }).notNull(),
  position: integer('position').notNull(),
  description: text('description').notNull(),
  searchText: text('search_text').notNull(),
  pieces: integer('pieces').notNull().default(0),
  weightCg: integer('weight_cg').notNull().default(0),
  amountFils: integer('amount_fils').notNull(),
  wagesFils: integer('wages_fils').notNull().default(0),
  commissionFils: integer('commission_fils').notNull().default(0),
  extraFils: integer('extra_fils').notNull().default(0),
  cancelled: integer('cancelled', { mode: 'boolean' }).notNull().default(false),
  cancelReason: text('cancel_reason'),
  version: integer('version').notNull().default(1),
  createdBy: text('created_by').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (t) => [index('lines_day').on(t.branchId, t.dayId), index('lines_kind').on(t.branchId, t.kind)]);

export const photos = sqliteTable('photos', {
  id: text('id').primaryKey(),
  branchId: text('branch_id').notNull(),
  dayId: text('day_id').notNull(),
  r2Key: text('r2_key').notNull(),
  bytes: integer('bytes').notNull(),
  contentType: text('content_type').notNull(),
  createdBy: text('created_by').notNull(),
  createdAt: integer('created_at').notNull(),
}, (t) => [index('photos_day').on(t.branchId, t.dayId)]);

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
