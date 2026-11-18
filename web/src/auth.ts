/* الدخول الحقيقي، تحميل البيانات، ومفاتيح المرور ورموز الاسترجاع والمستخدمين. */
import { startRegistration, type PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser';
import type { Day } from '../../shared/domain';
import { esc, num } from './util';
import { ico } from './icons';
import { S, U, lastDay, type Branch, type Me } from './state';
import { api, errorText, ApiError } from './api';
import { askPasskey, passkeyFailText } from './passkey';
import { render, openModal, closeModal, dlgHead, okToast, toast, toTop } from './ui';
import { L } from './views/login';
import { LOCK, resetActivity } from './lock';
import { resetAdminCache, adminUsers } from './views/admin';

export async function loadState(): Promise<void> {
  const st = await api.get<{ me: Me; branch: Branch; days: Day[] }>('/state');
  S.me = st.me; S.branch = st.branch; S.days = Object.fromEntries(st.days.map((d) => [d.id, d]));
  U.user = st.me.role === 'owner' ? 'owner' : 'clerk';
}

/** الجلسة موجودة بس مقفولة: نعرف صاحبها، نعرض القفل، وبعد الفتح نحمّل البيانات. */
async function bootLocked(): Promise<void> {
  S.me = await api.get<Me>('/auth/me');
  U.user = S.me.role === 'owner' ? 'owner' : 'clerk';
  LOCK.locked = true; LOCK.afterUnlock = async () => { await loadState(); enterApp(); };
  render();
}

function enterApp(): void {
  resetActivity();
  U.route = U.user === 'owner' ? 'dash' : 'days'; U.day = lastDay(); U.step = 'sales'; U.period = null; U.rperiod = null;
  L.err = ''; L.busy = false; render(); toTop();
}

export async function boot(): Promise<void> {
  try { await loadState(); enterApp(); return; } catch (e) {
    if (e instanceof ApiError && e.code === 'session_locked') { await bootLocked(); return; }
    if (!(e instanceof ApiError) || e.status !== 401) { L.err = errorText(e); }
  }
  const s = await api.get<{ needed: boolean }>('/auth/setup').catch(() => ({ needed: false }));
  L.mode = s.needed ? 'setup' : 'login';
  render();
}

async function attempt(job: () => Promise<unknown>, fail: (e: unknown) => string): Promise<void> {
  L.busy = true; L.err = ''; render();
  try { await job(); await loadState(); enterApp(); const next = afterLogin; afterLogin = null; next?.(); } catch (e) { afterLogin = null; L.busy = false; L.err = fail(e); render(); }
}
let afterLogin: (() => void) | null = null;

/** بعد الدخول برمز الربط: يطلب تسجيل بصمة هذا الجهاز (لازم ضغطة من المستخدم عشان نافذة البصمة). */
function askForPasskey(): void {
  openModal(`<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-t">${dlgHead('سجّل بصمة هذا الجهاز')}
    <div class="dlg-note">دخلت برمز الربط. سجّل بصمة هذا الجهاز الحين، وبعدها تدخل بـ Face ID على طول بدون رموز.</div>
    <div class="dlg-f"><button type="button" class="btn-gold" data-act="addkey">${ico('key', 17)} سجّل البصمة</button><button type="button" class="btn-ghost" data-act="close">بعدين</button></div></div>`);
}

/** اسم واضح للمفتاح: نوع الجهاز والمتصفح (الآيباد يتسمّى «ماك» في بعض النسخ). */
export function deviceLabel(ua = navigator.userAgent): string {
  const ipad = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const dev = ipad ? 'آيباد' : /iPhone/.test(ua) ? 'آيفون' : /Android/.test(ua) ? 'أندرويد' : /Macintosh/.test(ua) ? 'ماك' : 'كمبيوتر';
  const br = /CriOS|Chrome\//.test(ua) && !/Edg/.test(ua) ? 'Chrome' : /EdgiOS|Edg\//.test(ua) ? 'Edge' : /FxiOS|Firefox/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : '';
  return br ? `${dev} (${br})` : dev;
}

/** رمز ربط جهاز جديد: 6 أرقام، 10 دقائق، مرة وحدة. */
export function linkCode(): void {
  api.post<{ code: string; expiresAt: number }>('/auth/link').then((r) => {
    const mins = Math.max(1, Math.round((r.expiresAt - Date.now()) / 60000));
    openModal(`<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-t">${dlgHead('أضف جهاز جديد')}
      <div class="link-code" aria-label="رمز الربط">${num(esc(r.code.replace(/(\d{3})(\d{3})/, '$1 $2')))}</div>
      <ol class="dlg-note link-steps"><li>افتح النظام في الجهاز الجديد.</li><li>اضغط «جهاز جديد؟ ادخل برمز ربط من جوالك».</li><li>اكتب الرمز، وبعدها سجّل البصمة.</li></ol>
      <p class="sub">الرمز يشتغل مرة وحدة، لمدة ${num(mins)} دقائق. لا ترسله لأحد.</p>
      <div class="dlg-f"><button type="button" class="btn-ghost" data-act="close">تم</button></div></div>`);
  }).catch((e: unknown) => toast(errorText(e)));
}
const loginFail = (e: unknown): string => (e instanceof ApiError && e.status === 423 ? 'الحساب مقفول مؤقتًا بسبب محاولات كثيرة. جرّب بعد 15 دقيقة.'
  : e instanceof ApiError && e.status === 401 ? 'بيانات الدخول غير صحيحة.' : errorText(e));

export function passkeyLogin(): void {
  void attempt(async () => {
    await api.post('/auth/login/passkey/verify', await askPasskey('/auth/login/passkey/options'));
  }, (e) => (e instanceof ApiError ? loginFail(e) : passkeyFailText(e, false)));
}

export function submitLogin(f: HTMLFormElement, kind: string | undefined): void {
  const v = (n: string): string => f.querySelector<HTMLInputElement>(`[name="${n}"]`)?.value ?? '';
  if (kind === 'link') { afterLogin = askForPasskey; void attempt(() => api.post('/auth/login/link', { code: v('l_code') }), (e) => (e instanceof ApiError && e.status === 401 ? 'الرمز غلط أو انتهى. اطلع رمز جديد من جوالك.' : loginFail(e))); return; }
  if (kind === 'recovery') { void attempt(() => api.post('/auth/login/recovery', { username: v('r_user').trim().toLowerCase(), code: v('r_code') }), loginFail); return; }
  void attempt(() => api.post('/auth/login/password', { username: v('user').trim().toLowerCase(), password: v('pw') }), loginFail);
}

export function submitSetup(f: HTMLFormElement): void {
  const v = (n: string): string => f.querySelector<HTMLInputElement>(`[name="${n}"]`)?.value.trim() ?? '';
  L.busy = true; L.err = ''; render();
  api.post('/auth/setup', { token: v('token'), ownerName: v('ownerName'), username: v('username').toLowerCase(), branchName: v('branchName') })
    .then(() => { L.busy = false; L.mode = 'afterSetup'; render(); })
    .catch((e: unknown) => {
      L.busy = false;
      L.err = e instanceof ApiError && e.status === 401 ? 'رمز الإعداد غير صحيح.' : e instanceof ApiError && e.status === 409 ? 'الإعداد تم من قبل. ادخل من صفحة الدخول.'
        : e instanceof ApiError && e.status === 503 ? 'النظام ما يشوف رمز الإعداد. تواصل مع المسؤول.' : e instanceof ApiError && e.status === 400 ? 'تأكد من الخانات: اسم المستخدم إنجليزي صغير 3 أحرف أو أكثر.' : errorText(e);
      render();
    });
}

export const enterAfterSetup = (): void => { void attempt(async () => undefined, errorText); };

export async function logout(opts: { recovery?: boolean } = {}): Promise<void> {
  await api.post('/auth/logout').catch(() => undefined);
  U.user = null; U.pv = null; S.days = {}; L.mode = 'login'; resetActivity(); L.err = ''; L.busy = false;
  L.pick = opts.recovery ? 'owner' : L.pick; L.rec = Boolean(opts.recovery); closeModal(); render(); toTop();
}

/* ---------------------------------------------------------------- مفاتيح المرور ورموز الاسترجاع */
export function addPasskey(): void {
  const label = deviceLabel();
  (async () => {
    const { challengeId, options } = await api.post<{ challengeId: string; options: PublicKeyCredentialCreationOptionsJSON }>('/auth/passkeys/options');
    const response = await startRegistration({ optionsJSON: options });
    await api.post('/auth/passkeys/verify', { challengeId, response, label });
  })().then(async () => {
    okToast('أُضيف مفتاح المرور. من الحين تدخل بالبصمة.');
    if (L.mode === 'afterSetup') { enterAfterSetup(); return; }
    closeModal(); resetAdminCache(); render();
  }).catch((e: unknown) => { const m = e instanceof ApiError ? errorText(e) : 'ما انضاف المفتاح. جرّب مرة ثانية.'; if (U.user) toast(m); else { L.err = m; render(); } });
}

export function newCodes(): void {
  api.post<{ codes: string[] }>('/auth/recovery-codes').then((r) => {
    resetAdminCache(); render();
    openModal(`<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-t">${dlgHead('رموز الاسترجاع')}
      <div class="dlg-note">اكتب هذه الرموز في ورقة واحفظها في مكان آمن. تظهر مرة واحدة فقط، وكل رمز ينفع مرة واحدة. الرموز القديمة بطلت.</div>
      <div class="chips" style="margin-top:12px">${r.codes.map((c) => `<span class="pill wait">${num(esc(c))}</span>`).join('')}</div>
      <textarea class="codes-src" hidden>${esc(r.codes.join('\n'))}</textarea>
      <div class="dlg-f"><button type="button" class="btn-gold" data-act="copycodes">${ico('copy', 17)} انسخ الرموز</button></div></div>`);
  }).catch((e: unknown) => toast(errorText(e)));
}

/* ---------------------------------------------------------------- المستخدمون */
export function addUserDialog(): string {
  return `<form class="dialog" data-form="adduser" role="dialog" aria-modal="true" aria-labelledby="dlg-t" autocomplete="off" novalidate>
    ${dlgHead('أضف مدخل بيانات')}
    <div class="fgrid">
      <div><label class="lb" for="u-name">الاسم</label><input class="in" id="u-name" name="name" autofocus></div>
      <div><label class="lb" for="u-user">اسم المستخدم <span class="opt">(إنجليزي صغير، مثل ahmad)</span></label><input class="in" id="u-user" name="username" autocapitalize="off"></div>
      <div><label class="lb" for="u-pw">كلمة المرور <span class="opt">(10 أحرف أو أكثر)</span></label><input class="in" id="u-pw" name="password" type="password" autocomplete="new-password"></div>
      <p class="err" data-out="err" hidden></p></div>
    <div class="dlg-f"><button class="btn-gold" type="submit">أضف</button><button type="button" class="btn-ghost" data-act="close">إلغاء</button></div></form>`;
}
export function passwordDialog(id: string): string {
  const u = adminUsers().find((x) => x.id === id);
  return `<form class="dialog" data-form="userpw" data-id="${id}" role="dialog" aria-modal="true" aria-labelledby="dlg-t" autocomplete="off" novalidate>
    ${dlgHead('تغيير كلمة المرور', esc(u?.name ?? ''))}
    <div class="fgrid"><div><label class="lb" for="u-pw2">كلمة المرور الجديدة <span class="opt">(10 أحرف أو أكثر)</span></label><input class="in" id="u-pw2" name="password" type="password" autocomplete="new-password" autofocus></div>
      <p class="err" data-out="err" hidden></p></div>
    <div class="dlg-f"><button class="btn-gold" type="submit">احفظ</button><button type="button" class="btn-ghost" data-act="close">إلغاء</button></div></form>`;
}

const formErr = (f: HTMLFormElement, msg: string): void => { const e = f.querySelector<HTMLElement>('[data-out="err"]'); if (e) { e.textContent = msg; e.hidden = false; } };

export function submitAddUser(f: HTMLFormElement): void {
  const v = (n: string): string => f.querySelector<HTMLInputElement>(`[name="${n}"]`)?.value ?? '';
  const body = { name: v('name').trim(), username: v('username').trim().toLowerCase(), password: v('password') };
  if (body.name.length < 2) { formErr(f, 'اكتب الاسم.'); return; }
  if (!/^[a-z0-9._-]{3,30}$/.test(body.username)) { formErr(f, 'اسم المستخدم إنجليزي صغير، 3 أحرف أو أكثر، بدون مسافات.'); return; }
  if (body.password.length < 10) { formErr(f, 'كلمة المرور 10 أحرف أو أكثر.'); return; }
  api.post('/admin/users', body).then(() => { closeModal(); resetAdminCache(); render(); okToast(`أُضيف ${esc(body.name)}`); })
    .catch((e: unknown) => formErr(f, e instanceof ApiError && e.code === 'username_taken' ? 'اسم المستخدم مستخدم من قبل.' : errorText(e)));
}

export function submitUserPw(f: HTMLFormElement): void {
  const u = adminUsers().find((x) => x.id === f.dataset.id); const pw = f.querySelector<HTMLInputElement>('[name=password]')?.value ?? '';
  if (!u) return;
  if (pw.length < 10) { formErr(f, 'كلمة المرور 10 أحرف أو أكثر.'); return; }
  api.post(`/admin/users/${u.id}/password`, { password: pw, version: u.version }).then(() => { closeModal(); resetAdminCache(); render(); okToast('تغيّرت كلمة المرور'); })
    .catch((e: unknown) => formErr(f, errorText(e)));
}

export function toggleUser(id: string): void {
  const u = adminUsers().find((x) => x.id === id); if (!u) return;
  const on = u.status !== 'active';
  api.post(`/admin/users/${id}/status`, { status: on ? 'active' : 'suspended', version: u.version })
    .then(() => { resetAdminCache(); render(); okToast(`${on ? 'يستطيع' : 'لا يستطيع'} ${esc(u.name)} الدخول الآن`); })
    .catch((e: unknown) => toast(errorText(e)));
}

/** ينسخ رموز الاسترجاع (كل رمز في سطر) للصقها في الملاحظات أو الواتساب. */
export function copyCodes(text: string): void {
  navigator.clipboard.writeText(text)
    .then(() => okToast('نُسخت الرموز. احفظها في مكان آمن.'))
    .catch(() => toast('تعذّر النسخ التلقائي: حدّد الرموز وانسخها.'));
}
