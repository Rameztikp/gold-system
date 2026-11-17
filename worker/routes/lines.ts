import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import { cancelLineSchema, createLineSchema, restoreLineSchema, updateLineSchema } from '../../shared/api';
import { body, query } from '../lib/validate';
import { ctxOf } from '../middleware/session';
import * as lines from '../services/lines';
import { searchLines, suggest } from '../services/search';

const suggestQuery = z.object({ kind: z.enum(['sale', 'purchase', 'expense']), q: z.string().max(100) });
const searchQuery = z.object({ q: z.string().trim().min(1).max(100) });

export const lineRoutes = new Hono<AppEnv>()
  .post('/', async (c) => c.json(await lines.createLine(ctxOf(c), await body(c, createLineSchema)), 201))
  .patch('/:id', async (c) => c.json(await lines.updateLine(ctxOf(c), c.req.param('id'), await body(c, updateLineSchema))))
  .post('/:id/cancel', async (c) => c.json(await lines.cancelLine(ctxOf(c), c.req.param('id'), await body(c, cancelLineSchema))))
  .post('/:id/restore', async (c) => c.json(await lines.restoreLine(ctxOf(c), c.req.param('id'), await body(c, restoreLineSchema))));

export const searchRoutes = new Hono<AppEnv>()
  .get('/search', async (c) => c.json({ results: await searchLines(ctxOf(c), query(c, searchQuery).q) }))
  .get('/suggest', async (c) => c.json({ suggestions: await suggest(ctxOf(c), query(c, suggestQuery)) }));
