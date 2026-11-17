import { and, eq, gt, isNull } from 'drizzle-orm';
import { type Db, schema } from '../db/client';

const { sessions, passkeys, recoveryCodes, challenges } = schema;
export type PasskeyRow = typeof passkeys.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;

export const insertSession = (db: Db, row: SessionRow) => db.insert(sessions).values(row);

export const findActiveSession = async (db: Db, idHash: string, now: number): Promise<SessionRow | undefined> =>
  db.select().from(sessions)
    .where(and(eq(sessions.idHash, idHash), gt(sessions.expiresAt, now), isNull(sessions.revokedAt)))
    .get();

export const revokeSession = (db: Db, idHash: string, now: number) =>
  db.update(sessions).set({ revokedAt: now }).where(eq(sessions.idHash, idHash));

export const revokeUserSessions = (db: Db, userId: string, now: number) =>
  db.update(sessions).set({ revokedAt: now }).where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));

export const listPasskeys = async (db: Db, userId: string): Promise<PasskeyRow[]> =>
  db.select().from(passkeys).where(eq(passkeys.userId, userId));

export const findPasskey = async (db: Db, id: string): Promise<PasskeyRow | undefined> =>
  db.select().from(passkeys).where(eq(passkeys.id, id)).get();

export const insertPasskey = (db: Db, row: PasskeyRow) => db.insert(passkeys).values(row);

export const updatePasskeyCounter = (db: Db, id: string, counter: number) =>
  db.update(passkeys).set({ counter }).where(eq(passkeys.id, id));

export const insertChallenge = (db: Db, row: typeof challenges.$inferInsert) => db.insert(challenges).values(row);

/** يُستخدم مرة واحدة: يُعلَّم مستخدمًا ويرجع القيمة إذا كان صالحًا. */
export async function consumeChallenge(db: Db, id: string, now: number) {
  const rows = await db.update(challenges).set({ usedAt: now })
    .where(and(eq(challenges.id, id), isNull(challenges.usedAt), gt(challenges.expiresAt, now)))
    .returning();
  return rows[0];
}

export const listUnusedCodes = async (db: Db, userId: string) =>
  db.select().from(recoveryCodes).where(and(eq(recoveryCodes.userId, userId), isNull(recoveryCodes.usedAt)));

export const useCodeQuery = (db: Db, id: string, now: number) =>
  db.update(recoveryCodes).set({ usedAt: now }).where(and(eq(recoveryCodes.id, id), isNull(recoveryCodes.usedAt)));

export const revokeCodesQuery = (db: Db, userId: string, now: number) =>
  db.update(recoveryCodes).set({ usedAt: now }).where(and(eq(recoveryCodes.userId, userId), isNull(recoveryCodes.usedAt)));

export const insertCodesQuery = (db: Db, rows: (typeof recoveryCodes.$inferInsert)[]) =>
  db.insert(recoveryCodes).values(rows);
