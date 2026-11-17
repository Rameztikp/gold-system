import type { MiddlewareHandler, Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { AppEnv } from '../env';
import { createDb } from '../db/client';
import { resolveSession, SESSION_TTL_MS, type RequestMeta } from '../services/sessions';
import { AppError } from '../lib/errors';
import type { Ctx } from '../services/context';

export const SESSION_COOKIE = '__Host-session';

export const withDb: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set('db', createDb(c.env.DB));
  await next();
};

/** الفرع يأتي من الجلسة فقط، لا من الطلب (حارس الفرع). */
export const requireSession: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  const user = token ? await resolveSession(c.var.db, token, Date.now()) : null;
  if (!user) throw new AppError('unauthorized');
  c.set('user', user);
  await next();
};

export const requireOwnerRole: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (c.var.user.role !== 'owner') throw new AppError('forbidden');
  await next();
};

export function setSessionCookie(c: Context<AppEnv>, token: string): void {
  setCookie(c, SESSION_COOKIE, token, {
    path: '/', secure: true, httpOnly: true, sameSite: 'Strict', maxAge: Math.floor(SESSION_TTL_MS / 1000),
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
