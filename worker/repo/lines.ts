import { and, eq, asc, inArray, like, desc, sql } from 'drizzle-orm';
import { type Db, schema } from '../db/client';

const { lines, days } = schema;
export type LineRow = typeof lines.$inferSelect;

export const getLine = async (db: Db, branchId: string, id: string): Promise<LineRow | undefined> =>
  db.select().from(lines).where(and(eq(lines.branchId, branchId), eq(lines.id, id))).get();

export const findLineAnyBranch = async (db: Db, id: string): Promise<LineRow | undefined> =>
  db.select().from(lines).where(eq(lines.id, id)).get();

export const listDayLines = async (db: Db, branchId: string, dayId: string): Promise<LineRow[]> =>
  db.select().from(lines).where(and(eq(lines.branchId, branchId), eq(lines.dayId, dayId)))
    .orderBy(asc(lines.kind), asc(lines.position));

export const listLinesForDays = async (db: Db, branchId: string, dayIds: string[]): Promise<LineRow[]> => {
  if (dayIds.length === 0) return [];
  return db.select().from(lines).where(and(eq(lines.branchId, branchId), inArray(lines.dayId, dayIds)))
    .orderBy(asc(lines.position));
};

export async function nextPosition(db: Db, branchId: string, dayId: string): Promise<number> {
  const r = await db.select({ m: sql<number | null>`max(${lines.position})` }).from(lines)
    .where(and(eq(lines.branchId, branchId), eq(lines.dayId, dayId))).get();
  return (r?.m ?? 0) + 1;
}

export const insertLineQuery = (db: Db, row: LineRow) => db.insert(lines).values(row);

export const updateLineQuery = (db: Db, row: LineRow) =>
  db.update(lines)
    .set({ ...row, version: row.version + 1 })
    .where(and(eq(lines.id, row.id), eq(lines.branchId, row.branchId), eq(lines.version, row.version)))
    .returning({ version: lines.version });

/** بحث مبدئي بـ LIKE على النص المطبَّع، ثم التصفية الدقيقة في الخدمة. */
export const searchLines = async (db: Db, branchId: string, word: string) =>
  db.select({ line: lines, date: days.date }).from(lines)
    .innerJoin(days, eq(days.id, lines.dayId))
    .where(and(eq(lines.branchId, branchId), like(lines.searchText, `%${word.replace(/[%_]/g, '')}%`)))
    .orderBy(desc(days.date)).limit(500);

export const recentDescriptions = async (db: Db, branchId: string, kind: LineRow['kind']) =>
  db.select({ d: lines.description }).from(lines)
    .where(and(eq(lines.branchId, branchId), eq(lines.kind, kind)))
    .orderBy(desc(lines.createdAt)).limit(2000);
