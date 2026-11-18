/* الدخول بشكل النموذج (viewLogin) — صاحب المحل بمفتاح المرور، ومدخل البيانات بكلمة المرور. */
import { esc } from '../util';
import { prepare } from '../passkey';
import { diamond, ico } from '../icons';
import { APP_NAME } from '../state';

export const L: { mode: 'login' | 'setup' | 'afterSetup'; pick: 'owner' | 'clerk'; err: string; busy: boolean; rec: boolean } = { mode: 'login', pick: 'owner', err: '', busy: false, rec: false };

const top = (sub: string): string => `<div class="login-top">${diamond(52)}<h1 class="kufi">${APP_NAME}</h1><p class="sub">${sub}</p></div>`;
const err = (): string => (L.err ? `<p class="err" role="alert" style="margin:12px 0 0">${esc(L.err)}</p>` : '');
const wait = (label: string): string => (L.busy ? 'جاري الدخول…' : label);

function ownerPart(): string {
  if (!L.busy) prepare('/auth/login/passkey/options');
  return `<button type="button" class="btn-gold btn-wide" data-act="passkey"${L.busy ? ' disabled' : ''}>${ico('key', 18)} ${wait('الدخول بالبصمة (Face ID)')}</button>
  <details class="rec" style="margin-top:14px"><summary class="u" style="cursor:pointer">جهاز جديد؟ ادخل برمز ربط من جوالك</summary>
    <p class="sub" style="margin:8px 0 0">من الجهاز اللي داخل فيه: الإدارة ← المستخدمون ← «أضف جهاز جديد». يطلع لك رمز 6 أرقام.</p>
    <label class="lb" for="l-code">رمز الربط</label><input class="in num" id="l-code" name="l_code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000">
    <button class="btn-ghost btn-wide" type="submit" data-v="link" style="margin-top:12px">دخول برمز الربط</button></details>
  <details class="rec" style="margin-top:10px"${L.rec ? ' open' : ''}><summary class="u" style="cursor:pointer">البصمة ما تشتغل أو ضاع الجوال؟ ادخل برمز استرجاع</summary>
    <label class="lb" for="r-user">اسم المستخدم</label><input class="in" id="r-user" name="r_user" autocapitalize="off" autocomplete="username">
    <label class="lb" for="r-code">رمز الاسترجاع</label><input class="in num" id="r-code" name="r_code" autocapitalize="characters" placeholder="XXXXX-XXXXX">
    <button class="btn-ghost btn-wide" type="submit" data-v="recovery" style="margin-top:12px">دخول برمز الاسترجاع</button></details>`;
}
function clerkPart(): string {
  return `<label class="lb" for="l-user">اسم المستخدم</label><input class="in" id="l-user" name="user" autocapitalize="off" autocomplete="username">
  <label class="lb" for="pw">كلمة المرور</label><input class="in" id="pw" name="pw" type="password" autocomplete="current-password">
  <button class="btn-gold btn-wide" type="submit" data-v="password"${L.busy ? ' disabled' : ''}>${wait('دخول')}</button>`;
}

function viewSetup(): string {
  return `<div class="login"><form class="login-card" data-form="setup" autocomplete="off">
  ${top('إعداد أول مرة')}
  <label class="lb" for="s-token">رمز الإعداد</label><input class="in" id="s-token" name="token" type="password">
  <label class="lb" for="s-name">اسم صاحب المحل</label><input class="in" id="s-name" name="ownerName">
  <label class="lb" for="s-user">اسم المستخدم <span class="opt">(إنجليزي صغير)</span></label><input class="in" id="s-user" name="username" autocapitalize="off">
  <label class="lb" for="s-branch">اسم الفرع</label><input class="in" id="s-branch" name="branchName" value="الشارقة">
  <button class="btn-gold btn-wide" type="submit"${L.busy ? ' disabled' : ''}>${L.busy ? 'جاري الإعداد…' : 'ابدأ'}</button>${err()}
  </form></div>`;
}

function viewAfterSetup(): string {
  return `<div class="login"><div class="login-card">${top('تم الإعداد')}
  <p class="sub">الخطوة التالية: أضف مفتاح المرور، فتدخل بعدها بالبصمة (Face ID) بدون كلمة مرور.</p>
  <button type="button" class="btn-gold btn-wide" data-act="addkey">${ico('key', 18)} أضف مفتاح المرور</button>
  <button type="button" class="btn-ghost btn-wide" data-act="enter" style="margin-top:10px">بعدين، ادخل النظام</button>${err()}</div></div>`;
}

export function viewLogin(): string {
  if (L.mode === 'setup') return viewSetup();
  if (L.mode === 'afterSetup') return viewAfterSetup();
  const pick = L.pick;
  return `<div class="login"><form class="login-card" data-form="login" autocomplete="on">
  ${top('محل الذهب')}
  <div class="lb" id="who-l">من يدخل؟</div>
  <div class="who" role="group" aria-labelledby="who-l">
    <button type="button" data-act="pick" data-v="owner" aria-pressed="${pick === 'owner'}"><b>صاحب المحل</b><small>يرى اللوحة والتقارير، ويستطيع الإدخال والتعديل.</small></button>
    <button type="button" data-act="pick" data-v="clerk" aria-pressed="${pick === 'clerk'}"><b>مدخل البيانات</b><small>يُدخل سطور الدفتر كل يوم.</small></button>
  </div>
  ${pick === 'owner' ? ownerPart() : clerkPart()}${err()}
</form></div>`;
}
