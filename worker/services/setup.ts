import { runBatch } from '../repo/batch';
import * as branchesRepo from '../repo/branches';
import * as usersRepo from '../repo/users';
import { safeEqual } from '../lib/crypto';
import { AppError } from '../lib/errors';
import { uuidv7 } from '../../shared/domain';
import type { Db } from '../db/client';
import { createSession, logSecurity, type RequestMeta } from './sessions';

/** الإعدادات الافتراضية لفرع الشارقة — قابلة للتعديل من «الإعدادات». */
const DEFAULT_BRANCH = { currency: 'AED', countryCode: '971', timezone: 'Asia/Dubai', weekStart: 6 };

export interface SetupInput { token: string; ownerName: string; username: string; branchName: string }

/** إعداد أول مرة: ينشئ الفرع وصاحب المحل. يعمل مرة واحدة فقط. */
export async function runSetup(db: Db, input: SetupInput & { expectedToken: string | undefined }, meta: RequestMeta): Promise<string> {
  if (!input.expectedToken) throw new AppError('not_configured');
  if (!safeEqual(input.token.trim(), input.expectedToken.trim())) {
    await logSecurity(db, 'setup_failed', meta);
    throw new AppError('unauthorized');
  }
  if ((await usersRepo.countUsers(db)) > 0) throw new AppError('setup_done');
  const branchId = uuidv7(meta.now);
  const owner: usersRepo.UserRow = {
    id: uuidv7(meta.now), branchId, name: input.ownerName, username: input.username.toLowerCase(), role: 'owner',
    status: 'active', passwordHash: null, failedAttempts: 0, lockedUntil: null, version: 1, createdAt: meta.now,
  };
  await runBatch(db, [
    branchesRepo.insertBranchQuery(db, { id: branchId, name: input.branchName, ...DEFAULT_BRANCH, version: 1 }),
    usersRepo.insertUserQuery(db, owner),
  ]);
  return createSession(db, owner, meta);
}

export async function setupNeeded(db: Db): Promise<boolean> {
  return (await usersRepo.countUsers(db)) === 0;
}
