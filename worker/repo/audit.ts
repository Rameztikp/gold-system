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
}

const json = (v: unknown): string | null => (v === undefined ? null : JSON.stringify(v));

/**
 * قيد السجل يُكتب فقط إذا نجح الأمر الذي قبله في نفس الدفعة (changes() > 0).
 * هكذا التعديل وقيده في عملية واحدة، ولا يُكتب قيد لتعديل رُفض بسبب version.
 */
export const auditAfterChangeQuery = (db: Db, e: AuditEntry, at: number) =>
  db.run(sql`INSERT INTO audit_log (branch_id, user_id, entity, entity_id, action, before_json, after_json, reason, at)
    SELECT ${e.branchId}, ${e.userId}, ${e.entity}, ${e.entityId}, ${e.action}, ${json(e.before)}, ${json(e.after)}, ${e.reason ?? null}, ${at}
    WHERE changes() > 0`);

export const listAudit = async (db: Db, branchId: string, opts: { beforeId?: number; limit: number }) =>
  db.select().from(auditLog)
    .where(opts.beforeId ? and(eq(auditLog.branchId, branchId), lt(auditLog.id, opts.beforeId)) : eq(auditLog.branchId, branchId))
    .orderBy(desc(auditLog.id)).limit(opts.limit);

export const insertSecurityEvent = (db: Db, row: typeof securityLog.$inferInsert) => db.insert(securityLog).values(row);
