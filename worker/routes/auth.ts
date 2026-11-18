import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server';
import type { Context } from 'hono';
import type { AppEnv } from '../env';
import { relyingParty } from '../middleware/security';

const rp = (c: Context<AppEnv>) => relyingParty(c.env, c.req.url);
import { linkLoginSchema, passwordLoginSchema, recoveryLoginSchema, setupSchema } from '../../shared/api';
import { createLinkCode, linkLogin } from '../services/link';
import { body } from '../lib/validate';
import { passwordLogin } from '../services/password';
import { recoveryLogin, regenerateCodes, remainingCodes } from '../services/recovery';
import * as passkeys from '../services/passkeys';
import { runSetup, setupNeeded } from '../services/setup';
import { endSession } from '../services/sessions';
import { metaOf, requireSession, requireSessionMaybeLocked, requireOwnerRole, setSessionCookie, clearSessionCookie, sessionToken, sessionHash } from '../middleware/session';
import { unlockWithPasskey, unlockWithPassword } from '../services/unlock';

const passkeyVerify = z.object({ challengeId: z.string().min(8), response: z.looseObject({ id: z.string() }) });
const registerVerify = passkeyVerify.extend({ label: z.string().trim().min(1).max(40) });

export const authRoutes = new Hono<AppEnv>()
  .get('/setup', async (c) => c.json({ needed: await setupNeeded(c.var.db) }))
  .post('/setup', async (c) => {
    const input = await body(c, setupSchema);
    const token = await runSetup(c.var.db, { ...input, expectedToken: c.env.SETUP_TOKEN }, metaOf(c));
    setSessionCookie(c, token);
    return c.json({ ok: true });
  })
  .post('/login/password', async (c) => {
    setSessionCookie(c, await passwordLogin(c.var.db, await body(c, passwordLoginSchema), metaOf(c)));
    return c.json({ ok: true });
  })
  .post('/login/recovery', async (c) => {
    setSessionCookie(c, await recoveryLogin(c.var.db, await body(c, recoveryLoginSchema), metaOf(c)));
    return c.json({ ok: true });
  })
  .post('/login/link', async (c) => {
    setSessionCookie(c, await linkLogin(c.var.db, await body(c, linkLoginSchema), metaOf(c)));
    return c.json({ ok: true });
  })
  .post('/link', requireSession, requireOwnerRole, async (c) => c.json(await createLinkCode(c.var.db, c.var.user, metaOf(c))))
  .post('/login/passkey/options', async (c) => c.json(await passkeys.authenticationOptions(c.var.db, rp(c), { now: Date.now() })))
  .post('/ping', requireSession, (c) => c.json({ ok: true }))
  .post('/unlock/options', requireSessionMaybeLocked, async (c) => c.json(await passkeys.authenticationOptions(c.var.db, rp(c), { now: Date.now(), userId: c.var.user.id })))
  .post('/unlock/passkey', requireSessionMaybeLocked, async (c) => {
    const input = await body(c, passkeyVerify);
    const response = input.response as unknown as AuthenticationResponseJSON;
    await unlockWithPasskey(c.var.db, rp(c), { user: c.var.user, idHash: await sessionHash(c), meta: metaOf(c), challengeId: input.challengeId, response });
    return c.json({ ok: true });
  })
  .post('/unlock/password', requireSessionMaybeLocked, async (c) => {
    const { password } = await body(c, z.object({ password: z.string().min(1).max(200) }));
    await unlockWithPassword(c.var.db, { user: c.var.user, idHash: await sessionHash(c), meta: metaOf(c), password });
    return c.json({ ok: true });
  })
  .post('/login/passkey/verify', async (c) => {
    const input = await body(c, passkeyVerify);
    const response = input.response as unknown as AuthenticationResponseJSON;
    setSessionCookie(c, await passkeys.verifyAuthentication(c.var.db, rp(c), { challengeId: input.challengeId, response, meta: metaOf(c) }));
    return c.json({ ok: true });
  })
  .post('/logout', async (c) => {
    const token = sessionToken(c);
    if (token) await endSession(c.var.db, token, Date.now());
    clearSessionCookie(c);
    return c.json({ ok: true });
  })
  .get('/me', requireSessionMaybeLocked, (c) => c.json(c.var.user))
  .get('/passkeys', requireSession, requireOwnerRole, async (c) =>
    c.json({ passkeys: await passkeys.listUserPasskeys(c.var.db, c.var.user.id), recoveryLeft: await remainingCodes(c.var.db, c.var.user.id) }))
  .post('/passkeys/options', requireSession, requireOwnerRole, async (c) =>
    c.json(await passkeys.registrationOptions(c.var.db, rp(c), { user: c.var.user, now: Date.now() })))
  .post('/passkeys/verify', requireSession, requireOwnerRole, async (c) => {
    const input = await body(c, registerVerify);
    const response = input.response as unknown as RegistrationResponseJSON;
    await passkeys.verifyRegistration(c.var.db, rp(c), { user: c.var.user, now: Date.now(), challengeId: input.challengeId, response, label: input.label });
    return c.json({ ok: true });
  })
  .post('/recovery-codes', requireSession, requireOwnerRole, async (c) =>
    c.json({ codes: await regenerateCodes(c.var.db, c.var.user, Date.now()) }));
