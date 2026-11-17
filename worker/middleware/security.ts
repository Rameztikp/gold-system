import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../env';
import { AppError } from '../lib/errors';

const CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self'", "img-src 'self' blob: data:",
  "connect-src 'self'", "font-src 'self'", "object-src 'none'", "base-uri 'none'",
  "frame-ancestors 'none'", "form-action 'self'",
].join('; ');

/** منع عرض النظام داخل موقع آخر + رؤوس أمان. */
export const securityHeaders: MiddlewareHandler<AppEnv> = async (c, next) => {
  await next();
  c.header('X-Frame-Options', 'DENY');
  c.header('Content-Security-Policy', CSP);
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'no-referrer');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=(self)');
  c.header('Cache-Control', 'no-store');
};

/** فحص Origin لكل طلب يغيّر البيانات. */
export const checkOrigin: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    if (c.req.header('Origin') !== c.env.ORIGIN) throw new AppError('bad_origin');
  }
  await next();
};
