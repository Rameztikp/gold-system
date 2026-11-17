import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { AppError } from '../lib/errors';
import { safeEqual } from '../lib/crypto';
import { listBackups } from '../services/backup';

/** لسكربت backup.ps1 في لابتوب المحل: Authorization: Bearer <BACKUP_TOKEN> */
export const backupRoutes = new Hono<AppEnv>()
  .use(async (c, next) => {
    const auth = c.req.header('Authorization') ?? '';
    const expected = c.env.BACKUP_TOKEN;
    if (!expected || !safeEqual(auth, `Bearer ${expected}`)) throw new AppError('unauthorized');
    await next();
  })
  .get('/', async (c) => c.json({ backups: await listBackups(c.env.PHOTOS) }))
  .get('/:name', async (c) => {
    const name = c.req.param('name');
    if (!/^\d{4}-\d{2}-\d{2}\.json$/.test(name)) throw new AppError('bad_request');
    const obj = await c.env.PHOTOS.get(`backups/${name}`);
    if (!obj) throw new AppError('not_found');
    return new Response(obj.body, { headers: { 'Content-Type': 'application/json' } });
  });
