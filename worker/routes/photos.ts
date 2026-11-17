import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { ctxOf } from '../middleware/session';
import { AppError } from '../lib/errors';
import { MAX_PHOTO_BYTES, readPhoto, uploadPhoto } from '../services/photos';

export const photoRoutes = new Hono<AppEnv>()
  .post('/', async (c) => {
    const len = Number(c.req.header('Content-Length') ?? '0');
    if (len > MAX_PHOTO_BYTES) throw new AppError('too_large');
    const id = c.req.query('id') ?? '';
    const dayId = c.req.query('dayId') ?? '';
    const bytes = new Uint8Array(await c.req.arrayBuffer());
    return c.json(await uploadPhoto({ ...ctxOf(c), bucket: c.env.PHOTOS }, { id, dayId, bytes }), 201);
  })
  .get('/:id', async (c) => {
    const p = await readPhoto({ ...ctxOf(c), bucket: c.env.PHOTOS }, c.req.param('id'));
    return new Response(p.body, { headers: { 'Content-Type': p.contentType, 'Cache-Control': 'private, max-age=86400' } });
  });
