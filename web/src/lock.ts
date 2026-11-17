/* قفل التطبيق بعد عدم الاستخدام (D-26): صاحب المحل 5 دقائق ← بصمة، مدخل البيانات 15 دقيقة ← كلمة المرور. */
import { startAuthentication, type PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';
import { IDLE_LOCK, PING_EVERY } from '../../shared/session-policy';
import { esc } from './util';
import { diamond, ico } from './icons';
import { S, U, APP_NAME } from './state';
import { api, ApiError, errorText } from './api';

export const LOCK: { locked: boolean; last: number; lastPing: number; err: string; busy: boolean; afterUnlock: (() => Promise<void>) | null } =
  { locked: false, last: Date.now(), lastPing: Date.now(), err: '', busy: false, afterUnlock: null };
let rerender: () => void = () => undefined;
export const setLockRender = (fn: () => void): void => { rerender = fn; };

const limit = (): number => (S.me.role === 'owner' ? IDLE_LOCK.owner : IDLE_LOCK.entry);

export function lockNow(): void {
  if (!U.user || LOCK.locked) return;
  LOCK.locked = true; LOCK.err = ''; LOCK.busy = false;
  document.getElementById('modal-root')!.innerHTML = '';
  rerender();
}

function activity(): void {
  if (!U.user || LOCK.locked) return;
  const now = Date.now();
  if (now - LOCK.last > limit()) { lockNow(); return; }
  LOCK.last = now;
  if (now - LOCK.lastPing > PING_EVERY) {
    LOCK.lastPing = now;
    api.post('/auth/ping').catch((e: unknown) => { if (e instanceof ApiError && e.code === 'session_locked') lockNow(); });
  }
}

function check(): void { if (U.user && !LOCK.locked && Date.now() - LOCK.last > limit()) lockNow(); }

export function wireLock(): void {
  for (const ev of ['pointerdown', 'keydown', 'touchstart', 'wheel']) document.addEventListener(ev, activity, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
  window.setInterval(check, 20_000);
}

export const resetActivity = (): void => { LOCK.locked = false; LOCK.afterUnlock = null; LOCK.last = Date.now(); LOCK.lastPing = Date.now(); LOCK.err = ''; LOCK.busy = false; };

export function viewLock(): string {
  const owner = S.me.role === 'owner';
  const err = LOCK.err ? `<p class="err" role="alert" style="margin:12px 0 0">${esc(LOCK.err)}</p>` : '';
  const body = owner
    ? `<button type="button" class="btn-gold btn-wide" data-act="unlockkey"${LOCK.busy ? ' disabled' : ''}>${ico('key', 18)} ${LOCK.busy ? 'جاري الفتح…' : 'افتح بالبصمة (Face ID)'}</button>`
    : `<form data-form="unlock" autocomplete="on"><label class="lb" for="ul-pw">كلمة المرور</label><input class="in" id="ul-pw" name="pw" type="password" autocomplete="current-password" autofocus>
       <button class="btn-gold btn-wide" type="submit"${LOCK.busy ? ' disabled' : ''}>${LOCK.busy ? 'جاري الفتح…' : 'افتح'}</button></form>`;
  return `<div class="login"><div class="login-card">
    <div class="login-top">${diamond(52)}<h1 class="kufi">${APP_NAME}</h1><p class="sub">النظام مقفول لأنه ما استُخدم من فترة.</p></div>
    <p class="sub" style="margin:0 0 12px">${esc(S.me.name)}</p>
    ${body}${err}
    <button type="button" class="btn-ghost btn-wide" data-act="logout" style="margin-top:10px">${ico('out', 16)} خروج</button>
  </div></div>`;
}

async function attempt(job: () => Promise<unknown>, fail: (e: unknown) => string): Promise<void> {
  LOCK.busy = true; LOCK.err = ''; rerender();
  try {
    await job();
    const after = LOCK.afterUnlock; LOCK.afterUnlock = null;
    resetActivity();
    if (after) await after(); else rerender();
  } catch (e) { LOCK.busy = false; LOCK.err = fail(e); rerender(); }
}

export function unlockWithKey(): void {
  void attempt(async () => {
    const { challengeId, options } = await api.post<{ challengeId: string; options: PublicKeyCredentialRequestOptionsJSON }>('/auth/unlock/options');
    const response = await startAuthentication({ optionsJSON: options });
    await api.post('/auth/unlock/passkey', { challengeId, response });
  }, (e) => (e instanceof ApiError ? errorText(e) : 'ما تم التحقق بالبصمة. إذا هذا الجهاز ما عليه بصمة، اضغط «خروج» وادخل برمز استرجاع.'));
}

export function unlockWithPassword(f: HTMLFormElement): void {
  const pw = f.querySelector<HTMLInputElement>('[name=pw]')?.value ?? '';
  void attempt(() => api.post('/auth/unlock/password', { password: pw }), (e) => (e instanceof ApiError && e.status === 401 ? 'كلمة المرور غير صحيحة.'
    : e instanceof ApiError && e.status === 423 ? 'محاولات كثيرة. اضغط «خروج» وادخل بعد 15 دقيقة.' : errorText(e)));
}
