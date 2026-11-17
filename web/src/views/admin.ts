/* الإدارة: سجل التعديلات، المستخدمون، الإعدادات (viewLog, viewUsers, viewSettings) — من الخادم. */
import { esc, num, dayMid, stamp, DAYS_AR } from '../util';
import { ico } from '../icons';
import { S, U } from '../state';
import { api, ApiError } from '../api';
import { render, themeSeg } from '../ui';
import { waFmt } from './wa';

interface LogEntry { id: number; at: number; who: string; day: string; kind: string; title: string; detail: string }
interface UserDto { id: string; name: string; username: string; role: 'owner' | 'entry'; status: 'active' | 'suspended'; version: number }
interface Keys { passkeys: { id: string; label: string; createdAt: number }[]; recoveryLeft: number }

const cache: { log: LogEntry[] | null; logKind: string; users: UserDto[] | null; keys: Keys | null; err: string } = { log: null, logKind: '', users: null, keys: null, err: '' };
export const resetAdminCache = (): void => { cache.log = null; cache.users = null; cache.keys = null; cache.err = ''; };
export const adminUsers = (): UserDto[] => cache.users ?? [];

function load(job: () => Promise<void>): void {
  job().then(render).catch((e: unknown) => {
    // النظام انقفل وقت التحميل: يعيد المحاولة تلقائيًا بعد الفتح
    if (e instanceof ApiError && e.code === 'session_locked') return;
    cache.err = 'تعذّر التحميل. تأكد من الاتصال وحدّث الصفحة.'; render();
  });
}
const loading = (): string => `<section class="card" style="margin-top:14px"><div class="empty">${cache.err || 'جاري التحميل…'}</div></section>`;

const KINDS: Record<string, string> = { all: 'الكل', add: 'إضافة', edit: 'تعديل', cancel: 'إلغاء', day: 'بيانات اليوم', check: 'المقارنة' };
const ICON: Record<string, [string, string, string]> = {
  add: ['+', 'var(--ok-bg)', 'var(--ok)'], edit: ['✎', 'var(--lerr-bg)', 'var(--lerr)'], cancel: ['×', 'var(--warn-bg)', 'var(--warn)'],
  day: ['◷', 'var(--chip)', 'var(--chip-fg)'], check: ['✓', 'var(--lerr-bg)', 'var(--lerr)'],
};

function logRows(list: LogEntry[]): string {
  const groups = new Map<string, LogEntry[]>();
  list.forEach((e) => { const k = e.day || ''; if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(e); });
  return [...groups.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([day, es]) => `<div class="log-day">${day ? `يوم الدفتر: ${dayMid(day)}` : 'الإدارة والإعدادات'}</div>${es.map((e) => {
    const [ch, bg, fg] = ICON[e.kind] ?? ICON.day!;
    return `<div class="log-e"><span class="li" style="background:${bg};color:${fg}" aria-hidden="true">${ch}</span><div style="min-width:0"><div class="lt">${esc(e.title)}</div>${e.detail ? `<div class="ld">${esc(e.detail)}</div>` : ''}<div class="lm">${esc(e.who)}، ${stamp(e.at)}</div></div></div>`;
  }).join('')}`).join('');
}

export function viewLog(): string {
  const f = U.logf || 'all';
  if (cache.log === null || cache.logKind !== f) {
    cache.logKind = f;
    if (!cache.err) load(async () => { cache.log = (await api.get<{ entries: LogEntry[] }>(`/admin/log?kind=${f}`)).entries; });
  }
  const head = `<section class="page-head"><div><h1 class="kufi h1">سجل التعديلات</h1><p class="sub">كل إضافة أو تعديل أو إلغاء: من فعله، ومتى، والقيمة قبل وبعد. لا يُحذف منه شيء.</p></div></section>
  <div class="chips" style="margin-top:16px" role="group" aria-label="نوع التعديل">${Object.entries(KINDS).map(([k, l]) => `<button type="button" class="chip" data-act="logf" data-k="${k}" aria-pressed="${f === k}">${l}</button>`).join('')}</div>`;
  if (!cache.log) return head + loading();
  return head + `<section class="card" style="margin-top:14px;overflow:hidden"><div class="loglist">${logRows(cache.log) || '<div class="empty">لا شيء من هذا النوع بعد.</div>'}</div></section>`;
}

function userCard(u: UserDto): string {
  const on = u.status === 'active';
  const acts = u.role === 'owner' ? '' : `<div style="display:flex;flex-wrap:wrap;gap:8px"><button type="button" class="btn-ghost btn-sm" data-act="userpw" data-id="${u.id}">تغيير كلمة المرور</button><button type="button" class="btn-danger" data-act="usertoggle" data-id="${u.id}">${on ? 'إيقاف الدخول' : 'السماح بالدخول'}</button></div>`;
  return `<section class="card ucard"><div class="top-row"><span class="avatar">${esc(u.name.slice(0, 1))}</span><div style="flex:1 1 auto;min-width:0"><h2>${esc(u.name)}</h2><div class="u">${u.role === 'owner' ? 'صاحب المحل' : 'موظف الإدخال'} · <span class="num">${esc(u.username)}</span></div></div><span class="pill ${on ? 'ok' : 'wait'}">${on ? 'يستطيع الدخول' : 'موقوف'}</span></div>
    <p class="sub">${u.role === 'owner' ? 'كل شيء: الإدخال، والعرض، والتقارير، والإدارة. من الجوال والكمبيوتر.' : 'إدخال الأيام وتعديلها، ورؤية اللوحة والتقارير. لا يدخل الإدارة.'}</p>
    ${acts}</section>`;
}

/** مفاتيح المرور ورموز الاسترجاع لصاحب المحل. */
function keysCard(k: Keys): string {
  const list = k.passkeys.map((p) => `<span class="pill ok" style="font-size:13px;padding:7px 12px">${ico('key', 14)} ${esc(p.label)}</span>`).join('');
  return `<section class="card scard wide"><h2>دخولك بالبصمة</h2>
    <p class="sub">مفتاح المرور يدخلك بـ Face ID بدون كلمة مرور. أضف مفتاحًا ثانيًا احتياطيًا (جهاز ثاني)، واحفظ رموز الاسترجاع في ورقة: هي طريقك إذا ضاع الجوال.</p>
    <div class="chips" style="align-items:center">${list || '<span class="pill wait">لا يوجد مفتاح مرور بعد</span>'}<button type="button" class="btn-gold btn-sm" data-act="addkey">${ico('plus', 15)} أضف مفتاح مرور لهذا الجهاز</button></div>
    <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:12px"><span class="u">رموز الاسترجاع الباقية: ${num(k.recoveryLeft)}</span><button type="button" class="btn-ghost btn-sm" data-act="codes">أنشئ 10 رموز جديدة</button></div></section>`;
}

export function viewUsers(): string {
  if (cache.users === null && !cache.err) {
    load(async () => {
      const [u, k] = await Promise.all([api.get<{ users: UserDto[] }>('/admin/users'), api.get<Keys>('/auth/passkeys')]);
      cache.users = u.users; cache.keys = k;
    });
  }
  const head = `<section class="page-head"><div><h1 class="kufi h1">المستخدمون</h1><p class="sub">من يدخل النظام، وماذا يستطيع. لا يُحذف مستخدم: الإيقاف يمنعه من الدخول، ويبقى اسمه في السجل.</p></div><button type="button" class="btn-gold" data-act="adduser"><i aria-hidden="true">+</i>أضف مدخل بيانات</button></section>`;
  if (!cache.users || !cache.keys) return head + loading();
  return head + `<div class="agrid">${cache.users.map(userCard).join('')}${keysCard(cache.keys)}
    <section class="card scard wide"><h2>أسماء الموظفين</h2><p class="sub">تظهر اختيارات في خانة «الموظف» عند إضافة مصروف، حتى يُكتب الاسم بنفس الشكل دائمًا.</p>
      <form class="chips" data-form="addname" style="align-items:center">${S.branch.names.map((n) => `<span class="pill lerr" style="font-size:14px;padding:7px 14px">${esc(n)}</span>`).join('')}<input class="in" id="new-name" name="nm" aria-label="اسم جديد" placeholder="اسم جديد" style="width:150px;height:40px;font-size:14px"><button class="btn-ghost btn-sm" type="submit">أضف الاسم</button></form></section>
  </div>`;
}

export function viewSettings(): string {
  const ws = ([[6, 'السبت'], [0, 'الأحد'], [1, 'الاثنين']] as const).map(([v, l]) => `<button type="button" data-act="ws" data-v="${v}" aria-pressed="${S.branch.weekStart === v}">${l}</button>`).join('');
  return `<section class="page-head"><div><h1 class="kufi h1">الإعدادات</h1></div></section>
  <div class="agrid">
    <section class="card scard"><h2>المظهر</h2><p class="sub">الداكن هادئ في الإضاءة الخفيفة، والفاتح أريح في النهار.</p>${themeSeg()}</section>
    <section class="card scard"><h2>بداية الأسبوع</h2><p class="sub">تُستخدم عند اختيار «أسبوع» في اللوحة والتقارير.</p><div class="seg" role="group" aria-label="بداية الأسبوع">${ws}</div></section>
    <section class="card scard wide"><h2>رقم واتساب صاحب المحل</h2><p class="sub">يرسل إليه مدخل البيانات ملخص اليوم بعد المقارنة بالدفتر. يُكتب مرة واحدة.</p>
      <form class="wa-form" data-form="wanum" autocomplete="off" novalidate><input class="in num" id="wa-num" name="wa" type="tel" inputmode="tel" placeholder="مثل 0501234567" value="${S.branch.wa ? esc(waFmt(S.branch.wa)) : ''}" aria-label="رقم الواتساب"><button class="btn-ghost btn-sm" type="submit">احفظ الرقم</button></form>
      <p class="u" style="margin:0" data-out="wasaved">${S.branch.wa ? `المحفوظ: ${num(waFmt(S.branch.wa))}` : 'لا يوجد رقم محفوظ: يختار مدخل البيانات المحادثة بنفسه.'}</p></section>
    <section class="card scard wide"><h2>أنواع المصروفات</h2><p class="sub">تظهر في نافذة «أضف مصروفًا».</p>
      <form class="chips" data-form="addcat" style="align-items:center">${S.branch.cats.map((c) => `<span class="pill wait" style="font-size:13px;padding:7px 12px;font-weight:500">${esc(c)}</span>`).join('')}<input class="in" id="new-cat" name="cat" aria-label="نوع جديد" placeholder="نوع جديد" style="width:150px;height:38px;font-size:14px"><button class="btn-ghost btn-sm" type="submit">أضف النوع</button></form></section>
  </div>`;
}

export const weekDayName = (v: number): string => DAYS_AR[v] ?? '';
