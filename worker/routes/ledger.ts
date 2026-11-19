import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { addLineSchema, cancelLineSchema, compareSchema, dayDataSchema, editLineSchema, newDaySchema, photoLabelSchema, pricesSchema, restoreLineSchema } from '../../shared/api';
import { body } from '../lib/validate';
import { ctxOf } from '../middleware/session';
import { AppError } from '../lib/errors';
import { getState } from '../services/state';
import * as days from '../services/days';
import * as lines from '../services/lines';
import * as photos from '../services/photos';

/** كل عملية ترجع اليوم كاملًا بشكل النموذج، والواجهة تستبدل نسختها به. */
export const ledgerRoutes = new Hono<AppEnv>()
  .get('/state', async (c) => {
    const s = Number(c.req.query('since'));
    return c.json(await getState(ctxOf(c), Number.isSafeInteger(s) && s > 0 ? s : undefined));
  })
  .post('/days', async (c) => c.json(await days.createDay(ctxOf(c), await body(c, newDaySchema)), 201))
  .get('/days/:date', async (c) => c.json(await days.dayView(ctxOf(c), c.req.param('date'))))
  .put('/days/:date/prices', async (c) => c.json(await days.setPrices(ctxOf(c), c.req.param('date'), await body(c, pricesSchema))))
  .put('/days/:date/daydata', async (c) => c.json(await days.setDayData(ctxOf(c), c.req.param('date'), await body(c, dayDataSchema))))
  .post('/days/:date/compare', async (c) => c.json(await days.compareDay(ctxOf(c), c.req.param('date'), await body(c, compareSchema))))
  .post('/days/:date/lines', async (c) => c.json(await lines.addLine(ctxOf(c), c.req.param('date'), await body(c, addLineSchema)), 201))
  .put('/lines/:id', async (c) => c.json(await lines.editLine(ctxOf(c), c.req.param('id'), await body(c, editLineSchema))))
  .post('/lines/:id/cancel', async (c) => c.json(await lines.cancelLine(ctxOf(c), c.req.param('id'), await body(c, cancelLineSchema))))
  .post('/lines/:id/restore', async (c) => c.json(await lines.restoreLine(ctxOf(c), c.req.param('id'), await body(c, restoreLineSchema))))
  .post('/days/:date/photos', async (c) => {
    const len = Number(c.req.header('Content-Length') ?? '0');
    if (len > photos.MAX_PHOTO_BYTES) throw new AppError('too_large');
    const bytes = new Uint8Array(await c.req.arrayBuffer());
    return c.json(await photos.uploadPhoto({ ...ctxOf(c), bucket: c.env.PHOTOS }, { id: c.req.query('id') ?? '', date: c.req.param('date'), bytes, label: c.req.query('label') }), 201);
  })
  .put('/photos/:id/label', async (c) => c.json(await photos.relabelPhoto(ctxOf(c), c.req.param('id'), (await body(c, photoLabelSchema)).label)))
  .post('/photos/:id/remove', async (c) => c.json(await photos.removePhoto(ctxOf(c), c.req.param('id'))))
  .get('/photos/:id', async (c) => {
    const p = await photos.readPhoto({ ...ctxOf(c), bucket: c.env.PHOTOS }, c.req.param('id'));
    return new Response(p.body, { headers: { 'Content-Type': p.contentType, 'Cache-Control': 'private, max-age=31536000, immutable' } });
  });
