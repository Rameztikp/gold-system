import { html, render, on, type Safe } from '../core/dom';
import { T } from '../texts';
import { api, qs, errorText } from '../core/api';
import { dateTime } from '../core/format';
import { shell, loading } from '../ui/shell';

interface Entry { id: number; userId: string; entity: string; entityId: string; action: string; reason: string | null; at: number; before: unknown; after: unknown }

const names = new Map<string, string>();

function describe(e: Entry): string {
  const v = (e.after ?? e.before) as Record<string, unknown> | null;
  if (!v) return '';
  if (typeof v.description === 'string') return v.description;
  if (typeof v.date === 'string') return v.date;
  if (typeof v.name === 'string') return v.name;
  return '';
}

const row = (e: Entry): Safe => html`<div class="day-row"><span class="muted">${dateTime(e.at)}</span>
  <span>${names.get(e.userId) ?? ''}</span><span class="badge">${T.audit.entities[e.entity] ?? e.entity}</span>
  <b>${T.audit.actions[e.action] ?? e.action}</b><span class="grow">${describe(e)}${e.reason ? html` — ${e.reason}` : html``}</span></div>`;

const tabs = (): Safe => html`<div class="segmented wide"><a href="#/admin/users">${T.nav.users}</a>
  <a class="on" href="#/admin/audit">${T.nav.audit}</a><a href="#/admin/settings">${T.nav.settings}</a></div>`;

let entries: Entry[] = [];

async function load(el: HTMLElement, before?: number): Promise<void> {
  try {
    if (names.size === 0) {
      const u = await api.get<{ users: { id: string; name: string }[] }>('/admin/users');
      u.users.forEach((x) => names.set(x.id, x.name));
    }
    const r = await api.get<{ entries: Entry[] }>(`/admin/audit${qs(before ? { before, limit: 50 } : { limit: 50 })}`);
    entries = before ? [...entries, ...r.entries] : r.entries;
    render(el, html`${tabs()}<div class="panel list">${entries.map(row)}</div>
      ${r.entries.length === 50 ? html`<button class="btn" data-more>${T.audit.more}</button>` : html``}`);
  } catch (e) { render(el, html`${tabs()}<p class="error">${errorText(e)}</p>`); }
}

export function auditScreen(): void {
  const el = shell(T.nav.admin, loading());
  on(el, 'click [data-more]', () => void load(el, entries[entries.length - 1]?.id));
  void load(el);
}
