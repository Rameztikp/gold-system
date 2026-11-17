import { runBatch } from '../repo/batch';
import * as usersRepo from '../repo/users';
import { verifyPassword } from '../lib/crypto';
import { AppError } from '../lib/errors';
import type { Db } from '../db/client';
import { createSession, logSecurity, type RequestMeta } from './sessions';

export const MAX_ATTEMPTS = 5;
export const LOCK_MS = 15 * 60 * 1000;

async function recordFailure(db: Db, user: usersRepo.UserRow, meta: RequestMeta): Promise<void> {
  const failed = user.failedAttempts + 1;
  const lockedUntil = failed >= MAX_ATTEMPTS ? meta.now + LOCK_MS : null;
  await runBatch(db, [
    usersRepo.setLoginState(db, user.id, { failedAttempts: lockedUntil ? 0 : failed, lockedUntil }),
    logSecurity(db, lockedUntil ? 'locked' : 'login_failed', { ...meta, userId: user.id, branchId: user.branchId }),
  ]);
}

/** مدخل البيانات فقط يدخل بكلمة مرور. */
export async function passwordLogin(db: Db, input: { username: string; password: string }, meta: RequestMeta): Promise<string> {
  const user = await usersRepo.findByUsername(db, input.username.toLowerCase());
  if (!user || user.role !== 'entry' || !user.passwordHash || user.status !== 'active') {
    await logSecurity(db, 'login_failed', meta);
    throw new AppError('unauthorized');
  }
  if (user.lockedUntil && user.lockedUntil > meta.now) throw new AppError('locked');
  if (!(await verifyPassword(input.password, user.passwordHash))) {
    await recordFailure(db, user, meta);
    throw new AppError('unauthorized');
  }
  await usersRepo.setLoginState(db, user.id, { failedAttempts: 0, lockedUntil: null });
  return createSession(db, user, meta);
}
