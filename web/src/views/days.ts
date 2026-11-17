/* صفحة الأيام: شهر واحد في كل مرة (viewDays). */
import { T } from '../../../shared/domain';
import { esc, num, money, pr, D, DAYS_AR, ID, daysW, dnum, dow, monthLabel, monthStart } from '../util';
import { S, U, agg, dayIds, lastDay, today } from '../state';
import { photosBtn, statusPill } from '../ui';
import type { Day } from '../../../shared/domain';

const pricesLine = (d: Day): string => `البيع ${num(pr(d.sell))}، الشراء ${num(pr(d.buy))}`;

function dayRow(id: string): string {
  const d = S.days[id]!; const t = T(d); const note = d.status === 'lerr' && d.note ? esc(d.note) : '';
  return `<div class="ln${U.pv && U.pv.day === id ? ' is-pv' : ''}" data-id="${id}">
      <span class="c-d"><button type="button" class="dl-go" data-act="openday" data-id="${id}"><b>${DAYS_AR[dow(id)]} ${num(`${dnum(id)}/${D(id).getUTCMonth() + 1}`)}</b></button><span class="u">${pricesLine(d)}</span></span>
      <span class="c-s c-r"><span class="only-rows u">المبيعات </span>${num(money(t.sales))}</span>
      <span class="c-r only-table">${num(money(t.purch))}</span>
      <span class="c-r only-table">${num(money(t.exp))}</span>
      <span class="c-m only-rows">المشتريات ${num(money(t.purch))}، المصروفات ${num(money(t.exp))}</span>
      <span class="c-st">${statusPill(d, true)}${note ? `<span class="u nt" title="${note}">${note}</span>` : ''}</span>
      <span class="c-ph">${photosBtn(d, 'btn-text', true)}</span>
      ${note ? `<span class="c-nt only-rows">${note}</span>` : ''}
    </div>`;
}

export function viewDays(): string {
  const M = U.dm ?? (dayIds().length ? monthStart(lastDay()) : monthStart(today()));
  const ids = dayIds().filter((id) => monthStart(id) === M).reverse(); const A = agg(ids);
  const head = `<section class="page-head">
      <div><h1 class="kufi h1">الأيام</h1><p class="sub">كل يوم مُدخل من الدفتر. اضغط على يوم لفتحه.</p></div>
      <button type="button" class="btn-gold" data-act="newday"><i aria-hidden="true">+</i>افتح يومًا جديدًا</button>
    </section>
    <div class="days-bar"><div class="pnav"><button type="button" class="arw" data-act="dmove" data-d="-1" aria-label="الشهر السابق">›</button><b>${monthLabel(M)}</b><button type="button" class="arw" data-act="dmove" data-d="1" aria-label="الشهر التالي">‹</button></div>${ids.length ? `<span class="u">${daysW(ids.length)} مُدخلة في هذا الشهر</span>` : ''}</div>`;
  if (!ids.length) return head + `<section class="card empty-big" style="margin-top:12px"><p>لا أيام مُدخلة في ${monthLabel(M)}.</p>${dayIds().length ? '<button type="button" class="btn-ghost btn-sm" data-act="dlast">اذهب إلى آخر شهر فيه أيام</button>' : ''}</section>`;
  return head + `<section class="card" style="margin-top:12px" aria-label="الأيام المُدخلة">
      <div class="lines l-days">
        <div class="lh"><span>اليوم</span><span class="c-r">المبيعات</span><span class="c-r">المشتريات</span><span class="c-r">المصروفات</span><span>مع الدفتر</span><span>صور الدفتر</span></div>
        ${ids.map(dayRow).join('')}
        <div class="lf"><span class="c-d">المجموع (${daysW(ids.length)})</span><span class="c-s c-r"><span class="only-rows">المبيعات </span>${num(money(A.sales))}</span><span class="c-r only-table">${num(money(A.purch))}</span><span class="c-r only-table">${num(money(A.exp))}</span><span class="c-m only-rows">المشتريات ${num(money(A.purch))}، المصروفات ${num(money(A.exp))}</span><span class="only-table"></span><span class="only-table"></span></div>
      </div>
    </section>`;
}

/** الشهر التالي أو السابق في صفحة الأيام. */
export function moveMonth(dir: number): void {
  const t = D(U.dm ?? monthStart(lastDay()));
  t.setUTCMonth(t.getUTCMonth() + dir);
  U.dm = ID(t);
}
