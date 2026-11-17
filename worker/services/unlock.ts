import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import * as authRepo from '../repo/auth';
import * as usersRepo from '../repo/users';
import { runBatch } from '../repo/batch';
import { verifyPassword } from '../lib/crypto';
import { AppError } from '../lib/errors';
import type { Db } from '../db/client';
import type { SessionUser } from '../env';
import { verifyAssertion } from './passkeys';
import { logSecurity, type RequestMeta } from './sessions';
import { MAX_ATTEMPTS, LOCK_MS } from './password';

type Rp = { RP_ID: string; RP_NAME: string; ORIGIN: string };
interface Who { user: SessionUser; idHash: string; meta: RequestMeta }

async function opened(db: Db, w: Who): Promise<void> {
  await runBatch(db, [
    authRepo.touchSession(db, w.idHash, w.meta.now),
    logSecurity(db, 'unlock', { ...w.meta, userId: w.user.id, branchId: w.user.branchId }),
  ]);
}

/** فتح القفل بالبصمة: لازم المفتاح يكون لنفس صاحب الجلسة. */
export async function unlockWithPasskey(db: Db, rp: Rp, w: Who & { challengeId: string; response: AuthenticationResponseJSON }): Promise<void> {
  await verifyAssertion(db, rp, { challengeId: w.challengeId, response: w.response, meta: w.meta, forUser: w.user.id });
  await opened(db, w);
}

/** فتح القفل بكلمة المرور (مدخل البيانات). المحاولات الفاشلة تُحسب، وعند القفل تنتهي الجلسة. */
export async function unlockWithPassword(db: Db, w: Who & { password: string }): Promise<void> {
  const u = await usersRepo.findById(db, w.user.id);
  if (!u || u.role !== 'entry' || !u.passwordHash) throw new AppError('forbidden');
  if (u.lockedUntil && u.lockedUntil > w.meta.now) throw new AppError('locked');
  if (await verifyPassword(w.password, u.passwordHash)) {
    await usersRepo.setLoginState(db, u.id, { failedAttempts: 0, lockedUntil: null });
    await opened(db, w);
    return;
  }
  const failed = u.failedAttempts + 1;
  const lockedUntil = failed >= MAX_ATTEMPTS ? w.meta.now + LOCK_MS : null;
  await runBatch(db, [
    usersRepo.setLoginState(db, u.id, { failedAttempts: lockedUntil ? 0 : failed, lockedUntil }),
    logSecurity(db, 'unlock_failed', { ...w.meta, userId: u.id, branchId: u.branchId }),
    ...(lockedUntil ? [authRepo.revokeSession(db, w.idHash, w.meta.now)] : []),
  ]);
  throw new AppError(lockedUntil ? 'locked' : 'unauthorized');
}
