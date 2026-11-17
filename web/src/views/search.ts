/* البحث: كل السطور، أي فترة، أو تاريخ واحد (viewSearch, parseQuery, searchHits, dayCard). */
import { T, W, hasVal, normS, findWord, type AnyLine, type SaleLine, type PurchLine, type ExpLine } from '../../../shared/domain';
import { esc, num, money, int, pr, g2, hlTerms, linesW, daysW, piecesW, dayLong, dayMid, dayShort, D, ID, MONTHS_AR } from '../util';
import { ico } from '../icons';
import { S, U, dayIds, idsIn, lastDay, periodRange } from '../state';
import { photosBtn, statusPill, statusText } from '../ui';
import { periodNav } from './period';

type Sec = 'sales' | 'purch' | 'exp';
const SEC_TAG: Record<Sec, string> = { sales: 'بيع', purch: 'شراء', exp: 'مصروف' };
const SEC_NAME: Record<Sec, string> = { sales: 'المبيعات', purch: 'المشتريات', exp: 'المصروفات' };
const Q_SECS = [['all', 'الكل'], ['sales', 'المبيعات'], ['purch', 'المشتريات'], ['exp', 'المصروفات']] as const;
const Q_EX = ['اساور خيط', 'خاتم 800', '3050', '7.2', 'ضيافة', 'علي', '13/10', '5/10'];
const Q_MAX = 300;
const MONTHS_N = MONTHS_AR.map(normS);

export function viewSearch(): string {
  const P = U.qperiod; const R = P ? periodRange(P) : null; const sec = U.qs || 'all';
  const ksegs = ([['all', 'كل الأيام'], ['day', 'يوم'], ['week', 'أسبوع'], ['month', 'شهر'], ['range', 'فترة']] as const).map(([k, l]) => `<button type="button" role="tab" data-act="qpkind" data-p="q" data-k="${k}" aria-selected="${(P ? P.kind : 'all') === k}">${l}</button>`).join('');
  return `<section class="page-head"><div><h1 class="kufi h1">البحث</h1><p class="sub">في كل السطور: البيان، أو المبلغ، أو الوزن، أو نوع المصروف، أو اسم الموظف. أو اكتب تاريخًا مثل 13/10.</p></div></section>
  <section class="card sbox" aria-label="البحث">
    <label class="sfield">${ico('search', 20)}<input class="in" id="q" type="search" enterkeyhint="search" value="${esc(U.q || '')}" placeholder="مثل: خاتم 800، 3050، 7.2، علي، 13/10" autocomplete="off" aria-label="ابحث في السطور"></label>
    <div class="sfilters">
      <div class="seg" role="tablist" aria-label="القسم">${Q_SECS.map(([k, l]) => `<button type="button" role="tab" data-act="qsec" data-k="${k}" aria-selected="${sec === k}">${l}</button>`).join('')}</div>
      <div class="period"><div class="seg" role="tablist" aria-label="المدة">${ksegs}</div>${P && R ? periodNav(P, R, 'q') : ''}</div>
    </div>
  </section>
  <div id="sr" aria-live="polite">${searchResults()}</div>`;
}

// 13/10 بدون سنة = آخر 13 أكتوبر فيه يوم مُدخل؛ وإذا ما فيه، سنة اليوم.
const ymd = (y: number, m: number, d: number): string => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
function resolveDate(d: number, m: number, y: number): string | null {
  if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
  let id: string;
  if (y) id = ymd(y < 100 ? 2000 + y : y, m, d);
  else {
    const md = `-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    id = dayIds().filter((x) => x.endsWith(md)).slice(-1)[0] ?? ymd(Number(lastDay().slice(0, 4)), m, d);
  }
  return ID(D(id)) === id ? id : null;
}

/** البحث كلمات لازم تكون كلها في نفس السطر («خاتم 800»)، مع أي تواريخ فيه. النقطة ما تكون فاصل تاريخ: 13.10 وزن. */
function parseQuery(q: string): { dates: string[]; terms: string[] } {
  let s = normS(q).replace(/٫/g, '.');
  const dates: string[] = [];
  const take = (p: { all: string; d: string; m: string | number; y?: string }): string => {
    const id = resolveDate(Number(p.d), Number(p.m), p.y ? Number(p.y) : 0);
    if (!id) return p.all;
    if (!dates.includes(id)) dates.push(id);
    return ' ';
  };
  s = s.replace(/(?<!\d)(\d{4})-(\d{1,2})-(\d{1,2})(?!\d)/g, (...g: string[]) => take({ all: g[0]!, d: g[3]!, m: g[2]!, y: g[1] }));
  s = s.replace(/(?<!\d)(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}|\d{2}))?(?!\d)/g, (...g: string[]) => take({ all: g[0]!, d: g[1]!, m: g[2]!, y: g[3] }));
  s = s.replace(new RegExp(`(?<!\\d)(\\d{1,2})\\s*(${MONTHS_N.join('|')})(?:\\s*(\\d{4}))?`, 'g'), (...g: string[]) => take({ all: g[0]!, d: g[1]!, m: MONTHS_N.indexOf(g[2]!) + 1, y: g[3] }));
  const terms = s.split(/\s+/).map((t) => t.replace(/^[+،,؛]+|[+،,؛]+$/g, '')).filter(Boolean);
  return { dates, terms };
}

/** وين انوجدت كلمة البحث في السطر: البيان، نوع المصروف أو الموظف، نوع الشراء، أو رقم. */
function termHit(s: Sec, l: AnyLine, t: string): string | null {
  const L = l as SaleLine & PurchLine & ExpLine;
  if (findWord(normS(L.d), t) >= 0) return 'd';
  if (s === 'exp' && findWord(normS(L.c), t) >= 0) return 'c';
  if (s === 'exp' && L.emp && findWord(normS(L.emp), t) >= 0) return 'e';
  if (s === 'purch' && findWord(normS(L.t === 'جديد' ? 'ذهب جديد' : 'كسر'), t) >= 0) return 't';
  const nq = t.replace(/[,،]/g, '');
  if (/^\d+(\.\d+)?$/.test(nq)) {
    const n = Number(nq); const near = (a: unknown): boolean => hasVal(a) && Math.abs(Number(a) - n) < 0.005;
    if (near(s === 'sales' ? L.p : L.a)) return 'a';
    if (s === 'sales' && near(L.mk)) return 'mk';
    const w = s === 'exp' ? null : W(L.g, L.m);
    if (w !== null && near(w)) return 'w';
  }
  return null;
}

interface Hit { id: string; s: Sec; l: AnyLine; hit: Record<string, string[]> }
function searchHits(Q: { terms: string[] }, sec: string, ids: string[]): Hit[] {
  if (!Q.terms.length) return [];
  const out: Hit[] = [];
  for (const id of ids.slice().reverse()) {
    for (const s of ['sales', 'purch', 'exp'] as const) {
      if (sec !== 'all' && sec !== s) continue;
      for (const l of S.days[id]![s] as AnyLine[]) {
        const hit: Record<string, string[]> = {};
        if (Q.terms.every((t) => { const f = termHit(s, l, t); if (f) (hit[f] = hit[f] ?? []).push(t); return !!f; })) out.push({ id, s, l, hit });
      }
    }
  }
  return out;
}

/** التاريخ المكتوب يعرض اليوم كله بلمحة: الأسعار، العمولة، المجاميع الأربعة، والمقارنة. */
function dayCard(id: string): string {
  const d = S.days[id];
  if (!d) {
    const ids = dayIds(); const before = ids.filter((x) => x < id).slice(-1)[0]; const after = ids.find((x) => x > id);
    const near = [before ? `<button type="button" class="btn-ghost btn-sm" data-act="sday" data-id="${before}">قبله: ${dayShort(before)}</button>` : '', after ? `<button type="button" class="btn-ghost btn-sm" data-act="sday" data-id="${after}">بعده: ${dayShort(after)}</button>` : ''].join('');
    return `<section class="card dcard none" data-day="${id}"><div class="dc-h"><div class="dc-t"><b class="kufi">${dayLong(id)}</b><span class="pill wait">لم يُدخل</span></div></div>
      <p class="sub">لا يوجد يوم مُدخل بهذا التاريخ.${near ? ' أقرب يوم مُدخل:' : ''}</p>${near ? `<div class="dc-near">${near}</div>` : ''}</section>`;
  }
  const t = T(d); const fact = (k: string, v: string): string => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
  return `<section class="card dcard" data-day="${id}">
    <div class="dc-h"><div class="dc-t"><b class="kufi">${dayLong(id)}</b>${statusPill(d)}</div><div class="dc-acts">${(d.photos || []).length ? photosBtn(d, 'btn-ghost btn-sm') : ''}<button type="button" class="btn-gold btn-sm" data-act="sday" data-id="${id}">افتح اليوم</button></div></div>
    <dl class="dh-facts dc-f">${fact('سعر البيع', hasVal(d.sell) ? num(pr(d.sell)) : '<span class="dim">—</span>')}${fact('سعر الشراء', num(pr(d.buy)))}${fact('العمولة', hasVal(d.comm) ? num(money(d.comm)) : '<span class="dim">—</span>')}</dl>
    <div class="pstats dc-s">
      <div><small>المبيعات</small><b class="num">${money(t.sales)}</b><span class="u">${piecesW(t.sn)}، ${num(g2(t.sw))} جم</span></div>
      <div><small>المشتريات</small><b class="num">${money(t.purch)}</b><span class="u">${num(g2(t.pw))} جم ذهب</span></div>
      <div><small>المصروفات</small><b class="num">${money(t.exp)}</b><span class="u">${linesW(t.en)}</span></div>
      <div><small>إجمالي الأجور</small><b class="num">${money(t.tot)}</b><span class="u">الأجور والعمولة</span></div>
    </div>
    ${d.status === 'lerr' && d.note ? `<p class="dc-note">${esc(d.note)}</p>` : ''}
  </section>`;
}

function totalsOf(hits: Hit[]): string {
  const tot: Partial<Record<Sec, { n: number; w: number; a: number }>> = {};
  for (const h of hits) {
    if (h.l.x) continue;
    const L = h.l as SaleLine & PurchLine;
    const t = tot[h.s] ?? (tot[h.s] = { n: 0, w: 0, a: 0 });
    t.n += 1; t.a += Number(h.s === 'sales' ? L.p : L.a) || 0; if (h.s !== 'exp') t.w += W(L.g, L.m) ?? 0;
  }
  return (['sales', 'purch', 'exp'] as const).filter((s) => tot[s]).map((s) => `<div data-sum="${s}"><small>${SEC_NAME[s]}</small><b class="num">${money(tot[s]!.a)}</b><span class="u">${linesW(tot[s]!.n)}${s !== 'exp' ? `، ${num(g2(tot[s]!.w))} جم` : ''}</span></div>`).join('');
}

export function searchResults(): string {
  const q = (U.q || '').trim();
  if (!q) return `<section class="card shint"><p class="sub">اكتب كلمة من البيان، أو مبلغًا، أو وزنًا، أو تاريخًا. وتقدر تجمع أكثر من شيء، مثل «خاتم 800». جرّب من الدفتر:</p><div class="chips">${Q_EX.map((x) => `<button type="button" class="chip" data-act="qex" data-v="${esc(x)}">${/^[\d/ ]+$/.test(x) ? num(esc(x)) : esc(x)}</button>`).join('')}</div></section>`;
  const Q = parseQuery(q); const sec = U.qs || 'all';
  // التاريخ المكتوب أدق من أزرار الفترة، فيحل محلها
  const P = Q.dates.length ? null : U.qperiod; const R = P ? periodRange(P) : null;
  const ids = Q.dates.length ? Q.dates.filter((id) => S.days[id]).sort() : R ? idsIn(R.from, R.to) : dayIds();
  const where = Q.dates.length ? Q.dates.map(dayMid).join('، ') : R ? R.label : 'كل الأيام';
  const cards = Q.dates.map(dayCard).join('');
  if (!Q.terms.length) return cards;
  const hits = searchHits(Q, sec, ids);
  if (!hits.length) return cards + `<section class="card empty-big"><p>لا توجد سطور فيها «${esc(q)}»${sec !== 'all' ? ` في ${SEC_NAME[sec as Sec]}` : ''}${Q.dates.length ? '' : ` (${esc(where)})`}.</p>${(U.qperiod && !Q.dates.length) || sec !== 'all' ? '<button type="button" class="btn-ghost btn-sm" data-act="qall">ابحث في كل الأيام وكل الأقسام</button>' : ''}</section>`;
  const cells = totalsOf(hits);
  const nx = hits.filter((h) => h.l.x).length; const days = new Set(hits.map((h) => h.id)).size;
  let body = ''; let cur: string | null = null;
  for (const h of hits.slice(0, Q_MAX)) {
    if (h.id !== cur) { cur = h.id; body += `<div class="log-day sr-day"><span>${dayMid(h.id)}</span><span class="sr-st">${statusText(S.days[h.id]!)}</span></div>`; }
    body += srRow(h);
  }
  return `${cards}<p class="sres-h" data-out="qcount">${linesW(hits.length)} في ${daysW(days)} (${esc(where)}).${nx ? ` الملغاة منها (${num(nx)}) لا تُحسب في المجموع.` : ''}</p>
    ${cells ? `<div class="pstats sstats card">${cells}</div>` : ''}
    <section class="card srlist" aria-label="النتائج">${body}</section>
    ${hits.length > Q_MAX ? `<p class="u" style="margin:10px 4px">تظهر أول ${num(Q_MAX)} نتيجة. اختر مدة أقصر لترى الباقي.</p>` : ''}`;
}

function srRow(h: Hit): string {
  const { id, s, l, hit } = h; const L = l as SaleLine & PurchLine & ExpLine;
  const mk = (v: string): string => `<mark>${v}</mark>`; const on = (f: string): boolean => !!hit[f];
  const w = s === 'exp' ? null : W(L.g, L.m);
  const wHtml = w === null ? '<span class="dim">بلا وزن</span>' : `${on('w') ? mk(num(g2(w))) : num(g2(w))} جم`;
  const meta = s === 'sales' ? [wHtml, L.k ? `عيار ${num(esc(L.k))}` : '', hasVal(L.mk) ? `أجور ${on('mk') ? mk(num(int(L.mk))) : num(int(L.mk))}` : '']
    : s === 'purch' ? [wHtml, hlTerms(L.t === 'جديد' ? 'ذهب جديد' : 'كسر', hit.t ?? [])]
      : [hlTerms(L.c, hit.c ?? []), L.emp ? hlTerms(L.emp, hit.e ?? []) : ''];
  const amt = num(money(s === 'sales' ? L.p : L.a));
  return `<button type="button" class="sr${l.x ? ' is-x' : ''}" data-act="sres" data-id="${id}" data-sec="${s}" data-l="${l.id}">
      <span class="sk sk-${s}"><i aria-hidden="true"></i>${SEC_TAG[s]}</span>
      <span class="sr-d"><span class="sr-t">${hlTerms(l.d, hit.d ?? [])}</span>${l.x ? `<span class="xr">ملغى: ${esc(l.x.r)}</span>` : ''}<span class="u">${meta.filter(Boolean).join('، ')}</span></span>
      <span class="sr-a">${on('a') ? mk(amt) : amt}</span>
    </button>`;
}
