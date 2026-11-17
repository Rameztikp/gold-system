import { and, eq, gte, lte, desc, inArray, sql } from 'drizzle-orm';
import { type Db, schema } from '../db/client';

const { days } = schema;
export type DayRow = typeof days.$inferSelect;

export const getDay = async (db: Db, branchId: string, id: string): Promise<DayRow | undefined> =>
  db.select().from(days).where(and(eq(days.branchId, branchId), eq(days.id, id))).get();

export const getDayByDate = async (db: Db, branchId: string, date: string): Promise<DayRow | undefined> =>
  db.select().from(days).where(and(eq(days.branchId, branchId), eq(days.date, date))).get();

export const listDays = async (db: Db, branchId: string, range: { from: string; to: string }): Promise<DayRow[]> =>
  db.select().from(days)
    .where(and(eq(days.branchId, branchId), gte(days.date, range.from), lte(days.date, range.to)))
    .orderBy(desc(days.date));

export const latestDay = async (db: Db, branchId: string): Promise<DayRow | undefined> =>
  db.select().from(days).where(eq(days.branchId, branchId)).orderBy(desc(days.date)).limit(1).get();

export const listDaysNeedingAttention = async (db: Db, branchId: string, since: string): Promise<DayRow[]> =>
  db.select().from(days)
    .where(and(eq(days.branchId, branchId), gte(days.date, since), inArray(days.status, ['not_compared', 'ledger_error'])))
    .orderBy(desc(days.date));

export const insertDayQuery = (db: Db, row: DayRow) => db.insert(days).values(row);

export const updateDayQuery = (db: Db, row: DayRow) =>
  db.update(days)
    .set({ ...row, version: row.version + 1 })
    .where(and(eq(days.id, row.id), eq(days.branchId, row.branchId), eq(days.version, row.version)))
    .returning({ version: days.version });

/** إعادة فتح اليوم بعد تعديل بيع/شراء — تُنفَّذ فقط إذا نجح الأمر الذي قبلها في نفس الدفعة. */
export const reopenDayAfterChangeQuery = (db: Db, branchId: string, id: string) =>
  db.run(sql`UPDATE days SET status = 'not_compared' WHERE id = ${id} AND branch_id = ${branchId} AND changes() > 0`);
