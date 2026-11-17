import { Hono } from 'hono';
import type { AppEnv } from './env';
import { AppError } from './lib/errors';
import { securityHeaders, checkOrigin } from './middleware/security';
import { withDb, requireSession, requireOwnerRole } from './middleware/session';
import { authRoutes } from './routes/auth';
import { dayRoutes } from './routes/days';
import { lineRoutes, searchRoutes } from './routes/lines';
import { reportRoutes } from './routes/reports';
import { photoRoutes } from './routes/photos';
import { adminRoutes, settingsRoutes } from './routes/admin';
import { backupRoutes } from './routes/backup';

export function createApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>().basePath('/api');
  app.use(securityHeaders, checkOrigin, withDb);
  app.route('/auth', authRoutes);
  app.route('/backup', backupRoutes);
  app.use('/days/*', requireSession).use('/lines/*', requireSession).use('/photos/*', requireSession);
  app.use('/search', requireSession).use('/suggest', requireSession).use('/dashboard', requireSession);
  app.use('/reports', requireSession).use('/settings', requireSession);
  app.use('/admin/*', requireSession, requireOwnerRole);
  app.route('/days', dayRoutes).route('/lines', lineRoutes).route('/photos', photoRoutes);
  app.route('/', searchRoutes).route('/', reportRoutes).route('/', settingsRoutes).route('/admin', adminRoutes);
  app.onError((err, c) => {
    if (err instanceof AppError) return c.json({ error: err.code, detail: err.message }, err.status as 400);
    console.error(err);
    return c.json({ error: 'server_error' }, 500);
  });
  app.notFound((c) => c.json({ error: 'not_found' }, 404));
  return app;
}
