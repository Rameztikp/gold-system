import { html, render, $, type Safe } from '../core/dom';
import { T } from '../texts';
import { state, isOwner } from '../core/state';
import { currentPath } from '../core/router';
import { toggleTheme } from '../core/theme';
import { api } from '../core/api';

interface NavItem { path: string; label: string; icon: string; owner?: boolean }

const NAV: NavItem[] = [
  { path: '/', label: T.nav.dashboard, icon: '◧' },
  { path: '/days', label: T.nav.days, icon: '▦' },
  { path: '/reports', label: T.nav.reports, icon: '▤' },
  { path: '/search', label: T.nav.search, icon: '⌕' },
  { path: '/admin', label: T.nav.admin, icon: '⚙', owner: true },
];

const active = (p: string): boolean => (p === '/' ? currentPath() === '/' : currentPath().startsWith(p));

function navLinks(cls: string): Safe {
  return html`${NAV.filter((n) => !n.owner || isOwner()).map((n) => html`<a class="${cls}${active(n.path) ? ' active' : ''}" href="#${n.path}">
    <span class="nav-icon" aria-hidden="true">${n.icon}</span><span>${n.label}</span></a>`)}`;
}

/** الإطار: قائمة جانبية على الكمبيوتر، وشريط سفلي على الجوال (≤ 820px). */
export function shell(title: string, content: Safe): HTMLElement {
  const app = $('#app');
  render(app, html`<div class="layout">
    <aside class="sidebar"><div class="brand">${T.appName}</div><nav>${navLinks('side-link')}</nav>
      <div class="side-foot"><span class="muted">${state.me?.name}</span>
      <button class="btn ghost" data-theme>${T.nav.theme}</button><button class="btn ghost" data-logout>${T.nav.logout}</button></div></aside>
    <main class="main"><header class="topbar"><h1>${title}</h1>
      <div class="top-actions"><button class="icon-btn" data-theme aria-label="${T.nav.theme}">◐</button><button class="icon-btn" data-logout aria-label="${T.nav.logout}">⎋</button></div></header>
      <section class="content" id="content">${content}</section></main>
    <nav class="bottombar">${navLinks('bottom-link')}</nav></div>`);
  app.querySelectorAll('[data-theme]').forEach((b) => b.addEventListener('click', toggleTheme));
  app.querySelectorAll('[data-logout]').forEach((b) => b.addEventListener('click', () => void logout()));
  return $('#content');
}

async function logout(): Promise<void> {
  await api.post('/auth/logout').catch(() => undefined);
  location.hash = '/login';
  location.reload();
}

export const loading = (): Safe => html`<p class="muted">${T.loading}</p>`;
