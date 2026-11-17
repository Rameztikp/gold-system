import { html, render, on, val, Safe } from '../core/dom';
import { T } from '../texts';
import { api, errorText } from '../core/api';
import { dateTime } from '../core/format';
import { state } from '../core/state';
import { addPasskey } from '../core/passkey';
import { shell, loading } from '../ui/shell';
import { openModal } from '../ui/modal';
import { toast } from '../ui/toast';

interface UserDto { id: string; name: string; username: string; role: 'owner' | 'entry'; status: 'active' | 'suspended'; version: number }
interface Keys { passkeys: { id: string; label: string; createdAt: number }[]; recoveryLeft: number }

const tabs = (): Safe => html`<div class="segmented wide"><a href="#/admin/users">${T.nav.users}</a>
  <a href="#/admin/audit">${T.nav.audit}</a><a href="#/admin/settings">${T.nav.settings}</a></div>`;

const userRow = (u: UserDto): Safe => html`<div class="day-row"><span class="grow"><b>${u.name}</b> <span class="muted">@${u.username}</span></span>
  <span class="badge">${T.users.role[u.role]}</span><span class="badge ${u.status === 'active' ? 'matched' : 'ledger_error'}">${T.users[u.status]}</span>
  ${u.role === 'entry' ? html`<button class="btn small" data-status="${u.id}">${u.status === 'active' ? T.users.suspend : T.users.activate}</button>
    <button class="btn small" data-reset="${u.id}">${T.users.resetPassword}</button>` : html``}</div>`;

const keysPanel = (k: Keys): Safe => html`<div class="panel"><h3>${T.users.myKeys}</h3>
  <ul>${k.passkeys.map((p) => html`<li>🔑 ${p.label} <span class="muted">${dateTime(p.createdAt)}</span></li>`)}</ul>
  ${k.passkeys.length < 2 ? html`<p class="warn">${T.users.backupKeyHint}</p>` : html``}
  <button class="btn" data-addkey>${T.users.addKey}</button>
  <h3>${T.users.codes}</h3><p>${T.users.codesLeft} ${k.recoveryLeft}</p><button class="btn" data-codes>${T.users.newCodes}</button></div>`;

let users: UserDto[] = [];

async function loadUsers(el: HTMLElement): Promise<void> {
  try {
    const [u, k] = await Promise.all([api.get<{ users: UserDto[] }>('/admin/users'), api.get<Keys>('/auth/passkeys')]);
    users = u.users;
    render(el, html`${tabs()}<div class="toolbar"><button class="btn primary" data-adduser>＋ ${T.users.add}</button></div>
      <div class="panel list">${users.map(userRow)}</div>${keysPanel(k)}`);
  } catch (e) { render(el, html`${tabs()}<p class="error">${errorText(e)}</p>`); }
}

interface FormSpec { title: string; body: Safe; send: (root: HTMLElement) => Promise<unknown> }

function formModal({ title, body, send }: FormSpec, after: () => void): void {
  const m = openModal(title, html`<form class="stack" data-f>${body}<button class="btn primary block">${T.settings.save}</button></form>`);
  m.el.querySelector('[data-f]')?.addEventListener('submit', (e) => {
    e.preventDefault();
    send(m.el).then(() => { m.close(); toast(T.ok); after(); }).catch((err) => toast(errorText(err), 'error'));
  });
}

function showCodes(codes: string[]): void {
  openModal(T.users.codes, html`<p class="warn">${T.users.codesNote}</p><ol class="codes">${codes.map((c) => html`<li><code>${c}</code></li>`)}</ol>`);
}

function wireUsers(el: HTMLElement): void {
  const reload = (): void => void loadUsers(el);
  on(el, 'click [data-adduser]', () => formModal({ title: T.users.add, body: html`<label>${T.users.name}<input name="name" required></label>
    <label>${T.users.username}<input name="username" autocapitalize="off" required></label>
    <label>${T.users.password}<input name="password" type="password" minlength="10" autocomplete="new-password" required></label>`,
    send: (r) => api.post('/admin/users', { name: val(r, 'name'), username: val(r, 'username'), password: val(r, 'password') }) }, reload));
  on(el, 'click [data-status]', (_e, b) => {
    const u = users.find((x) => x.id === b.dataset.status);
    if (u) api.post(`/admin/users/${u.id}/status`, { status: u.status === 'active' ? 'suspended' : 'active', version: u.version }).then(reload).catch((e) => toast(errorText(e), 'error'));
  });
  on(el, 'click [data-reset]', (_e, b) => {
    const u = users.find((x) => x.id === b.dataset.reset);
    if (u) formModal({ title: T.users.resetPassword, body: html`<label>${T.users.password}<input name="password" type="password" minlength="10" autocomplete="new-password" required></label>`,
      send: (r) => api.post(`/admin/users/${u.id}/password`, { password: val(r, 'password'), version: u.version }) }, reload);
  });
  on(el, 'click [data-addkey]', () => formModal({ title: T.users.addKey, body: html`<label>${T.users.keyLabel}<input name="label" required></label>`,
    send: (r) => addPasskey(val(r, 'label')) }, reload));
  on(el, 'click [data-codes]', () => {
    api.post<{ codes: string[] }>('/auth/recovery-codes').then((r) => { showCodes(r.codes); reload(); }).catch((e) => toast(errorText(e), 'error'));
  });
}

export function usersScreen(): void {
  const el = shell(T.nav.admin, loading());
  wireUsers(el);
  void loadUsers(el);
}

export function settingsScreen(): void {
  const s = state.settings;
  const el = shell(T.nav.admin, html`${tabs()}<form class="panel stack" data-settings>
    <label>${T.settings.name}<input name="name" value="${s?.name}" required></label>
    <label>${T.settings.currency}<input name="currency" value="${s?.currency}" required></label>
    <label>${T.settings.country}<input name="countryCode" value="${s?.countryCode}" required></label>
    <label>${T.settings.timezone}<input name="timezone" value="${s?.timezone}" required></label>
    <label>${T.settings.weekStart}<select name="weekStart">${T.weekdays.map((d, i) => html`<option value="${i}" ${i === s?.weekStart ? new Safe('selected') : ''}>${d}</option>`)}</select></label>
    <button class="btn primary">${T.settings.save}</button></form>`);
  on(el, 'submit [data-settings]', (e, f) => {
    e.preventDefault();
    const body = { name: val(f, 'name'), currency: val(f, 'currency').toUpperCase(), countryCode: val(f, 'countryCode'), timezone: val(f, 'timezone'), weekStart: Number(val(f, 'weekStart')), version: s?.version ?? 0 };
    api.put('/admin/settings', body).then(() => { toast(T.ok); location.reload(); }).catch((err) => toast(errorText(err), 'error'));
  });
}
