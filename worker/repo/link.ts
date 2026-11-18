import { and, eq, gt, isNull, lt, sql } from 'drizzle-orm';
import { type Db, schema } from '../db/client';

const { linkCodes } = schema;
export const LINK_MAX_ATTEMPTS = 5;
export type LinkRow = typeof linkCodes.$inferSelect;

const active = (now: number) => and(isNull(linkCodes.usedAt), gt(linkCodes.expiresAt, now), lt(linkCodes.attempts, LINK_MAX_ATTEMPTS));

export const revokeUserLinksQuery = (db: Db, userId: string, now: number) =>
  db.update(linkCodes).set({ usedAt: now }).where(and(eq(linkCodes.userId, userId), isNull(linkCodes.usedAt)));

export const insertLinkQuery = (db: Db, row: LinkRow) => db.insert(linkCodes).values(row);

export const listActive = async (db: Db, now: number): Promise<LinkRow[]> => db.select().from(linkCodes).where(active(now));

/** محاولة خاطئة تنحسب على كل الرموز الشغالة، فما أحد يقدر يجرّب أكثر من 5 مرات. */
export const countFailure = (db: Db, now: number) =>
  db.update(linkCodes).set({ attempts: sql`${linkCodes.attempts} + 1` }).where(active(now));

/** يستخدم الرمز مرة واحدة؛ يرجّع الصف لو نجح. */
export const useLink = async (db: Db, id: string, now: number): Promise<LinkRow | undefined> =>
  (await db.update(linkCodes).set({ usedAt: now }).where(and(eq(linkCodes.id, id), active(now))).returning())[0];
