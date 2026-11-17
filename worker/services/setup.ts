import { runBatch } from '../repo/batch';
import * as branchesRepo from '../repo/branches';
import * as usersRepo from '../repo/users';
import { safeEqual, sha256 } from '../lib/crypto';
import * as setupRepo from '../repo/setup';
import { AppError } from '../lib/errors';
import { uuidv7 } from '../../shared/domain';
import type { Db } from '../db/client';
import { createSession, logSecurity, type RequestMeta } from './sessions';

/** الإعدادات الافتراضية لفرع الشارقة — قابلة للتعديل من «الإعدادات». */
const DEFAULT_BRANCH = { currency: 'AED', countryCode: '971', timezone: 'Asia/Dubai', weekStart: 6, catsJson: null, namesJson: null, wa: null };

export interface SetupInput { token: string; ownerName: string; username: string; branchName: string }

/** إعداد أول مرة: ينشئ الفرع وصاحب المحل. يعمل مرة واحدة فقط. */
export async function runSetup(db: Db, input: SetupInput & { expectedToken: string | undefined }, meta: RequestMeta): Promise<string> {
  if ((await usersRepo.countUsers(db)) > 0) throw new AppError('setup_done');
  const codeHash = await checkSetupToken(db, { token: input.token, expected: input.expectedToken }, meta);
  const branchId = uuidv7(meta.now);
  const owner: usersRepo.UserRow = {
    id: uuidv7(meta.now), branchId, name: input.ownerName, username: input.username.toLowerCase(), role: 'owner',
    status: 'active', passwordHash: null, failedAttempts: 0, lockedUntil: null, version: 1, createdAt: meta.now,
  };
  await runBatch(db, [
    branchesRepo.insertBranchQuery(db, { id: branchId, name: input.branchName, ...DEFAULT_BRANCH, version: 1 }),
    usersRepo.insertUserQuery(db, owner),
    ...(codeHash ? [setupRepo.useSetupCodeQuery(db, codeHash, meta.now)] : []),
  ]);
  return createSession(db, owner, meta);
}

/**
 * الرمز يُقبل إذا طابق SETUP_TOKEN، أو طابق رمزًا صالحًا في جدول setup_codes.
 * يرجع تجزئة الرمز من الجدول (لتعليمه مستخدمًا) أو null.
 */
async function checkSetupToken(db: Db, t: { token: string; expected: string | undefined }, meta: RequestMeta): Promise<string | null> {
  const token = t.token.trim();
  if (t.expected && safeEqual(token, t.expected.trim())) return null;
  const hash = await sha256(token);
  if (await setupRepo.findValidSetupCode(db, hash, meta.now)) return hash;
  if (!t.expected && (await setupRepo.countActiveSetupCodes(db, meta.now)) === 0) throw new AppError('not_configured');
  await logSecurity(db, 'setup_failed', meta);
  throw new AppError('unauthorized');
}

export async function setupNeeded(db: Db): Promise<boolean> {
  return (await usersRepo.countUsers(db)) === 0;
}
