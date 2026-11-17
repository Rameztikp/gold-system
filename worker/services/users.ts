import { runBatch } from '../repo/batch';
import * as usersRepo from '../repo/users';
import { revokeUserSessions } from '../repo/auth';
import { auditAfterChangeQuery } from '../repo/audit';
import { hashPassword } from '../lib/crypto';
import { AppError, notFound } from '../lib/errors';
import { uuidv7 } from '../../shared/domain';
import { type Ctx, commitVersioned, requireOwner } from './context';

export const publicUser = (u: usersRepo.UserRow) => ({
  id: u.id, name: u.name, username: u.username, role: u.role, status: u.status, version: u.version, createdAt: u.createdAt,
});

export async function listUsers(ctx: Ctx) {
  requireOwner(ctx);
  return (await usersRepo.listUsers(ctx.db, ctx.user.branchId)).map(publicUser);
}

export async function createEntryUser(ctx: Ctx, input: { name: string; username: string; password: string }) {
  requireOwner(ctx);
  const username = input.username.toLowerCase();
  if (await usersRepo.findByUsername(ctx.db, username)) throw new AppError('conflict', 'username_taken');
  const row: usersRepo.UserRow = {
    id: uuidv7(ctx.now), branchId: ctx.user.branchId, name: input.name, username, role: 'entry', status: 'active',
    passwordHash: await hashPassword(input.password), failedAttempts: 0, lockedUntil: null, version: 1, createdAt: ctx.now,
  };
  const audit = { branchId: row.branchId, userId: ctx.user.id, who: ctx.user.name, entity: 'user', entityId: row.id, action: 'create', kind: 'user' as const, title: 'إضافة مستخدم', detail: `${row.name} (${row.username})`, after: publicUser(row) };
  await runBatch(ctx.db, [usersRepo.insertUserQuery(ctx.db, row), auditAfterChangeQuery(ctx.db, audit, ctx.now)]);
  return publicUser(row);
}

async function requireTarget(ctx: Ctx, id: string): Promise<usersRepo.UserRow> {
  requireOwner(ctx);
  const u = await usersRepo.findInBranch(ctx.db, ctx.user.branchId, id);
  if (!u) throw notFound();
  return u;
}

/** المستخدم لا يُحذف؛ يُوقف فقط. */
export async function setStatus(ctx: Ctx, id: string, input: { status: 'active' | 'suspended'; version: number }) {
  const before = await requireTarget(ctx, id);
  if (before.id === ctx.user.id) throw new AppError('bad_request', 'cannot_suspend_self');
  const after = { ...before, status: input.status, version: input.version };
  const audit = { branchId: before.branchId, userId: ctx.user.id, who: ctx.user.name, entity: 'user', entityId: id, action: input.status, kind: 'user' as const, title: input.status === 'active' ? 'السماح بالدخول' : 'إيقاف الدخول', detail: before.name, before: publicUser(before), after: publicUser(after) };
  await commitVersioned(ctx.db, [
    usersRepo.updateUserQuery(ctx.db, after), auditAfterChangeQuery(ctx.db, audit, ctx.now), revokeUserSessions(ctx.db, id, ctx.now),
  ]);
}

export async function resetPassword(ctx: Ctx, id: string, input: { password: string; version: number }) {
  const before = await requireTarget(ctx, id);
  if (before.role !== 'entry') throw new AppError('bad_request', 'owner_uses_passkey');
  const after = { ...before, passwordHash: await hashPassword(input.password), failedAttempts: 0, lockedUntil: null, version: input.version };
  const audit = { branchId: before.branchId, userId: ctx.user.id, who: ctx.user.name, entity: 'user', entityId: id, action: 'reset_password', kind: 'user' as const, title: 'تغيير كلمة المرور', detail: before.name };
  await commitVersioned(ctx.db, [
    usersRepo.updateUserQuery(ctx.db, after), auditAfterChangeQuery(ctx.db, audit, ctx.now), revokeUserSessions(ctx.db, id, ctx.now),
  ]);
}
