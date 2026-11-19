import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { type Db, schema } from '../db/client';

const { ledgerDays, ledgerLines, dayPhotos } = schema;
export type DayRow = typeof ledgerDays.$inferSelect;
export type LineRow = typeof ledgerLines.$inferSelect;
export type PhotoRow = typeof dayPhotos.$inferSelect;

export const getDayByDate = async (db: Db, branchId: string, date: string): Promise<DayRow | undefined> =>
  db.select().from(ledgerDays).where(and(eq(ledgerDays.branchId, branchId), eq(ledgerDays.date, date))).get();

/** dates: أيام محددة فقط (للتحديث الجزئي)، بدونها كل الأيام. */
export const listDayRows = async (db: Db, branchId: string, dates?: string[]): Promise<DayRow[]> =>
  db.select().from(ledgerDays)
    .where(and(eq(ledgerDays.branchId, branchId), dates ? inArray(ledgerDays.date, dates) : undefined))
    .orderBy(asc(ledgerDays.date));

/** day: يوم واحد، أو قائمة أيام (للتحديث الجزئي)، أو كل الفرع. */
const dayFilter = <C extends typeof ledgerLines.dayId | typeof dayPhotos.dayId>(col: C, day?: string | string[]) =>
  day === undefined ? undefined : Array.isArray(day) ? inArray(col, day) : eq(col, day);

export const listLineRows = async (db: Db, branchId: string, day?: string | string[]): Promise<LineRow[]> =>
  db.select().from(ledgerLines)
    .where(and(eq(ledgerLines.branchId, branchId), dayFilter(ledgerLines.dayId, day)))
    .orderBy(asc(ledgerLines.position));

export const listPhotoRows = async (db: Db, branchId: string, day?: string | string[]): Promise<PhotoRow[]> =>
  db.select().from(dayPhotos)
    .where(and(eq(dayPhotos.branchId, branchId), isNull(dayPhotos.removedAt), dayFilter(dayPhotos.dayId, day)))
    .orderBy(asc(dayPhotos.createdAt));

export const insertDayQuery = (db: Db, row: DayRow) => db.insert(ledgerDays).values(row);

/** تعديل بيانات اليوم مشروط بـ version — الاستجابة الفارغة تعني تعارضًا (409). */
export const updateDayQuery = (db: Db, row: DayRow) =>
  db.update(ledgerDays).set({ ...row, version: row.version + 1 })
    .where(and(eq(ledgerDays.id, row.id), eq(ledgerDays.branchId, row.branchId), eq(ledgerDays.version, row.version)))
    .returning({ version: ledgerDays.version });

/** إعادة فتح اليوم بعد تعديل يمس المقارنة — فقط إذا نجح الأمر الذي قبلها في نفس الدفعة. */
export const reopenAfterChangeQuery = (db: Db, branchId: string, dayId: string) =>
  db.run(sql`UPDATE ledger_days SET status = 'open', note = '' WHERE id = ${dayId} AND branch_id = ${branchId}
    AND status IN ('ok', 'lerr') AND changes() > 0`);

export const getLine = async (db: Db, id: string): Promise<LineRow | undefined> =>
  db.select().from(ledgerLines).where(eq(ledgerLines.id, id)).get();

export async function nextPosition(db: Db, dayId: string): Promise<number> {
  const r = await db.select({ m: sql<number | null>`max(${ledgerLines.position})` }).from(ledgerLines).where(eq(ledgerLines.dayId, dayId)).get();
  return (r?.m ?? 0) + 1;
}

export const insertLineQuery = (db: Db, row: LineRow) => db.insert(ledgerLines).values(row);

export const updateLineQuery = (db: Db, row: LineRow) =>
  db.update(ledgerLines).set({ ...row, version: row.version + 1 })
    .where(and(eq(ledgerLines.id, row.id), eq(ledgerLines.branchId, row.branchId), eq(ledgerLines.version, row.version)))
    .returning({ version: ledgerLines.version });

export const getPhoto = async (db: Db, branchId: string, id: string): Promise<PhotoRow | undefined> =>
  db.select().from(dayPhotos).where(and(eq(dayPhotos.branchId, branchId), eq(dayPhotos.id, id))).get();

export const findPhotoAnyBranch = async (db: Db, id: string): Promise<PhotoRow | undefined> =>
  db.select().from(dayPhotos).where(eq(dayPhotos.id, id)).get();

export const insertPhotoQuery = (db: Db, row: PhotoRow) => db.insert(dayPhotos).values(row);

export const relabelPhotoQuery = (db: Db, row: { branchId: string; id: string; label: PhotoRow['label'] }) =>
  db.update(dayPhotos).set({ label: row.label })
    .where(and(eq(dayPhotos.id, row.id), eq(dayPhotos.branchId, row.branchId), isNull(dayPhotos.removedAt)));

export const removePhotoQuery = (db: Db, row: { branchId: string; id: string; by: string; at: number }) =>
  db.update(dayPhotos).set({ removedAt: row.at, removedBy: row.by })
    .where(and(eq(dayPhotos.id, row.id), eq(dayPhotos.branchId, row.branchId), isNull(dayPhotos.removedAt)));
