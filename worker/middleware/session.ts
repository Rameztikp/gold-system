import type { MiddlewareHandler, Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { AppEnv } from '../env';
import { createDb } from '../db/client';
import { resolveSession, touch, assertUnlocked, COOKIE_TTL_MS, type RequestMeta, type Resolved } from '../services/sessions';
import { AppError } from '../lib/errors';
import { sha256 } from '../lib/crypto';
import type { Ctx } from '../services/context';

export const SESSION_COOKIE = '__Host-session';

export const withDb: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set('db', createDb(c.env.DB));
  await next();
};

/** الفرع يأتي من الجلسة فقط، لا من الطلب (حارس الفرع). */
async function resolved(c: Context<AppEnv>): Promise<Resolved> {
  const token = getCookie(c, SESSION_COOKIE);
  const r = token ? await resolveSession(c.var.db, token, Date.now()) : null;
  if (!r) throw new AppError('unauthorized');
  c.set('user', r.user);
  return r;
}

/** جلسة صالحة وغير مقفولة؛ وكل طلب يحدّث آخر نشاط. */
export const requireSession: MiddlewareHandler<AppEnv> = async (c, next) => {
  const r = await resolved(c);
  assertUnlocked(r);
  await touch(c.var.db, r, Date.now());
  await next();
};

/** جلسة صالحة حتى لو مقفولة — لفتح القفل نفسه. */
export const requireSessionMaybeLocked: MiddlewareHandler<AppEnv> = async (c, next) => {
  await resolved(c);
  await next();
};

export const sessionHash = async (c: Context<AppEnv>): Promise<string> => {
  const t = getCookie(c, SESSION_COOKIE);
  if (!t) throw new AppError('unauthorized');
  return sha256(t);
};

export const requireOwnerRole: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (c.var.user.role !== 'owner') throw new AppError('forbidden');
  await next();
};

export function setSessionCookie(c: Context<AppEnv>, token: string): void {
  setCookie(c, SESSION_COOKIE, token, {
    path: '/', secure: true, httpOnly: true, sameSite: 'Strict', maxAge: Math.floor(COOKIE_TTL_MS / 1000),
  });
}

export const clearSessionCookie = (c: Context<AppEnv>): void => {
  deleteCookie(c, SESSION_COOKIE, { path: '/', secure: true });
};

export const sessionToken = (c: Context<AppEnv>): string | undefined => getCookie(c, SESSION_COOKIE);

export const metaOf = (c: Context<AppEnv>): RequestMeta => ({
  ip: c.req.header('CF-Connecting-IP') ?? null,
  userAgent: c.req.header('User-Agent')?.slice(0, 200) ?? null,
  now: Date.now(),
});

export const ctxOf = (c: Context<AppEnv>): Ctx => ({ db: c.var.db, user: c.var.user, now: Date.now() });
