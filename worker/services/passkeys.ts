import { runBatch } from '../repo/batch';
import {
  generateAuthenticationOptions, generateRegistrationOptions,
  verifyAuthenticationResponse, verifyRegistrationResponse,
  type AuthenticationResponseJSON, type RegistrationResponseJSON, type AuthenticatorTransport,
} from '@simplewebauthn/server';
import * as authRepo from '../repo/auth';
import * as usersRepo from '../repo/users';
import { b64url, randomToken } from '../lib/crypto';
import { AppError } from '../lib/errors';
import type { Db } from '../db/client';
import type { Env, SessionUser } from '../env';
import { createSession, logSecurity, type RequestMeta } from './sessions';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
type Rp = Pick<Env, 'RP_ID' | 'RP_NAME' | 'ORIGIN'>;

async function storeChallenge(db: Db, challenge: string, opts: { userId: string | null; now: number }): Promise<string> {
  const id = randomToken(16);
  await authRepo.insertChallenge(db, { id, challenge, userId: opts.userId, expiresAt: opts.now + CHALLENGE_TTL_MS });
  return id;
}

const transportsOf = (t: string | null): AuthenticatorTransport[] | undefined =>
  t ? (JSON.parse(t) as AuthenticatorTransport[]) : undefined;

export async function registrationOptions(db: Db, rp: Rp, ctx: { user: SessionUser; now: number }) {
  const existing = await authRepo.listPasskeys(db, ctx.user.id);
  const options = await generateRegistrationOptions({
    rpName: rp.RP_NAME, rpID: rp.RP_ID, userName: ctx.user.name, userDisplayName: ctx.user.name,
    userID: new TextEncoder().encode(ctx.user.id), attestationType: 'none',
    excludeCredentials: existing.map((p) => ({ id: p.id, transports: transportsOf(p.transports) })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
  });
  return { challengeId: await storeChallenge(db, options.challenge, { userId: ctx.user.id, now: ctx.now }), options };
}

export async function verifyRegistration(
  db: Db, rp: Rp,
  input: { user: SessionUser; now: number; challengeId: string; response: RegistrationResponseJSON; label: string },
): Promise<void> {
  const ch = await authRepo.consumeChallenge(db, input.challengeId, input.now);
  if (!ch || ch.userId !== input.user.id) throw new AppError('bad_request', 'challenge');
  const v = await verifyRegistrationResponse({
    response: input.response, expectedChallenge: ch.challenge, expectedOrigin: rp.ORIGIN,
    expectedRPID: rp.RP_ID, requireUserVerification: true,
  });
  if (!v.verified) throw new AppError('bad_request', 'passkey');
  const c = v.registrationInfo.credential;
  await runBatch(db, [
    authRepo.insertPasskey(db, {
      id: c.id, userId: input.user.id, publicKey: b64url.encode(c.publicKey), counter: c.counter,
      transports: c.transports ? JSON.stringify(c.transports) : null, label: input.label, createdAt: input.now,
    }),
    logSecurity(db, 'passkey_added', { ip: null, userAgent: null, now: input.now, userId: input.user.id, branchId: input.user.branchId }),
  ]);
}

export async function authenticationOptions(db: Db, rp: Rp, now: number) {
  const options = await generateAuthenticationOptions({ rpID: rp.RP_ID, userVerification: 'required' });
  return { challengeId: await storeChallenge(db, options.challenge, { userId: null, now }), options };
}

export async function verifyAuthentication(
  db: Db, rp: Rp,
  input: { challengeId: string; response: AuthenticationResponseJSON; meta: RequestMeta },
): Promise<string> {
  const ch = await authRepo.consumeChallenge(db, input.challengeId, input.meta.now);
  const pk = await authRepo.findPasskey(db, input.response.id);
  const user = pk ? await usersRepo.findById(db, pk.userId) : undefined;
  if (!ch || !pk || !user || user.status !== 'active') {
    await logSecurity(db, 'passkey_failed', input.meta);
    throw new AppError('unauthorized');
  }
  const v = await verifyAuthenticationResponse({
    response: input.response, expectedChallenge: ch.challenge, expectedOrigin: rp.ORIGIN, expectedRPID: rp.RP_ID,
    requireUserVerification: true,
    credential: { id: pk.id, publicKey: b64url.decode(pk.publicKey), counter: pk.counter, transports: transportsOf(pk.transports) },
  });
  if (!v.verified) throw new AppError('unauthorized');
  await authRepo.updatePasskeyCounter(db, pk.id, v.authenticationInfo.newCounter);
  return createSession(db, user, input.meta);
}

export async function listUserPasskeys(db: Db, userId: string) {
  return (await authRepo.listPasskeys(db, userId)).map((p) => ({ id: p.id, label: p.label, createdAt: p.createdAt }));
}
