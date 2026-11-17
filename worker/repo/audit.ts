import { and, eq, desc, lt } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { type Db, schema } from '../db/client';

const { auditLog, securityLog } = schema;
export type AuditRow = typeof auditLog.$inferSelect;

export interface AuditEntry {
  branchId: string;
  userId: string;
  entity: string;
  entityId: string;
  action: string;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
  /** كما في سجل النموذج: add | edit | cancel | day | check */
  kind?: 'add' | 'edit' | 'cancel' | 'day' | 'check' | 'user' | 'settings';
  title?: string;
  detail?: string;
  dayDate?: string | null;
  who?: string;
}

const json = (v: unknown): string | null => (v === undefined ? null : JSON.stringify(v));

/**
 * قيد السجل يُكتب فقط إذا نجح الأمر الذي قبله في نفس الدفعة (changes() > 0).
 * هكذا التعديل وقيده في عملية واحدة، ولا يُكتب قيد لتعديل رُفض بسبب version.
 */
export const auditAfterChangeQuery = (db: Db, e: AuditEntry, at: number) =>
  db.run(sql`INSERT INTO audit_log (branch_id, user_id, entity, entity_id, action, before_json, after_json, reason, at, kind, title, detail, day_date, who)
    SELECT ${e.branchId}, ${e.userId}, ${e.entity}, ${e.entityId}, ${e.action}, ${json(e.before)}, ${json(e.after)}, ${e.reason ?? null}, ${at},
      ${e.kind ?? null}, ${e.title ?? null}, ${e.detail ?? ''}, ${e.dayDate ?? null}, ${e.who ?? null}
    WHERE changes() > 0`);

export const listAudit = async (db: Db, branchId: string, opts: { beforeId?: number; kind?: string; limit: number }) =>
  db.select().from(auditLog)
    .where(and(
      eq(auditLog.branchId, branchId),
      opts.beforeId ? lt(auditLog.id, opts.beforeId) : undefined,
      opts.kind ? eq(auditLog.kind, opts.kind) : undefined,
    ))
    .orderBy(desc(auditLog.id)).limit(opts.limit);

export const insertSecurityEvent = (db: Db, row: typeof securityLog.$inferInsert) => db.insert(securityLog).values(row);
