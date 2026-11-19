/* النت البطيء (D-32):
   1) تحديث جزئي: نجيب الأيام اللي تغيّرت بس، لما ترجع للتطبيق وكل دقيقة.
   2) حفظ ما يضيع: السطر الجديد يظهر على طول وينرسل بالخلفية؛ لو النت انقطع ينتظر وينرسل لحاله. */
import type { Day } from '../../shared/domain';
import { api, ApiError, errorText } from './api';
import { PENDING, S, applyDay, type Branch, type Me, type PendingLine } from './state';
import { render, toast } from './ui';
import { LOCK } from './lock';

let syncedAt = 0;
let syncing = false;
const SYNC_EVERY = 60 * 1000;
const RETRY_MS = 10 * 1000;

export const markSynced = (now: number): void => { syncedAt = now; };

/** لو المستخدم يكتب في خانة بالصفحة، ما نعيد رسمها تحت يده؛ نأجّل لين يخلص. */
const typing = (): boolean => {
  const a = document.activeElement;
  return a instanceof HTMLElement && a.closest('#app') !== null && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
};

export async function syncNow(): Promise<void> {
  if (syncing || !syncedAt || !S.me.id || LOCK.locked || PENDING.size) return;
  syncing = true;
  try {
    const st = await api.get<{ me: Me; branch: Branch; days: Day[]; now: number; full: boolean }>(`/state?since=${syncedAt}`);
    const branchChanged = JSON.stringify(st.branch) !== JSON.stringify(S.branch);
    S.me = st.me; S.branch = st.branch;
    if (st.full) S.days = {};
    st.days.forEach(applyDay);
    syncedAt = st.now;
    if ((st.days.length || branchChanged || st.full) && !typing()) render();
  } catch { /* نجرّب المرة الجاية */ } finally { syncing = false; }
}

/* ---------- صندوق الإرسال ---------- */
const KEY = (): string => `gold.outbox.${S.me.id}`;
let timer = 0;
let flushing = false;

function persist(): void {
  try {
    if (PENDING.size) localStorage.setItem(KEY(), JSON.stringify([...PENDING.values()]));
    else localStorage.removeItem(KEY());
  } catch { /* المتصفح ما يسمح بالحفظ: يبقى في الذاكرة */ }
  badge();
}

/** بعد الدخول: يرجّع السطور اللي ما انرسلت من آخر مرة على هذا الجهاز. */
export function restoreOutbox(): void {
  PENDING.clear();
  try {
    const raw = localStorage.getItem(KEY());
    if (raw) for (const p of JSON.parse(raw) as PendingLine[]) PENDING.set(p.id, p);
  } catch { /* تالف: نتجاهله */ }
  for (const d of Object.values(S.days)) applyDay(d);
  badge();
  if (PENDING.size) void flush();
}

/** يضيف السطر للانتظار ويبدأ الإرسال. */
export function enqueue(p: PendingLine): void {
  PENDING.set(p.id, p); persist(); void flush();
}

function later(): void { window.clearTimeout(timer); timer = window.setTimeout(() => void flush(), RETRY_MS); }

/** يرسل بالترتيب. انقطاع النت أو القفل = يوقف ويرجع يحاول. خطأ ثاني = السطر ينشال ويطلع تنبيه. */
export async function flush(): Promise<void> {
  if (flushing || LOCK.locked) return;
  flushing = true;
  try {
    for (const p of [...PENDING.values()]) {
      try {
        const d = await api.post<Day>(`/days/${p.day}/lines`, { id: p.id, sec: p.sec, line: p.line });
        PENDING.delete(p.id); persist(); applyDay(d);
      } catch (e) {
        if (e instanceof ApiError && (e.status === 0 || e.status >= 500 || e.code === 'session_locked')) { later(); return; }
        PENDING.delete(p.id); persist();
        await api.get<Day>(`/days/${p.day}`).then(applyDay).catch(() => undefined);
        toast(`ما انحفظ سطر «${String(p.line.d ?? '')}»: ${errorText(e)}`);
      }
      if (!typing()) render();
    }
  } finally { flushing = false; }
}

/* ---------- علامة الحالة ---------- */
function badge(): void {
  let el = document.getElementById('netq');
  if (!PENDING.size) { el?.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'netq'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  const n = PENDING.size;
  el.textContent = `${navigator.onLine ? 'جاري الإرسال' : 'ما فيه نت'}: ${n === 1 ? 'سطر واحد' : n === 2 ? 'سطران' : `${n} سطور`} بانتظار الإرسال`;
}

export function wireSync(): void {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { void flush(); void syncNow(); } });
  window.addEventListener('online', () => { badge(); void flush(); void syncNow(); });
  window.addEventListener('offline', badge);
  window.setInterval(() => { if (document.visibilityState === 'visible') void syncNow(); }, SYNC_EVERY);
}
