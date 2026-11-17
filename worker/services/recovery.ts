import { runBatch } from '../repo/batch';
import * as authRepo from '../repo/auth';
import * as usersRepo from '../repo/users';
import { randomToken, sha256, safeEqual } from '../lib/crypto';
import { AppError } from '../lib/errors';
import type { Db } from '../db/client';
import type { SessionUser } from '../env';
import { createSession, logSecurity, type RequestMeta } from './sessions';

export const RECOVERY_CODE_COUNT = 10;

const formatCode = (hex: string): string => `${hex.slice(0, 5)}-${hex.slice(5, 10)}`.toUpperCase();
const canonical = (code: string): string => code.replace(/[^0-9a-z]/gi, '').toUpperCase();

/** 10 رموز جديدة؛ القديمة تُلغى. تُعرض مرة واحدة فقط. */
export async function regenerateCodes(db: Db, user: SessionUser, now: number): Promise<string[]> {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () => formatCode(randomToken(5)));
  const rows = await Promise.all(codes.map(async (c) => ({
    id: randomToken(12), userId: user.id, codeHash: await sha256(canonical(c)), usedAt: null,
  })));
  await runBatch(db, [
    authRepo.revokeCodesQuery(db, user.id, now),
    authRepo.insertCodesQuery(db, rows),
    logSecurity(db, 'recovery_codes_generated', { ip: null, userAgent: null, now, userId: user.id, branchId: user.branchId }),
  ]);
  return codes;
}

export async function recoveryLogin(db: Db, input: { username: string; code: string }, meta: RequestMeta): Promise<string> {
  const user = await usersRepo.findByUsername(db, input.username.toLowerCase());
  const hash = await sha256(canonical(input.code));
  const codes = user && user.role === 'owner' && user.status === 'active' ? await authRepo.listUnusedCodes(db, user.id) : [];
  const match = codes.find((c) => safeEqual(c.codeHash, hash));
  if (!user || !match) {
    await logSecurity(db, 'recovery_failed', meta);
    throw new AppError('unauthorized');
  }
  await runBatch(db, [
    authRepo.useCodeQuery(db, match.id, meta.now),
    logSecurity(db, 'recovery_used', { ...meta, userId: user.id, branchId: user.branchId }),
  ]);
  return createSession(db, user, meta);
}

export async function remainingCodes(db: Db, userId: string): Promise<number> {
  return (await authRepo.listUnusedCodes(db, userId)).length;
}
