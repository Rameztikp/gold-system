import type { Env } from './env';
import { createApp } from './app';
import { createDb } from './db/client';
import { nightlyBackup } from './services/backup';

const app = createApp();

export default {
  fetch: app.fetch,
  /** نسخة احتياطية كل ليلة داخل Cloudflare (R2). */
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(nightlyBackup(createDb(env.DB), env.PHOTOS, new Date()).then(() => undefined));
  },
} satisfies ExportedHandler<Env>;
