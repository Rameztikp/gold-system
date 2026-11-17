import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { type Db, schema } from '../db/client';

const { setupCodes } = schema;

export const findValidSetupCode = async (db: Db, codeHash: string, now: number) =>
  db.select().from(setupCodes)
    .where(and(eq(setupCodes.codeHash, codeHash), isNull(setupCodes.usedAt), gt(setupCodes.expiresAt, now))).get();

export const countActiveSetupCodes = async (db: Db, now: number): Promise<number> =>
  (await db.select({ n: sql<number>`count(*)` }).from(setupCodes)
    .where(and(isNull(setupCodes.usedAt), gt(setupCodes.expiresAt, now))).get())?.n ?? 0;

export const useSetupCodeQuery = (db: Db, codeHash: string, now: number) =>
  db.update(setupCodes).set({ usedAt: now }).where(eq(setupCodes.codeHash, codeHash));
