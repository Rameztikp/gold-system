/* ربط جهاز جديد (D-30): صاحب المحل من جهاز داخل فيه يطلع رمز 6 أرقام، والجهاز الجديد يدخل فيه ثم يسجل بصمته. */
import { latin } from '../../shared/domain';
import { runBatch } from '../repo/batch';
import * as linkRepo from '../repo/link';
import * as usersRepo from '../repo/users';
import { randomToken, sha256, safeEqual } from '../lib/crypto';
import { AppError } from '../lib/errors';
import type { Db } from '../db/client';
import type { SessionUser } from '../env';
import { createSession, logSecurity, type RequestMeta } from './sessions';

export const LINK_TTL_MS = 10 * 60 * 1000;

/** 6 أرقام عشوائية بالتساوي (بدون انحياز). */
function sixDigits(): string {
  const b = new Uint32Array(1);
  do crypto.getRandomValues(b); while (b[0]! >= 4_294_000_000);
  return String(b[0]! % 1_000_000).padStart(6, '0');
}
const canonical = (code: string): string => latin(code).replace(/\D/g, '');

/** رمز جديد يلغي أي رمز قديم لنفس الشخص. */
export async function createLinkCode(db: Db, user: SessionUser, meta: RequestMeta): Promise<{ code: string; expiresAt: number }> {
  const code = sixDigits(); const expiresAt = meta.now + LINK_TTL_MS;
  await runBatch(db, [
    linkRepo.revokeUserLinksQuery(db, user.id, meta.now),
    linkRepo.insertLinkQuery(db, { id: randomToken(12), userId: user.id, codeHash: await sha256(code), expiresAt, attempts: 0, usedAt: null }),
    logSecurity(db, 'link_code_created', { ...meta, userId: user.id, branchId: user.branchId }),
  ]);
  return { code, expiresAt };
}

export async function linkLogin(db: Db, input: { code: string }, meta: RequestMeta): Promise<string> {
  const code = canonical(input.code);
  const hash = await sha256(code);
  const match = code.length === 6 ? (await linkRepo.listActive(db, meta.now)).find((r) => safeEqual(r.codeHash, hash)) : undefined;
  const used = match ? await linkRepo.useLink(db, match.id, meta.now) : undefined;
  const user = used ? await usersRepo.findById(db, used.userId) : undefined;
  if (!user || user.role !== 'owner' || user.status !== 'active') {
    await runBatch(db, [linkRepo.countFailure(db, meta.now), logSecurity(db, 'link_failed', meta)]);
    throw new AppError('unauthorized');
  }
  await logSecurity(db, 'link_used', { ...meta, userId: user.id, branchId: user.branchId });
  return createSession(db, user, meta);
}
