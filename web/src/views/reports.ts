/* التقارير: أي فترة، بشكل ورقة تُطبع (viewReports, detailT). */
import { W, live, type AnyLine, type SaleLine, type PurchLine, type ExpLine } from '../../../shared/domain';
import { esc, num, money, int, pr, g2, sum, dayMid, dayShort, linesW, ranges } from '../util';
import { ico, diamond } from '../icons';
import { S, U, agg, idsIn, coverage, startPeriod, periodRange, missingDays, expByCat, expByEmp, APP_NAME, shopLine, type Agg } from '../state';
import { statusText } from '../ui';
import { periodCtl } from './period';

type Sec = 'sales' | 'purch' | 'exp';
export const RKINDS = [['sum', 'الملخص', ''], ['sales', 'المبيعات', 'تقرير المبيعات بالتفصيل'], ['purch', 'المشتريات', 'تقرير المشتريات بالتفصيل'], ['exp', 'المصروفات', 'تقرير المصروفات بالتفصيل']] as const;

interface Cols { head: string[]; al: string[]; d: number; row: (l: AnyLine) => string[]; tot: (ls: AnyLine[]) => string[] }
const gw = (l: AnyLine): number | null => W((l as SaleLine).g, (l as SaleLine).m);
const wTxt = (w: number | null): string => (w === null ? '<span class="dim">بلا وزن</span>' : num(g2(w)));
const COLS: Record<Sec, Cols> = {
  sales: { head: ['السعر', 'الوزن', 'البيان', 'الأجور', 'العيار'], al: ['r', 'r', '', 'r', ''], d: 2,
    row: (l) => { const s = l as SaleLine; return [num(money(s.p)), wTxt(gw(s)), esc(s.d), num(money(s.mk)), esc(s.k || '—')]; },
    tot: (ls) => [num(money(sum(ls, (l) => (l as SaleLine).p))), num(g2(sum(ls, gw))), '', num(money(sum(ls, (l) => (l as SaleLine).mk))), ''] },
  purch: { head: ['المبلغ', 'الوزن', 'البيان', 'النوع'], al: ['r', 'r', '', ''], d: 2,
    row: (l) => { const p = l as PurchLine; return [num(money(p.a)), wTxt(gw(p)), esc(p.d), p.t === 'جديد' ? '<span class="chipk new">جديد</span>' : 'كسر']; },
    tot: (ls) => [num(money(sum(ls, (l) => (l as PurchLine).a))), num(g2(sum(ls, gw))), '', ''] },
  exp: { head: ['المبلغ', 'البيان', 'النوع', 'الموظف'], al: ['r', '', '', ''], d: 1,
    row: (l) => { const e = l as ExpLine; return [num(money(e.a)), esc(e.d), esc(e.c), e.emp ? esc(e.emp) : '<span class="dim">—</span>']; },
    tot: (ls) => [num(money(sum(ls, (l) => (l as ExpLine).a))), '', '', ''] },
};

/** جدول واحد مقسّم بالأيام: عنوان لكل يوم، سطوره، مجموعه؛ ومجموع الفترة تحت. */
function detailT(ids: string[], sec: Sec): string {
  const c = COLS[sec]; const n = c.head.length + 1; const all: AnyLine[] = [];
  const cells = (vals: string[], first: string): string => `<td class="c-n">${first}</td>` + vals.map((v, i) => `<td${c.al[i] ? ` class="${c.al[i]}"` : ''}>${v}</td>`).join('');
  const totRow = (cls: string, label: string, ls: AnyLine[]): string => { const t = c.tot(ls); t[c.d] = label; return `<tr class="${cls}">${cells(t, '')}</tr>`; };
  let body = '';
  for (const id of ids) {
    const ls = live(S.days[id]![sec] as AnyLine[]); if (!ls.length) continue;
    all.push(...ls);
    body += `<tbody><tr class="grp"><td colspan="${n}">${dayMid(id)}</td></tr>${ls.map((l, i) => `<tr>${cells(c.row(l), num(i + 1))}</tr>`).join('')}${totRow('sub', `مجموع اليوم (${linesW(ls.length)})`, ls)}</tbody>`;
  }
  if (!all.length) return `<p class="sub">${{ sales: 'لا مبيعات', purch: 'لا مشتريات', exp: 'لا مصروفات' }[sec]} في هذه الفترة.</p>`;
  let foot = totRow('', `المجموع (${linesW(all.length)})`, all);
  if (sec === 'purch' && all.some((l) => (l as PurchLine).t === 'جديد')) {
    foot += totRow('part', 'منها كسر', all.filter((l) => (l as PurchLine).t !== 'جديد')) + totRow('part', 'منها جديد', all.filter((l) => (l as PurchLine).t === 'جديد'));
  }
  return `<div class="tscroll"><table class="rt det"><thead><tr><th class="c-n">#</th>${c.head.map((h, i) => `<th${c.al[i] ? ` class="${c.al[i]}"` : ''}>${h}</th>`).join('')}</tr></thead>${body}<tfoot>${foot}</tfoot></table></div>`;
}

function summaryBody(ids: string[], A: Agg): string {
  const rowsSum: [string, number, 'm' | 'g' | 'i', number?][] = [
    ['المبيعات', A.sales, 'm'], ['وزن المبيعات', A.sw, 'g'], ['القطع المباعة', A.sn, 'i'],
    ['الأجور', A.mk, 'm'], ['العمولة والبنود الإضافية', A.comm + A.extra, 'm'], ['إجمالي الأجور', A.tot, 'm', 1],
    ['المشتريات', A.purch, 'm'], ...(A.pj ? [['منها كسر', A.pk, 'm'], ['منها جديد', A.pj, 'm']] as [string, number, 'm'][] : []), ['وزن المشتريات', A.pw, 'g'],
    ['المصروفات', A.exp, 'm'],
  ];
  const fv = (v: number, f: string): string => (f === 'm' ? num(money(v)) : f === 'g' ? `${num(g2(v))} جم` : num(int(v)));
  const sumT = `<table class="rt kv"><tbody>${rowsSum.map(([l, v, f, lead]) => `<tr${lead ? ' class="lead"' : ''}><td>${l}</td><td class="r">${fv(v, f)}</td></tr>`).join('')}</tbody></table>`;
  const dayT = `<div class="tscroll"><table class="rt"><thead><tr><th>اليوم</th><th class="r">سعر البيع</th><th class="r">سعر الشراء</th><th class="r">المبيعات</th><th class="r">وزن المبيعات</th><th class="r">إجمالي الأجور</th><th class="r">المشتريات</th><th class="r">وزن المشتريات</th><th class="r">المصروفات</th><th>مع الدفتر</th></tr></thead>
    <tbody>${A.per.map((p) => `<tr><td>${dayShort(p.id)}</td><td class="r">${num(pr(p.sell))}</td><td class="r">${num(pr(p.buy))}</td><td class="r">${num(money(p.sales))}</td><td class="r">${num(g2(p.sw))}</td><td class="r">${num(money(p.tot))}</td><td class="r">${num(money(p.purch))}</td><td class="r">${num(g2(p.pw))}</td><td class="r">${num(money(p.exp))}</td><td>${statusText(S.days[p.id]!)}</td></tr>`).join('')}</tbody>
    <tfoot><tr><td>المجموع</td><td></td><td></td><td class="r">${num(money(A.sales))}</td><td class="r">${num(g2(A.sw))}</td><td class="r">${num(money(A.tot))}</td><td class="r">${num(money(A.purch))}</td><td class="r">${num(g2(A.pw))}</td><td class="r">${num(money(A.exp))}</td><td></td></tr></tfoot></table></div>`;
  const cats = expByCat(ids); const emps = expByEmp(ids);
  const catT = cats.length ? `<table class="rt kv"><tbody>${cats.map(([c, r]) => `<tr><td>${esc(c)}</td><td class="r">${num(money(r.a))}</td></tr>`).join('')}</tbody><tfoot><tr><td>المجموع</td><td class="r">${num(money(A.exp))}</td></tr></tfoot></table>` : '<p class="sub">لا مصروفات.</p>';
  const empT = emps.length ? `<table class="rt kv"><tbody>${emps.map(([n, r]) => `<tr><td>${esc(n)}</td><td class="r">${num(money(r.a))}</td></tr>`).join('')}</tbody></table>` : '<p class="sub">لا مصروفات باسم موظف.</p>';
  return `<h2>الملخص</h2>${sumT}<h2>كل يوم</h2>${dayT}<div class="rgrid"><div><h2>المصروفات حسب النوع</h2>${catT}</div><div><h2>المصروفات حسب الموظف</h2>${empT}</div></div>`;
}

function notesOf(ids: string[], R: { from: string; to: string }): string[] {
  const notes: string[] = [];
  ids.filter((id) => S.days[id]!.status === 'lerr').forEach((id) => notes.push(`${dayMid(id)}: ${esc(S.days[id]!.note || 'خطأ في جمع الدفتر.')}`));
  const open = ids.filter((id) => S.days[id]!.status === 'open'); if (open.length) notes.push(`لم تُقارن بالدفتر بعد: ${open.map(dayMid).join('، ')}.`);
  const miss = missingDays(R); if (miss.length) notes.push(`أيام لم تُدخل: ${ranges(miss)}.`);
  return notes;
}

export function viewReports(): string {
  if (!U.rperiod) U.rperiod = startPeriod('rperiod', 'month');
  const P = U.rperiod; const R = periodRange(P); const ids = idsIn(R.from, R.to); const A = agg(ids);
  const head = `<section class="dash-head"><div><h1 class="kufi h1">التقارير</h1><p class="sub">اختر الفترة: يوم، أو أسبوع، أو شهر، أو من تاريخ إلى تاريخ.</p></div><div class="period">${periodCtl(P, R, { p: 'r', range: true })}</div></section>`;
  if (!ids.length) return head + `<section class="card empty-big"><p>لا توجد أيام مُدخلة في ${R.label}.</p><button type="button" class="btn-ghost btn-sm" data-act="plast" data-p="r">اذهب إلى آخر شهر فيه بيانات</button></section>`;
  const kind = { day: 'يوم', week: 'أسبوع', month: 'شهر', range: 'فترة' }[P.kind];
  const RK = RKINDS.find((r) => r[0] === U.rkind) ?? RKINDS[0]; const rk = RK[0];
  const notes = notesOf(ids, R); const today = new Date();
  const kinds = `<div class="rk"><span class="lb" id="rk-l">نوع التقرير</span><div class="seg" role="tablist" aria-labelledby="rk-l">${RKINDS.map(([k, l]) => `<button type="button" role="tab" data-act="rkind" data-k="${k}" aria-selected="${k === rk}">${l}</button>`).join('')}</div></div>`;
  const body = rk === 'sum' ? summaryBody(ids, A) : `<h2>كل السطور، يومًا بيوم</h2>${detailT(ids, rk)}`;
  return head + `<div class="rep-bar">${kinds}<div class="rep-acts"><button type="button" class="btn-ghost" data-act="repwa">${ico('chat', 18)} أرسل على الواتساب</button><button type="button" class="btn-ghost" data-act="print">${ico('print', 18)} طباعة أو PDF</button></div></div>
  <article class="paper" aria-label="التقرير">
    <header class="paper-head">
      <div class="pbrand">${diamond(32)}<div><b>${APP_NAME}</b><small>${esc(shopLine())}</small></div></div>
      <div><h1 class="kufi">${rk === 'sum' ? `تقرير ${kind}` : RK[2]}</h1><div class="per">${R.label}</div><div class="per">أيام مُدخلة: ${num(ids.length)}${P.kind === 'day' ? '' : ` من ${num(coverage(R, ids.length).of)}`}</div></div>
    </header>
    ${body}
    <h2>ملاحظات</h2>${notes.length ? `<ul class="paper-notes">${notes.map((n) => `<li>${n}</li>`).join('')}</ul>` : '<p class="sub">لا ملاحظات: كل الأيام مُدخلة ومطابقة للدفتر.</p>'}
    <footer class="paper-foot"><span>${APP_NAME}، ${esc(shopLine())}</span><span>أُعدّ في ${num(`${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`)}</span></footer>
  </article>`;
}
