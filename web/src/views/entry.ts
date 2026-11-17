/* الإدخال: يوم واحد بأربع خطوات (viewEntry, dayHead, stepNav, stepSales/Purch/Exp/Check). */
import { T, W, hasVal, CMP_ROWS, isW, type Day, type AnyLine } from '../../../shared/domain';
import { esc, num, money, pr, g2, linesW, dayLong, dayMid } from '../util';
import { ico } from '../icons';
import { S, U, STEPS, dayIds, lastDay, type Step } from '../state';
import { photosBtn, statusPill } from '../ui';

export function viewEntry(): string {
  if (!dayIds().length) return `<section class="card empty-big"><p>لا أيام بعد.</p><button type="button" class="btn-gold" data-act="newday"><i aria-hidden="true">+</i>افتح أول يوم</button></section>`;
  if (!U.day || !S.days[U.day]) U.day = lastDay();
  const day = S.days[U.day]!; const step: Step = STEPS.some((s) => s[0] === U.step) ? U.step : 'sales';
  const view = { sales: stepSales, purch: stepPurch, exp: stepExp, check: stepCheck }[step];
  const back = U.fromSearch ? `<button type="button" class="btn-text back-s" data-act="go" data-r="search">› رجوع لنتائج البحث عن «${esc(U.q || '')}»</button>` : '';
  return back + dayHead(day) + stepNav(day, step) + view(day);
}

function dayHead(day: Day): string {
  const ids = dayIds(); const i = ids.indexOf(day.id); const prev = ids[i - 1]; const next = ids[i + 1];
  // قلم صغير جنب كل سعر: السعر المكتوب غلط يتصلّح، والتصليح في السجل
  const pen = (f: string): string => `<button type="button" class="pen" data-act="prices" data-f="${f}" aria-label="تعديل السعر" title="تعديل السعر">${ico('edit', 14)}</button>`;
  const fact = (k: string, v: string): string => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
  return `<section class="dayhead" aria-label="اليوم">
    <div class="dh-date">
      <button type="button" class="arw" data-act="dayto" data-id="${prev ?? ''}" aria-label="اليوم السابق"${prev ? '' : ' disabled'}>›</button>
      <h1 class="kufi">${dayLong(day.id)}</h1>
      <button type="button" class="arw" data-act="dayto" data-id="${next ?? ''}" aria-label="اليوم التالي"${next ? '' : ' disabled'}>‹</button>
    </div>
    <dl class="dh-facts">
      ${fact('سعر البيع', (hasVal(day.sell) ? num(pr(day.sell)) : '<span class="dim">—</span>') + pen('sell'))}
      ${fact('سعر الشراء', num(pr(day.buy)) + pen('buy'))}
      ${fact('العمولة', hasVal(day.comm) ? num(money(day.comm)) : '<span class="dim">—</span>')}
    </dl>
    <div class="dh-end">${statusPill(day)}${photosBtn(day)}${commBtn(day)}</div>
  </section>`;
}

function stepNav(day: Day, step: Step): string {
  const t = T(day);
  const val: Record<Step, string> = { sales: num(money(t.sales)), purch: num(money(t.purch)), exp: num(money(t.exp)), check: day.status === 'ok' ? 'مطابق' : day.status === 'lerr' ? 'خطأ في جمع الدفتر' : 'لم تتم بعد' };
  return `<nav class="steps" aria-label="خطوات إدخال اليوم">${STEPS.map(([k, name], i) => {
    let sn = `<span class="sn">${i + 1}</span>`;
    if (k === 'check' && day.status === 'ok') sn = `<span class="sn ok" aria-hidden="true">${ico('check', 16)}</span>`;
    if (k === 'check' && day.status === 'lerr') sn = '<span class="sn lerr" aria-hidden="true">!</span>';
    return `<button type="button"${U.flash === k ? ' class="flash"' : ''} data-act="step" data-s="${k}"${k === step ? ' aria-current="step"' : ''}>${sn}<span class="st-t"><b>${name}</b><span>${val[k]}</span></span></button>`;
  }).join('')}</nav>`;
}

const stepHead = (title: string, hint: string, acts: string): string => `<div class="step-head"><div><h2 class="kufi">${title}</h2>${hint ? `<p class="sub">${hint}</p>` : ''}</div>${acts ? `<div class="acts">${acts}</div>` : ''}</div>`;
// زر العمولة: «أضف» لين تنحفظ عمولة اليوم، وبعدها «تعديل»
export const commLabel = (d: Day): string => (hasVal(d.comm) ? 'تعديل العمولة' : 'أضف العمولة');
export const commBtn = (d: Day, cls = 'btn-text'): string => `<button type="button" class="${cls}" data-act="daydata">${ico(hasVal(d.comm) ? 'edit' : 'plus', 15)} ${commLabel(d)}</button>`;
const addBtn = (act: string, label: string): string => `<button type="button" class="btn-gold" data-act="${act}"><i aria-hidden="true">+</i>${label}</button>`;
const nextBtn = (s: Step, label: string): string => `<div class="step-next"><button type="button" class="btn-ghost" data-act="step" data-s="${s}" data-top="1">التالي: ${label}</button></div>`;
const xNote = (l: AnyLine): string => (l.x ? `<span class="xr">ملغى: ${esc(l.x.r)}</span>` : '');
const rowCls = (l: AnyLine): string => `ln${l.x ? ' is-x' : ''}${U.hl === l.id ? ' is-new' : ''}`;
const emptyRow = (msg: string): string => `<div class="empty">${msg}</div>`;
const wCell = (w: number | null): string => (w === null ? '<span class="dim">بلا وزن</span>' : `${num(g2(w))} <span class="u">جم</span>`);

function stepSales(day: Day): string {
  const t = T(day);
  const rows = day.sales.map((l, i) => `<button type="button" class="${rowCls(l)}" data-act="line" data-sec="sales" data-id="${l.id}">
      <span class="c-n">${num(i + 1)}</span>
      <span class="c-p c-r">${num(money(l.p))}</span>
      <span class="c-w">${wCell(W(l.g, l.m))}</span>
      <span class="c-d">${esc(l.d)}${xNote(l)}</span>
      <span class="c-mk c-r">${l.mk ? num(money(l.mk)) : ''}</span>
      <span class="c-k">${l.k ? `<span class="chipk">${num(esc(l.k))}</span>` : ''}</span>
    </button>`).join('') || emptyRow('لا سطور بعد. اضغط «أضف بيعًا» وابدأ من أول سطر في صفحة المبيعات.');
  const xl = esc(day.xl || 'بند إضافي');
  const extra = day.x ? ` + ${xl} ${num(money(day.x))}` : '';
  return stepHead('المبيعات', 'انقل كل سطر من صفحة المبيعات في الدفتر. لتعديل سطر، اضغط عليه.', addBtn('add-sales', 'أضف بيعًا'))
    + `<section class="card" aria-label="سطور المبيعات"><div class="lines l-sales">
        <div class="lh"><span>#</span><span class="c-r">السعر</span><span>الوزن</span><span>البيان</span><span class="c-r">الأجور</span><span>العيار</span></div>
        ${rows}
        <div class="lf"><span class="c-n"></span><span class="c-p c-r">${num(money(t.sales))}</span><span class="c-w">${num(g2(t.sw))} جم</span><span class="c-d">المجموع (${linesW(t.sn)})</span><span class="c-mk c-r">${num(money(t.mk))}</span><span class="c-k"></span></div>
      </div></section>
      <div class="sumbox"><div class="sb-f">الأجور ${num(money(t.mk))} + العمولة ${num(money(t.comm))}${extra}<small>العمولة${day.x ? ` و${xl}` : ''} من الأجور، وتُجمع معها في إجمالي الأجور.</small></div><div class="sb-v">إجمالي الأجور <b class="num">${money(t.tot)}</b></div>${commBtn(day)}</div>`
    + nextBtn('purch', 'المشتريات');
}

function stepPurch(day: Day): string {
  const t = T(day);
  const rows = day.purch.map((l, i) => `<button type="button" class="${rowCls(l)}" data-act="line" data-sec="purch" data-id="${l.id}">
      <span class="c-n">${num(i + 1)}</span>
      <span class="c-p c-r">${num(money(l.a))}</span>
      <span class="c-w">${wCell(W(l.g, l.m))}</span>
      <span class="c-d">${l.t === 'جديد' ? '<span class="chipk new">جديد</span> ' : ''}${esc(l.d)}${xNote(l)}</span>
    </button>`).join('') || emptyRow('لا سطور بعد. اضغط «أضف شراءً».');
  const split = t.pj ? `<span class="u">كسر ${num(g2(t.pkw))} جم، جديد ${num(g2(t.pjw))} جم</span>` : '';
  return stepHead('المشتريات', `سعر الشراء اليوم ${num(pr(day.buy))}${hasVal(day.sell) ? `، وسعر البيع ${num(pr(day.sell))}` : ''}.`, addBtn('add-purch', 'أضف شراءً'))
    + `<div class="note">من صفحة الخرج: أدخل المشتريات فقط، كسرًا كانت أو ذهبًا جديدًا، بوزنها ومبلغها. لا تُدخل الشبكة، ولا أي شيء مكتوب بالأحمر.</div>
      <section class="card" style="margin-top:12px" aria-label="سطور المشتريات"><div class="lines l-purch">
        <div class="lh"><span>#</span><span class="c-r">المبلغ</span><span>الوزن</span><span>البيان</span></div>
        ${rows}
        <div class="lf"><span class="c-n"></span><span class="c-p c-r">${num(money(t.purch))}</span><span class="c-w">${num(g2(t.pw))} جم</span><span class="c-d">المجموع (${linesW(t.pn)})${split}</span></div>
      </div></section>`
    + nextBtn('exp', 'المصروفات');
}

function stepExp(day: Day): string {
  const t = T(day);
  const rows = day.exp.map((l, i) => `<button type="button" class="${rowCls(l)}" data-act="line" data-sec="exp" data-id="${l.id}">
      <span class="c-n">${num(i + 1)}</span><span class="c-p c-r">${num(money(l.a))}</span><span class="c-d">${esc(l.d)}${xNote(l)}</span><span class="c-c"><span class="chipk">${esc(l.c)}</span></span><span class="c-e">${l.emp ? esc(l.emp) : '<span class="dim only-table">—</span>'}</span>
    </button>`).join('') || emptyRow('لا مصروفات في هذا اليوم.');
  return stepHead('المصروفات', 'لتعديل سطر، اضغط عليه.', addBtn('add-exp', 'أضف مصروفًا'))
    + `<div class="note"><span class="redmark" aria-hidden="true"></span><span>أدخل فقط المصروفات المعلَّمة بدائرة حمراء في الدفتر. ولو المصروف لموظف، اختر اسمه.</span></div>
      <section class="card" style="margin-top:12px" aria-label="المصروفات"><div class="lines l-exp">
        <div class="lh"><span>#</span><span class="c-r">المبلغ</span><span>البيان</span><span>النوع</span><span>الموظف</span></div>${rows}
        <div class="lf"><span class="c-n"></span><span class="c-p c-r">${num(money(t.exp))}</span><span class="c-d">المجموع (${linesW(t.en)})</span><span class="only-table"></span><span class="only-table"></span></div>
      </div></section>`
    + nextBtn('check', 'المقارنة بالدفتر');
}

function stepCheck(day: Day): string {
  const t = T(day); const L = day.ledger || {};
  const rows = CMP_ROWS.map(([k, label, where]) => `<tr data-row="${k}">
      <td><b>${label}</b><span class="u">${where}</span></td>
      <td><input class="in num" id="cmp-${k}" name="${k}" inputmode="decimal" aria-label="${label} في الدفتر" value="${hasVal(L[k]) ? L[k] : ''}"></td>
      <td class="c-r">${isW(k) ? `${num(g2(t[k]))} جم` : num(money(t[k]))}</td>
      <td data-res></td>
    </tr>`).join('');
  // كل يوم في الدفتر له عمولة، فالفارغة هنا غالبًا منسية
  const remind = hasVal(day.comm) ? '' : `<div class="done-box lerr remind"><span class="done-ic" aria-hidden="true">!</span><div><b>لم تُكتب العمولة لهذا اليوم.</b><p class="sub">إجمالي الأجور يعتمد عليها. إذا كانت في الدفتر عمولة، أضفها قبل المقارنة.</p></div>${commBtn(day, 'btn-ghost btn-sm')}</div>`;
  return stepHead('المقارنة بالدفتر', 'اكتب كل مجموع كما هو في الدفتر. الخانة الفارغة لا تُقارن.', '')
    + remind + doneBox(day)
    + `<form class="card cmp-card" data-form="compare" data-live="1" autocomplete="off" novalidate>
        <div class="tscroll"><table class="cmp"><thead><tr><th>البند</th><th>في الدفتر</th><th class="c-r">في النظام</th><th>النتيجة</th></tr></thead><tbody>${rows}</tbody></table></div>
        <div class="cmp-out"><div data-out="verdict"></div><div class="dlg-f" data-out="acts"></div></div>
      </form>`;
}

function doneBox(day: Day): string {
  const ids = dayIds(); const next = ids[ids.indexOf(day.id) + 1];
  const btn = next
    ? `<button type="button" class="btn-ghost" data-act="dayto" data-id="${next}" data-s="sales">افتح ${dayMid(next)}</button>`
    : '<button type="button" class="btn-gold" data-act="newday">افتح اليوم التالي</button>';
  // بعد المقارنة الأرقام نهائية: مدخل البيانات يرسل ملخص اليوم لصاحب المحل على الواتساب
  const clerk = U.user === 'clerk';
  const wa = `<button type="button" class="btn-ghost" data-act="wa" data-id="${day.id}"${clerk ? ' data-to="owner"' : ''}>${ico('chat', 18)} ${clerk ? 'أرسل الملخص لصاحب المحل' : 'شارك الملخص على الواتساب'}</button>`;
  if (day.status === 'ok') return `<div class="done-box"><span class="done-ic">${ico('check', 22)}</span><div><b>هذا اليوم مطابق للدفتر.</b><p class="sub">${next ? 'انتقل إلى اليوم التالي.' : 'هذا آخر يوم مُدخل.'}</p></div><div class="done-acts">${wa}${btn}</div></div>`;
  if (day.status === 'lerr') return `<div class="done-box lerr"><span class="done-ic" aria-hidden="true">!</span><div><b>حُفظ مع ملاحظة: خطأ في جمع الدفتر.</b><p class="sub">${esc(day.note)}</p></div><div class="done-acts">${wa}${btn}</div></div>`;
  return '';
}
