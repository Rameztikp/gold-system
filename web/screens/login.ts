import { html, render, $, val, type Safe } from '../core/dom';
import { T } from '../texts';
import { api, ApiError } from '../core/api';
import { loginWithPasskey, addPasskey } from '../core/passkey';
import { toast } from '../ui/toast';

const card = (inner: Safe): Safe => html`<div class="auth-wrap"><div class="auth-card"><div class="brand big">${T.appName}</div>${inner}</div></div>`;

const loginForm = (): Safe => card(html`
  <button class="btn primary block" data-passkey>🔑 ${T.login.passkey}</button>
  <div class="divider"><span>${T.login.orPassword}</span></div>
  <form data-form="password" class="stack">
    <label>${T.login.username}<input name="username" autocomplete="username" autocapitalize="off" required></label>
    <label>${T.login.password}<input name="password" type="password" autocomplete="current-password" required></label>
    <button class="btn block">${T.login.submit}</button></form>
  <details class="recovery"><summary>${T.login.recovery}</summary>
    <form data-form="recovery" class="stack">
      <label>${T.login.username}<input name="r_username" autocapitalize="off" required></label>
      <label>${T.login.code}<input name="code" autocapitalize="characters" required></label>
      <button class="btn block">${T.login.submit}</button></form></details>
  <p class="error" data-error hidden></p>`);

function showError(root: HTMLElement, e: unknown): void {
  const el = $('[data-error]', root);
  el.hidden = false;
  el.textContent = e instanceof ApiError && e.status === 423 ? T.login.locked : T.login.failed;
}

const done = (): void => { location.hash = '/'; location.reload(); };

export function loginScreen(): void {
  const root = $('#app');
  render(root, loginForm());
  root.querySelector('[data-passkey]')?.addEventListener('click', () => {
    loginWithPasskey().then(done).catch(() => showError(root, null));
  });
  root.querySelector('[data-form=password]')?.addEventListener('submit', (e) => {
    e.preventDefault();
    api.post('/auth/login/password', { username: val(root, 'username'), password: val(root, 'password') }).then(done).catch((err) => showError(root, err));
  });
  root.querySelector('[data-form=recovery]')?.addEventListener('submit', (e) => {
    e.preventDefault();
    api.post('/auth/login/recovery', { username: val(root, 'r_username'), code: val(root, 'code') }).then(done).catch((err) => showError(root, err));
  });
}

const setupForm = (): Safe => card(html`<h2>${T.setup.title}</h2>
  <form data-form="setup" class="stack">
    <label>${T.setup.token}<input name="token" type="password" required></label>
    <label>${T.setup.ownerName}<input name="ownerName" required></label>
    <label>${T.setup.username}<input name="username" autocapitalize="off" pattern="[a-z0-9._\\-]{3,30}" required></label>
    <label>${T.setup.branchName}<input name="branchName" value="الشارقة" required></label>
    <button class="btn primary block">${T.setup.submit}</button></form>
  <p class="error" data-error hidden></p>`);

/** إعداد أول مرة: ينشئ صاحب المحل ثم يضيف مفتاح المرور مباشرة. */
export function setupScreen(): void {
  const root = $('#app');
  render(root, setupForm());
  root.querySelector('[data-form=setup]')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const body = { token: val(root, 'token'), ownerName: val(root, 'ownerName'), username: val(root, 'username'), branchName: val(root, 'branchName') };
    api.post('/auth/setup', body).then(() => afterSetup(root)).catch((err) => showError(root, err));
  });
}

function afterSetup(root: HTMLElement): void {
  render(root, card(html`<p>${T.setup.next}</p><button class="btn primary block" data-add>${T.setup.addPasskey}</button>`));
  root.querySelector('[data-add]')?.addEventListener('click', () => {
    addPasskey('آيفون').then(() => { toast(T.ok); location.hash = '/admin'; location.reload(); })
      .catch(() => toast(T.login.passkeyFailed, 'error'));
  });
}
