/* اللوحة: أربعة أرقام ولوحة تفاصيل واحدة (viewDash, attnCard, dayBar, tilesRow, panel). */
import { esc, num, big, money, int, pr, g2, sum, dayMid, dayShort, dayLong, daysW, linesW, piecesW, ranges, C } from '../util';
import { ico } from '../icons';
import { S, U, agg, idsIn, lastDay, periodRange, missingDays, expByCat, expByEmp, extrasIn, type Agg, type Period, type Range } from '../state';
import { live } from '../../../shared/domain';
import { photosBtn, statusPill, dlgHead } from '../ui';
import { periodCtl } from './period';

type Tab = 'sales' | 'purch' | 'exp' | 'tot';
interface Dash { P: Period; R: Range; ids: string[]; A: Agg; tab: Tab }
let DASH: Dash | null = null;
export const dash = (): Dash => DASH!;

export function viewDash(): string {
  if (!U.period || U.period.kind === 'range') U.period = { kind: 'month', anchor: lastDay() };
  const P = U.period; const R = periodRange(P); const ids = idsIn(R.from, R.to); const A = agg(ids);
  const tab: Tab = (['sales', 'purch', 'exp', 'tot'] as const).find((t) => t === U.dtab) ?? 'sales';
  DASH = { P, R, ids, A, tab };
  const day = P.kind === 'day';
  const sub = !ids.length ? 'اختر فترة فيها أيام مُدخلة.' : day ? '' : `أيام مُدخلة في هذه الفترة: ${num(ids.length)}.`;
  const head = `<section class="dash-head"><div><h1 class="kufi h1">اللوحة</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div><div class="period">${periodCtl(P, R, { p: 'd', range: false })}</div></section>`;
  if (!ids.length) return head + `<section class="card empty-big"><p>لا توجد أيام مُدخلة في ${R.label}.</p><button type="button" class="btn-ghost btn-sm" data-act="plast" data-p="d">اذهب إلى آخر يوم مُدخل</button></section>`;
  // على الجوال الأرقام الأربعة أولًا (.dtop)، وعلى الكمبيوتر اليوم أو المشاكل فوقها
  return head + `<div class="dtop">${day ? dayBar(ids[0]!) : attnCard(P, R, ids)}${tilesRow(A, tab)}</div>` + panel(tab);
}

interface AttnRow { mark: string; cls: string; text: string; act?: string; go?: string }
function attnRow(r: AttnRow): string {
  const m = `<span class="attn-m${r.cls ? ` ${r.cls}` : ''}" aria-hidden="true">${r.mark}</span><span class="attn-t">${r.text}</span>`;
  return r.act ? `<button type="button" class="attn-i" ${r.act}>${m}<span class="attn-go">${r.go} ${ico('chevl', 14)}</span></button>` : `<div class="attn-i">${m}</div>`;
}

/** مشاكل الفترة، صف لكل مشكلة؛ الصف اللي ينصلح يفتح مكان التصليح. */
function attnCard(P: Period, R: Range, ids: string[]): string {
  const rows: string[] = [];
  const lerr = ids.filter((id) => S.days[id]!.status === 'lerr'); const open = ids.filter((id) => S.days[id]!.status === 'open');
  if (lerr.length > 2) rows.push(attnRow({ mark: '!', cls: 'warn', text: `<b>${daysW(lerr.length)} فيها خطأ في جمع الدفتر</b>`, act: 'data-act="alist" data-k="lerr"', go: 'اعرضها' }));
  else lerr.forEach((id) => rows.push(attnRow({ mark: '!', cls: 'warn', text: `<b>${dayMid(id)}</b><span>خطأ في جمع الدفتر</span>`, act: `data-act="opencheck" data-id="${id}"`, go: 'افتح المقارنة' })));
  if (open.length > 2) rows.push(attnRow({ mark: '؟', cls: '', text: `<b>${daysW(open.length)} لم تُقارن بالدفتر</b>`, act: 'data-act="alist" data-k="open"', go: 'اعرضها' }));
  else open.forEach((id) => rows.push(attnRow({ mark: '؟', cls: '', text: `<b>${dayMid(id)}</b><span>لم يُقارن بالدفتر</span>`, act: `data-act="opencheck" data-id="${id}"`, go: 'قارنه الآن' })));
  const miss = missingDays(R);
  if (miss.length) rows.push(attnRow({ mark: ico('days', 15), cls: '', text: `<b>أيام لم تُدخل</b><span>${ranges(miss)}</span>` }));
  if (!rows.length) return `<div class="attn-ok">${ico('check', 16)} ${P.kind === 'week' ? 'كل أيام هذا الأسبوع مطابقة للدفتر' : 'كل أيام هذا الشهر مطابقة للدفتر'}</div>`;
  return `<section class="attn card" aria-labelledby="attn-h"><h2 class="attn-h" id="attn-h">يحتاج انتباهك</h2>${rows.join('')}</section>`;
}

function dayBar(id: string): string {
  const d = S.days[id]!;
  const fix = d.status === 'ok' ? '' : `<button type="button" class="btn-text" data-act="opencheck" data-id="${id}">${d.status === 'lerr' ? 'افتح المقارنة' : 'قارنه الآن'} ${ico('chevl', 14)}</button>`;
  return `<section class="card dbar" aria-label="اليوم"><div class="dstrip"><span>سعر البيع<b class="num">${pr(d.sell)}</b></span><span>سعر الشراء<b class="num">${pr(d.buy)}</b></span><span class="ds-st">${statusPill(d)}${fix}</span><div class="ds-acts">${(d.photos || []).length ? photosBtn(d, 'btn-ghost btn-sm') : ''}<button type="button" class="btn-ghost btn-sm" data-act="wa" data-id="${id}">${ico('chat', 16)} شارك على الواتساب</button><button type="button" class="btn-ghost btn-sm" data-act="openday" data-id="${id}">افتح اليوم في الإدخال</button></div></div></section>`;
}

function tilesRow(A: Agg, tab: Tab): string {
  const tiles = [
    { k: 'sales', l: 'المبيعات', c: C.sales, s: `${piecesW(A.sn)}، ${num(g2(A.sw))} جم` },
    { k: 'purch', l: 'المشتريات', c: C.purch, s: `${num(g2(A.pw))} جم ذهب` },
    { k: 'exp', l: 'المصروفات', c: C.exp, s: linesW(A.en) },
    { k: 'tot', l: 'إجمالي الأجور', c: C.tot, s: 'الأجور والعمولة' },
  ] as const;
  return `<div class="tiles" role="tablist" aria-label="الأرقام الرئيسية">${tiles.map((t) => `<button type="button" class="tile" role="tab" id="tile-${t.k}" aria-selected="${t.k === tab}" aria-controls="dpanel" data-act="dtab" data-k="${t.k}">
      <span class="tl"><i style="background:${t.c}"></i>${t.l}</span>
      <span class="tv">${big(A[t.k])}</span>
      <span class="ts">${t.s}</span>
      <span class="tgo">التفاصيل ${ico(t.k === tab ? 'chevd' : 'chevl', 14)}</span>
    </button>`).join('')}</div>`;
}

const head = (title: string): string => `<div class="ph"><h2>${title}</h2></div>`;
export const grams = (w: number): string => `${g2(w)} <span class="u">جم</span>`;
const stats = (items: [string, string][]): string => `<div class="pstats">${items.map(([k, v]) => `<div><small>${esc(k)}</small><b class="num">${v}</b></div>`).join('')}</div>`;

function panel(tab: Tab): string {
  const { P, ids, A } = dash(); const multi = P.kind !== 'day';
  let html: string;
  if (tab === 'sales') {
    const best = multi && A.per.length > 1 ? A.per.reduce((x, y) => (y.sales > x.sales ? y : x)) : null;
    html = (multi ? chartSec('sales', 'المبيعات كل يوم', best ? `أعلى يوم: ${dayMid(best.id)}` : '') : head('تفاصيل المبيعات'))
      + stats([['الذهب المباع', grams(A.sw)], ['عدد القطع المباعة', int(A.sn)]]);
  } else if (tab === 'purch') {
    // صاحب المحل طلب ما يكون فيه سطر «دخل ذهب أكثر مما خرج»: الذهب المشترى فقط
    html = (multi ? chartSec('purch', 'المشتريات كل يوم', '') : head('تفاصيل المشتريات'))
      + stats([['الذهب المشترى', grams(A.pw)], ...(A.pjw ? [['منه كسر', grams(A.pkw)], ['منه جديد', grams(A.pjw)]] as [string, string][] : [])]);
  } else if (tab === 'exp') {
    html = `<div class="pgrid first">${expBlk(ids, A)}${empBlk(ids)}</div>`;
  } else {
    html = (multi ? chartSec('tot', 'إجمالي الأجور كل يوم', 'الأجور والعمولة') : head('تفاصيل إجمالي الأجور'))
      + stats([['الأجور', money(A.mk)], ['العمولة', money(A.comm)], ...extrasIn(ids).map(([k, v]) => [k, money(v)] as [string, string])]);
  }
  return `<section class="panel card" id="dpanel" role="tabpanel" aria-labelledby="tile-${tab}">${html}</section>`;
}

function chartSec(series: string, title: string, note: string): string {
  return `<div class="ph"><h2>${title}</h2><div class="ph-r">${note ? `<span class="u">${note}</span>` : ''}<button type="button" class="btn-text" data-act="tview">${U.tview ? 'إخفاء الجدول' : 'عرض كجدول'}</button></div></div>
    <div class="chart" data-chart="bars" data-series="${series}"></div>
    <p class="chart-hint">اضغط على أي يوم في الرسم لعرضه وحده.</p>
    ${U.tview ? dailyTable(series as 'sales' | 'purch' | 'tot') : ''}`;
}

function dailyTable(series: 'sales' | 'purch' | 'tot'): string {
  const label = { sales: 'المبيعات', purch: 'المشتريات', tot: 'إجمالي الأجور' }[series]; const sell = series !== 'purch';
  return `<div class="tview"><table><thead><tr><th>اليوم</th><th>${label}</th>${sell ? '<th>سعر البيع</th>' : ''}<th>سعر الشراء</th></tr></thead><tbody>${dash().A.per.map((p) => `<tr><td>${dayShort(p.id)}</td><td>${num(money(p[series]))}</td>${sell ? `<td>${num(pr(p.sell))}</td>` : ''}<td>${num(pr(p.buy))}</td></tr>`).join('')}</tbody></table></div>`;
}

const blk = (title: string, sub: string, body: string): string => `<div class="blk"><div class="bh"><h3>${title}</h3>${sub ? `<span class="u">${sub}</span>` : ''}</div>${body}</div>`;
const xTable = (first: string, rows: string, foot: { n: number; a: number }): string => `<div class="tscroll"><table class="xt"><thead><tr><th>${first}</th><th class="n">عدد السطور</th><th class="r">المبلغ</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td>المجموع</td><td class="n">${num(int(foot.n))}</td><td class="r">${num(money(foot.a))}</td></tr></tfoot></table></div>`;

function expBlk(ids: string[], A: Agg): string {
  const cats = expByCat(ids);
  if (!cats.length) return blk('المصروفات حسب النوع', '', '<p class="sub">لا مصروفات في هذه الفترة.</p>');
  return blk('المصروفات حسب النوع', '', xTable('النوع', cats.map(([c, r]) => `<tr><td>${esc(c)}</td><td class="n">${num(int(r.n))}</td><td class="r">${num(money(r.a))}</td></tr>`).join(''), { n: A.en, a: A.exp }));
}
function empBlk(ids: string[]): string {
  const e = expByEmp(ids);
  if (!e.length) return blk('المصروفات حسب الموظف', '', '<p class="sub">لا مصروفات باسم موظف في هذه الفترة.</p>');
  const rows = e.map(([n, r]) => `<tr class="go" data-act="emp" data-n="${esc(n)}"><td><button type="button" class="lnk">${esc(n)}</button></td><td class="n">${num(int(r.n))}</td><td class="r">${num(money(r.a))}</td></tr>`).join('');
  return blk('المصروفات حسب الموظف', 'اضغط على الاسم لعرض سطوره', xTable('الموظف', rows, { n: sum(e, (x) => x[1].n), a: sum(e, (x) => x[1].a) }));
}

export function empDialog(name: string): string {
  const { ids, R } = dash(); const rows: [string, (typeof S.days)[string]['exp'][number]][] = []; let tot = 0;
  for (const id of ids) for (const l of live(S.days[id]!.exp)) if (l.emp === name) { rows.push([id, l]); tot += l.a; }
  return `<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-t">
    ${dlgHead(`مصروفات ${esc(name)}`, esc(R.label))}
    <div class="tscroll" style="margin-top:14px"><table class="rt"><thead><tr><th>اليوم</th><th>البيان</th><th>النوع</th><th class="r">المبلغ</th></tr></thead>
      <tbody>${rows.map(([id, l]) => `<tr><td>${dayShort(id)}</td><td>${esc(l.d)}</td><td>${esc(l.c)}</td><td class="r">${num(money(l.a))}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="3">المجموع (${linesW(rows.length)})</td><td class="r">${num(money(tot))}</td></tr></tfoot></table></div>
  </div>`;
}

export function alertDialog(kind: 'lerr' | 'open'): string {
  const { ids: all, R } = dash();
  const ids = all.filter((id) => S.days[id]!.status === kind).slice().reverse();
  const title = kind === 'lerr' ? 'أيام فيها خطأ في جمع الدفتر' : 'أيام لم تُقارن بالدفتر';
  const rows = ids.map((id) => `<button type="button" class="al-i" data-act="opencheck" data-id="${id}"><span class="al-t"><b>${dayLong(id)}</b>${kind === 'lerr' && S.days[id]!.note ? `<span class="u">${esc(S.days[id]!.note)}</span>` : ''}</span><span class="al-go">افتح المقارنة ‹</span></button>`).join('');
  return `<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-t">
    ${dlgHead(title, esc(R.label))}
    <div class="dlg-note">${daysW(ids.length)}. اضغط على يوم لفتح المقارنة بالدفتر.</div>
    <div class="alist">${rows}</div>
  </div>`;
}
