/* نوافذ الإدخال (lineDialog, dayDataDialog, newDayDialog, pricesDialog). */
import { T, W, hasVal, type AnyLine, type Day, type SaleLine, type PurchLine, type ExpLine, type Sec } from '../../../shared/domain';
import { esc, num, money, pr, g2, add, dayLong, dayShort, KARATS, NO_EMP } from '../util';
import { ico } from '../icons';
import { S, U, lastDay, today, dayIds } from '../state';
import { dlgHead } from '../ui';
import { commLabel } from './entry';

export const chipsHtml = (o: { name: string; opts: readonly string[]; sel: string | string[]; multi: boolean }): string =>
  `<div class="chips" data-chips="${o.name}" data-multi="${o.multi ? 1 : 0}" role="group">${o.opts.map((v) => `<button type="button" class="chip" data-act="chip" data-v="${esc(v)}" aria-pressed="${o.multi ? (o.sel as string[]).includes(v) : o.sel === v}">${esc(v)}</button>`).join('')}</div><input type="hidden" name="${o.name}" value="${esc(o.multi ? (o.sel as string[]).join(' + ') : o.sel)}">`;

const weightHtml = (g: number | string | null, m: string): string => `<div class="wt"><div class="cell"><span>جرام</span><input class="in num" id="f-g" name="g" inputmode="decimal" value="${hasVal(g) ? g : ''}" aria-label="جرام"></div><span class="bar" aria-hidden="true">|</span><div class="cell"><span>ملي</span><input class="in num" id="f-m" name="m" inputmode="numeric" maxlength="2" value="${esc(m ?? '')}" aria-label="ملي"></div><output class="wv" data-out="w">= ${num(g2(W(g, m) || 0))} جم</output></div>`;

export function lastLineNote(day: Day, sec: Sec): string {
  const arr = day[sec] as AnyLine[]; const l = arr[arr.length - 1]; if (!l) return '';
  if (sec === 'sales') return `آخر سطر محفوظ: ${esc(l.d)}، ${num(money((l as SaleLine).p))}`;
  if (sec === 'purch') { const p = l as PurchLine; return `آخر سطر محفوظ: ${esc(p.d)}، ${num(g2(W(p.g, p.m) || 0))} جم، ${num(money(p.a))}`; }
  return `آخر سطر محفوظ: ${esc(l.d)}، ${num(money((l as ExpLine).a))}`;
}

// البيان مع اقتراحات من سطور المحل السابقة (القائمة تنفتح تحت الخانة أثناء الكتابة)
const descField = (d: string): string => `<div class="sugw"><label class="lb" for="f-d">البيان</label><input class="in" id="f-d" name="d" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="sug-list" value="${esc(d)}"><div class="sug" id="sug-list" role="listbox" aria-label="من السطور السابقة" hidden></div></div>`;
const weightLabel = '<div class="lb">الوزن <span class="opt">(جرام | ملي كما في الدفتر، أو بنقطة مثل 6.25)</span></div>';
const amountField = (name: string, label: string, v: unknown): string => `<div><label class="lb" for="f-${name}">${label}</label><input class="in num" id="f-${name}" name="${name}" inputmode="decimal" value="${hasVal(v) ? v : ''}" autofocus></div>`;

function salesFields(l: SaleLine | null): string {
  const ks = l ? (l.k ? l.k.split(' + ') : []) : ['21'];
  return `${amountField('p', 'السعر', l?.p)}
      <div>${weightLabel}${weightHtml(l?.g ?? '', l?.m ?? '')}</div>
      ${descField(l?.d ?? '')}
      <div class="two"><div><label class="lb" for="f-mk">الأجور <span class="opt">(اختياري)</span></label><input class="in num" id="f-mk" name="mk" inputmode="decimal" value="${l && hasVal(l.mk) ? l.mk : ''}"></div><div><div class="lb">العيار <span class="opt">(واحد أو أكثر)</span></div>${chipsHtml({ name: 'k', opts: KARATS, sel: ks, multi: true })}</div></div>
      <div class="live">القطعة بلا وزن (مثل محبس ألماس): اترك الوزن فارغًا.</div>`;
}
function purchFields(l: PurchLine | null): string {
  return `${amountField('a', 'المبلغ', l?.a)}
      <div>${weightLabel}${weightHtml(l?.g ?? '', l?.m ?? '')}</div>
      <div class="live" data-out="ppg"></div>
      ${descField(l?.d ?? '')}
      <div><div class="lb">نوع الشراء</div>${chipsHtml({ name: 't', opts: ['كسر', 'جديد'], sel: l ? (l.t || 'كسر') : 'كسر', multi: false })}</div>`;
}
function expFields(l: ExpLine | null): string {
  return `${amountField('a', 'المبلغ', l?.a)}
      ${descField(l?.d ?? '')}
      <div><div class="lb">النوع <span class="opt auto" data-out="cauto"></span></div>${chipsHtml({ name: 'c', opts: S.branch.cats, sel: l ? l.c : (S.branch.cats[0] ?? 'أخرى'), multi: false })}</div>
      <div><div class="lb">الموظف <span class="opt">(اختياري، إذا كان المصروف لموظف)</span></div>${chipsHtml({ name: 'emp', opts: [NO_EMP, ...S.branch.names], sel: l && l.emp ? l.emp : NO_EMP, multi: false })}<input class="in" id="f-nn" name="nn" data-skip="1" aria-label="اسم موظف جديد" placeholder="أو اكتب اسمًا جديدًا" style="margin-top:8px;height:46px;font-size:15px" autocomplete="off"></div>`;
}

const TITLES: Record<Sec, [string, string]> = { sales: ['بيع جديد', 'تعديل سطر البيع'], purch: ['شراء جديد', 'تعديل سطر الشراء'], exp: ['مصروف جديد', 'تعديل سطر المصروف'] };

/** النافذة تتبع الدفتر من اليمين: السعر، الوزن، البيان، الأجور والعيار (بيع)؛ المبلغ، الوزن، البيان (شراء)؛ المبلغ، البيان (مصروف). */
export function lineDialog(sec: Sec, l: AnyLine | null): string {
  const day = S.days[U.day!]!; const arr = day[sec] as AnyLine[]; const edit = !!l; const no = edit ? arr.indexOf(l) + 1 : arr.length + 1;
  const title = edit ? `${TITLES[sec][1]} ${num(no)}` : TITLES[sec][0];
  const fields = sec === 'sales' ? salesFields(l as SaleLine | null) : sec === 'purch' ? purchFields(l as PurchLine | null) : expFields(l as ExpLine | null);
  const xz = l ? (l.x
    ? `<div class="xzone"><span>هذا السطر ملغى: ${esc(l.x.r)}</span><button type="button" class="btn-ghost btn-sm" data-act="unx">${ico('undo', 15)} أرجع السطر</button></div>`
    : '<div class="xzone" data-x-zone><span>الإلغاء لا يحذف السطر: يبقى ظاهرًا باهتًا مع السبب.</span><button type="button" class="btn-danger" data-act="xask">ألغِ السطر</button></div>') : '';
  const last = !edit ? lastLineNote(day, sec) : '';
  return `<form class="dialog" data-form="line" data-sec="${sec}" data-id="${edit ? l.id : ''}" role="dialog" aria-modal="true" aria-labelledby="dlg-t" autocomplete="off" novalidate>
    ${dlgHead(title, `${dayShort(day.id)}، السطر ${num(no)}`)}
    ${last ? `<div class="dlg-note" data-out="last">${last}</div>` : ''}
    <div class="fgrid">${fields}<p class="err" data-out="err" hidden></p></div>
    <div class="dup" data-out="dup" role="alert" hidden></div>
    <div class="dlg-f"><button class="btn-gold" type="submit">${edit ? 'احفظ التعديل' : 'احفظ وأضف التالي <span class="kbd">Enter</span>'}</button><button type="button" class="btn-ghost" data-act="close">${edit ? 'تراجع' : 'إغلاق <span class="kbd">Esc</span>'}</button></div>
    ${edit ? '<div class="u" style="margin-top:8px">يُحفظ في السجل من عدّل ومتى، والقيمة قبل وبعد.</div>' : '<div class="dlg-hint">Enter ينقلك إلى الخانة التالية، وفي آخر خانة يحفظ السطر.</div>'}
    ${xz}
  </form>`;
}

export function dayDataDialog(): string {
  const d = S.days[U.day!]!; const t = T(d);
  return `<form class="dialog" data-form="daydata" role="dialog" aria-modal="true" aria-labelledby="dlg-t" autocomplete="off" novalidate>
    ${dlgHead(commLabel(d), dayShort(d.id))}
    <div class="dlg-note">الخانات التي ليست سطورًا في الدفتر.</div>
    <div class="fgrid">
      <div class="three"><div><label class="lb" for="dd-cm">العمولة <span class="opt">(من الأجور)</span></label><input class="in num" id="dd-cm" name="comm" inputmode="decimal" value="${hasVal(d.comm) ? d.comm : ''}"></div>
      <div><label class="lb" for="dd-xl">بند إضافي من الأجور <span class="opt">(اسمه)</span></label><input class="in" id="dd-xl" name="xl" value="${esc(d.xl)}" placeholder="مثل: حساب كسر"></div>
      <div><label class="lb" for="dd-x">مبلغه</label><input class="in num" id="dd-x" name="x" inputmode="decimal" value="${hasVal(d.x) ? d.x : ''}"></div></div>
      <div class="verdict" data-out="tot" data-mk="${t.mk}"></div>
      <p class="err" data-out="err" hidden></p>
    </div>
    <div class="dlg-f"><button class="btn-gold" type="submit">احفظ</button><button type="button" class="btn-ghost" data-act="close">إلغاء</button></div>
  </form>`;
}

export function newDayDialog(): string {
  const next = dayIds().length ? add(lastDay(), 1) : today(); const last = S.days[lastDay()];
  return `<form class="dialog" data-form="newday" role="dialog" aria-modal="true" aria-labelledby="dlg-t" autocomplete="off" novalidate>
    ${dlgHead('افتح يومًا جديدًا')}
    <div class="dlg-note">من أول صفحة المبيعات بالدفتر.</div>
    <div class="fgrid">
      <div><label class="lb" for="nd-date">التاريخ</label><input class="in" type="date" id="nd-date" name="date" value="${next}"><div class="u" style="margin-top:6px" data-out="dlabel">${dayLong(next)}</div></div>
      <div class="two">
        <div><label class="lb" for="nd-buy">سعر الشراء <span class="opt">(عمود «سعر الذهب»)</span></label><input class="in num" id="nd-buy" name="buy" inputmode="decimal" placeholder="${last ? `مثل ${esc(pr(last.buy))}` : ''}" autofocus></div>
        <div><label class="lb" for="nd-sell">سعر البيع <span class="opt">(اختياري)</span></label><input class="in num" id="nd-sell" name="sell" inputmode="decimal"></div>
      </div>
      <div><div class="lb">صور صفحات اليوم <span class="opt">(اختياري، وتقدر تضيفها بعدين)</span></div>
        <label class="ph-drop" data-drop="newday">${ico('image', 20)}<span>اختر الصور من جهازك، أو اسحبها هنا</span><input type="file" accept="image/*" multiple data-photo-in="newday" hidden></label>
        <div class="ph-mini" data-out="ndph"></div></div>
      <p class="err" data-out="err" hidden></p>
    </div>
    <div class="dlg-f"><button class="btn-gold" type="submit">افتح اليوم</button><button type="button" class="btn-ghost" data-act="close">إلغاء</button></div>
  </form>`;
}

export function pricesDialog(focus: string | undefined): string {
  const d = S.days[U.day!]!;
  return `<form class="dialog" data-form="prices" role="dialog" aria-modal="true" aria-labelledby="dlg-t" autocomplete="off" novalidate>
    ${dlgHead('تعديل السعر', dayShort(d.id))}
    <div class="dlg-note">يُسجَّل التعديل في سجل التعديلات: من عدّل ومتى، والسعر قبل وبعد.</div>
    <div class="fgrid"><div class="two">
      <div><label class="lb" for="pe-buy">سعر الشراء <span class="opt">(عمود «سعر الذهب»)</span></label><input class="in num" id="pe-buy" name="buy" inputmode="decimal" value="${esc(d.buy)}"${focus !== 'sell' ? ' autofocus' : ''}></div>
      <div><label class="lb" for="pe-sell">سعر البيع <span class="opt">(اختياري)</span></label><input class="in num" id="pe-sell" name="sell" inputmode="decimal" value="${hasVal(d.sell) ? esc(d.sell) : ''}"${focus === 'sell' ? ' autofocus' : ''}></div>
    </div><p class="err" data-out="err" hidden></p></div>
    <div class="dlg-f"><button class="btn-gold" type="submit">احفظ</button><button type="button" class="btn-ghost" data-act="close">إلغاء</button></div>
  </form>`;
}
