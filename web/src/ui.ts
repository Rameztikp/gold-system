/* الرسم والتنقل والنوافذ والتنبيهات والإطار (render, go, shell, openModal, toast في النموذج). */
import type { Day } from '../../shared/domain';
import { $, $$, esc, num, DAYS_AR, dow, dnum, D } from './util';
import { ico, diamond } from './icons';
import { S, U, ADMIN, ROLES, APP_NAME, shopLine, type Route } from './state';
import { page } from './pages';
import { drawCharts } from './views/chart';
import { syncViewer } from './views/viewer';
import { liveUpdate } from './views/live';
import { viewLogin } from './views/login';

export const app = document.getElementById('app')!;
export const screen = document.getElementById('screen')!;
export const modalRoot = document.getElementById('modal-root')!;
const toastRoot = document.getElementById('toast-root')!;

export function render(): void {
  const html = U.user ? shell(page()) : viewLogin();
  // لوحة الصور تأخذ مكانها قبل قياس الرسوم
  syncViewer();
  screen.innerHTML = html;
  drawCharts();
  $$<HTMLFormElement>('form[data-live]', screen).forEach((f) => liveUpdate(f));
  if (U.hl) { const row = screen.querySelector(`.ln[data-id="${U.hl}"]`); if (row) row.scrollIntoView({ block: 'center' }); }
  U.flash = null; U.hl = null;
}
export const toTop = (): void => window.scrollTo(0, 0);

export function go(route: Route, extra: Partial<typeof U> = {}): void {
  Object.assign(U, { route, fromSearch: false }, extra);
  closeModal(); toTop(); render();
  if (route === 'search') focusSearch();
}
export function focusSearch(): void {
  const q = $<HTMLInputElement>('#q', screen); if (!q) return;
  q.focus(); const n = q.value.length; try { q.setSelectionRange(n, n); } catch { /* ignore */ }
}

/* ---------------------------------------------------------------- النوافذ والتنبيه */
export function openModal(html: string): void {
  modalRoot.innerHTML = `<div class="scrim" data-act="close"></div>${html}`;
  const f = modalRoot.querySelector<HTMLElement>('[autofocus]') ?? modalRoot.querySelector<HTMLElement>('input:not([type=hidden]), button.chip');
  if (f) setTimeout(() => f.focus(), 30);
}
export function closeModal(): void { modalRoot.innerHTML = ''; }
export const dlgHead = (title: string, tag?: string): string => `<div class="dlg-h"><h2 class="kufi" id="dlg-t">${title}</h2>${tag ? `<span class="pill wait">${tag}</span>` : ''}<button type="button" class="icon-btn" data-act="close" aria-label="إغلاق">${ico('x', 16)}</button></div>`;

let toastTimer = 0;
export function toast(html: string): void {
  toastRoot.innerHTML = `<div class="toast" role="status">${html}</div>`;
  clearTimeout(toastTimer); toastTimer = window.setTimeout(() => { toastRoot.innerHTML = ''; }, 3400);
}
export const okToast = (msg: string): void => toast(`${ico('check', 16)} ${msg}`);

/* ---------------------------------------------------------------- المظهر */
const THEME_KEY = 'gold-theme';
export const curTheme = (): 'dark' | 'light' => (document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
export function setTheme(t: string): void {
  document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : 'dark');
  try { localStorage.setItem(THEME_KEY, t); } catch { /* ignore */ }
}
export function loadTheme(): void {
  try { const th = localStorage.getItem(THEME_KEY); if (th === 'light' || th === 'dark') document.documentElement.setAttribute('data-theme', th); } catch { /* ignore */ }
}
export const themeSeg = (): string => `<div class="seg" role="group" aria-label="المظهر"><button type="button" data-act="theme" data-v="dark" aria-pressed="${curTheme() === 'dark'}">داكن</button><button type="button" data-act="theme" data-v="light" aria-pressed="${curTheme() === 'light'}">فاتح</button></div>`;

/* ---------------------------------------------------------------- حالة اليوم وزر الصور */
export function statusPill(day: Day, short?: boolean): string {
  if (day.status === 'ok') return `<span class="pill ok">${ico('check', 13)} مطابق للدفتر</span>`;
  if (day.status === 'lerr') return '<span class="pill lerr">! خطأ في جمع الدفتر</span>';
  return `<span class="pill wait">${short ? 'لم يُقارن' : 'لم يُقارن بالدفتر'}</span>`;
}
export const statusText = (d: Day): string => (d.status === 'ok' ? 'مطابق' : d.status === 'lerr' ? 'خطأ في جمع الدفتر' : 'لم يُقارن');

/** «صور الدفتر (2)» يفتح لوحة الصور أو يغلقها؛ اليوم بلا صور يعرض الإضافة. */
export function photosBtn(day: Day, cls = 'btn-text', named = false): string {
  const n = (day.photos || []).length; const label = n ? `صور الدفتر (${n})` : 'أضف صور الدفتر';
  const name = named ? ` aria-label="${label}، يوم ${DAYS_AR[dow(day.id)]} ${dnum(day.id)}/${D(day.id).getUTCMonth() + 1}"` : '';
  return n
    ? `<button type="button" class="${cls}" data-act="pvtoggle" data-id="${day.id}" aria-pressed="${!!(U.pv && U.pv.day === day.id)}"${name}>${ico('image', 15)} ${label}</button>`
    : `<button type="button" class="${cls}" data-act="photos" data-id="${day.id}"${name}>${ico('image', 15)} ${label}</button>`;
}

/* ---------------------------------------------------------------- الإطار والقائمة */
type NavItem = readonly [string, string, string] | null;
const navFor = (owner: boolean): NavItem[] => (owner
  ? [['dash', 'اللوحة', 'dash'], ['reports', 'التقارير', 'reports'], ['days', 'الأيام', 'days'], ['entry', 'الإدخال', 'entry'], null, ['log', 'سجل التعديلات', 'log'], ['users', 'المستخدمون', 'users'], ['settings', 'الإعدادات', 'settings']]
  : [['days', 'الأيام', 'days'], ['entry', 'الإدخال', 'entry'], ['dash', 'اللوحة', 'dash'], ['reports', 'التقارير', 'reports']]);
const tabsFor = (owner: boolean): (readonly [string, string, string])[] => (owner
  ? [['dash', 'اللوحة', 'dash'], ['reports', 'التقارير', 'reports'], ['days', 'الأيام', 'days'], ['entry', 'الإدخال', 'entry'], ['admin', 'الإدارة', 'settings']]
  : [['days', 'الأيام', 'days'], ['entry', 'الإدخال', 'entry'], ['dash', 'اللوحة', 'dash'], ['reports', 'التقارير', 'reports']]);

const cur = (r: string): boolean => r === U.route || (r === 'admin' && ADMIN.includes(U.route));

function sideNav(owner: boolean): string {
  return navFor(owner).map((it) => (it
    ? `<button type="button" data-act="go" data-r="${it[0]}"${cur(it[0]) ? ' aria-current="page"' : ''}>${ico(it[2])}<span>${it[1]}</span></button>`
    : '<div class="grp">الإدارة</div>')).join('');
}

export function shell(content: string): string {
  const owner = U.user === 'owner'; const me = ROLES[U.user ?? 'clerk'];
  const meName = esc(S.me.name || me.name);
  const tabs = tabsFor(owner).map((t) => `<button type="button" data-act="${t[0] === 'admin' ? 'adminsheet' : 'go'}" data-r="${t[0]}"${cur(t[0]) ? ' aria-current="page"' : ''}>${ico(t[2], 22)}<span>${t[1]}</span></button>`).join('');
  const dark = curTheme() === 'dark';
  return `<div class="shell">
  <aside class="side" aria-label="القائمة">
    <div class="brand">${diamond(32)}<div><b>${APP_NAME}</b><small>${esc(shopLine())}</small></div></div>
    <button type="button" class="sfake" data-act="go" data-r="search"${U.route === 'search' ? ' aria-current="page"' : ''}>${ico('search', 17)}<span>ابحث في السطور…</span></button>
    <nav class="nav">${sideNav(owner)}</nav>
    <div class="side-foot">
      <div class="foot-row"><span></span><button type="button" class="icon-btn" data-act="theme" data-v="${dark ? 'light' : 'dark'}" aria-label="${dark ? 'المظهر الفاتح' : 'المظهر الداكن'}" title="${dark ? 'المظهر الفاتح' : 'المظهر الداكن'}">${ico(dark ? 'sun' : 'moon', 17)}</button></div>
      <div class="me"><span class="avatar">${me.init}</span><div class="me-t"><b>${meName}</b><small>${me.role}</small></div><button type="button" class="icon-btn" data-act="logout" aria-label="خروج" title="خروج">${ico('out', 17)}</button></div>
    </div>
  </aside>
  <div class="main">
    <header class="mhead"><button type="button" class="t" data-act="account" aria-label="الحساب والمظهر"><span class="avatar">${me.init}</span><span><small>${meName}</small><b>${APP_NAME}</b></span></button><div class="mh-end"><button type="button" class="icon-btn" data-act="go" data-r="search" aria-label="البحث" title="البحث"${U.route === 'search' ? ' aria-current="page"' : ''}>${ico('search', 19)}</button>${diamond(26)}</div></header>
    <main class="page" id="page">${content}</main>
    <nav class="tabbar" aria-label="القائمة">${tabs}</nav>
  </div>
</div>`;
}

export function accountSheet(): string {
  const me = ROLES[U.user ?? 'clerk'];
  return `<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-t">
    ${dlgHead('الحساب')}
    <div class="me" style="margin-top:14px"><span class="avatar">${me.init}</span><div class="me-t"><b>${esc(S.me.name || me.name)}</b><small>${me.role}</small></div><button type="button" class="btn-danger" data-act="logout">${ico('out', 15)} خروج</button></div>
    <div class="lb" style="margin-top:16px">المظهر</div>${themeSeg()}
  </div>`;
}
export function adminSheet(): string {
  return `<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-t">
    ${dlgHead('الإدارة')}
    <div class="sheet-grid">${([['log', 'سجل التعديلات', 'log'], ['users', 'المستخدمون', 'users'], ['settings', 'الإعدادات', 'settings']] as const).map(([r, l, i]) => `<button type="button" class="btn-ghost" data-act="go" data-r="${r}">${ico(i, 22)}<span>${l}</span></button>`).join('')}</div>
  </div>`;
}

export { num };
