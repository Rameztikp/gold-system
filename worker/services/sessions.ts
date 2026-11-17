import { runBatch } from '../repo/batch';
import * as authRepo from '../repo/auth';
import * as usersRepo from '../repo/users';
import { insertSecurityEvent } from '../repo/audit';
import { randomToken, sha256 } from '../lib/crypto';
import type { Db } from '../db/client';
import type { SessionUser } from '../env';

import { SESSION_TTL, IDLE_LOCK } from '../../shared/session-policy';
import { AppError } from '../lib/errors';

/** الكوكي يعيش أطول مدة؛ الخادم هو اللي يقرر انتهاء الجلسة. */
export const COOKIE_TTL_MS = SESSION_TTL.owner;

export interface RequestMeta { ip: string | null; userAgent: string | null; now: number }

export async function createSession(db: Db, user: usersRepo.UserRow, meta: RequestMeta): Promise<string> {
  const token = randomToken();
  await runBatch(db, [
    authRepo.insertSession(db, {
      idHash: await sha256(token), userId: user.id, branchId: user.branchId,
      expiresAt: meta.now + SESSION_TTL[user.role], createdAt: meta.now, revokedAt: null, lastActive: meta.now,
    }),
    insertSecurityEvent(db, { branchId: user.branchId, userId: user.id, event: 'login', ip: meta.ip, userAgent: meta.userAgent, at: meta.now }),
  ]);
  return token;
}

export interface Resolved { user: SessionUser; idHash: string; locked: boolean; lastActive: number }

/** الجلسة المقفولة (ما استُخدمت من مدة) تبقى صالحة، بس تحتاج فتح بالبصمة أو كلمة المرور. */
export async function resolveSession(db: Db, token: string, now: number): Promise<Resolved | null> {
  const idHash = await sha256(token);
  const s = await authRepo.findActiveSession(db, idHash, now);
  if (!s) return null;
  const u = await usersRepo.findById(db, s.userId);
  if (!u || u.status !== 'active') return null;
  const lastActive = s.lastActive ?? now;
  return { user: { id: u.id, branchId: u.branchId, name: u.name, role: u.role }, idHash, lastActive, locked: now - lastActive > IDLE_LOCK[u.role] };
}

/** يسجّل النشاط (مرة كل 30 ثانية على الأكثر حتى ما نكثر الكتابة). */
export async function touch(db: Db, r: Resolved, now: number): Promise<void> {
  if (now - r.lastActive > 30_000) await authRepo.touchSession(db, r.idHash, now);
}

export function assertUnlocked(r: Resolved): void {
  if (r.locked) throw new AppError('session_locked');
}

export async function endSession(db: Db, token: string, now: number): Promise<void> {
  await authRepo.revokeSession(db, await sha256(token), now);
}

export const logSecurity = (db: Db, event: string, meta: RequestMeta & { userId?: string; branchId?: string }) =>
  insertSecurityEvent(db, {
    event, ip: meta.ip, userAgent: meta.userAgent, at: meta.now,
    userId: meta.userId ?? null, branchId: meta.branchId ?? null,
  });
