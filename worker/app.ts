import { Hono } from 'hono';
import type { AppEnv } from './env';
import { AppError } from './lib/errors';
import { securityHeaders, checkOrigin } from './middleware/security';
import { withDb, requireSession, requireOwnerRole } from './middleware/session';
import { authRoutes } from './routes/auth';
import { ledgerRoutes } from './routes/ledger';
import { adminRoutes } from './routes/admin';
import { backupRoutes } from './routes/backup';

export function createApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>().basePath('/api');
  app.use(securityHeaders, checkOrigin, withDb);
  app.route('/auth', authRoutes);
  app.route('/backup', backupRoutes);
  app.use('/admin/*', requireSession, requireOwnerRole);
  app.route('/admin', adminRoutes);
  for (const p of ['/state', '/days', '/days/*', '/lines/*', '/photos/*']) app.use(p, requireSession);
  app.route('/', ledgerRoutes);
  app.onError((err, c) => {
    if (err instanceof AppError) return c.json({ error: err.code, detail: err.message }, err.status as 400);
    console.error(err);
    return c.json({ error: 'server_error' }, 500);
  });
  app.notFound((c) => c.json({ error: 'not_found' }, 404));
  return app;
}
