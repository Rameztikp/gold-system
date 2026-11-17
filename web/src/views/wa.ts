/* الواتساب: ملخص اليوم رسالة جاهزة (waText, waDialog). */
import { T, type Day } from '../../../shared/domain';
import { esc, num, money, g2, strip, piecesW, dayLong, dayShort, latin } from '../util';
import { ico } from '../icons';
import { S, APP_NAME, currencyWord, agg, idsIn, periodRange, U } from '../state';
import { dlgHead } from '../ui';

/** الرقم يُحفظ أرقامًا مع رمز الدولة: 0501234567 ← 971501234567. */
export const waNorm = (v: string): string => {
  let s = latin(v).replace(/\D/g, '');
  if (s.startsWith('00')) s = s.slice(2); else if (s.startsWith('0')) s = S.branch.countryCode + s.slice(1);
  return s;
};
export const waFmt = (s: string): string => (s.startsWith('971') && s.length === 12 ? `+971 ${s.slice(3, 5)} ${s.slice(5, 8)} ${s.slice(8)}` : `+${s}`);

const sentAt = (): string => {
  const now = new Date(); let h = now.getHours(); const ap = h < 12 ? 'ص' : 'م'; h = h % 12 || 12;
  return `أُرسل من ${APP_NAME}، ${now.getDate()}/${now.getMonth() + 1} الساعة ${h}:${String(now.getMinutes()).padStart(2, '0')} ${ap}`;
};

export function waText(day: Day): string {
  const t = T(day); const cw = currencyWord();
  const st = day.status === 'ok' ? 'مطابق ✓' : day.status === 'lerr' ? `خطأ في جمع الدفتر. ${day.note || ''}`.trim() : 'لم يُقارن بعد';
  return [
    `*ملخص يوم ${dayLong(day.id)}*`,
    `المبيعات: ${money(t.sales)} ${cw}${t.sn ? ` (${strip(piecesW(t.sn))}، ${g2(t.sw)} جم)` : ''}`,
    `إجمالي الأجور: ${money(t.tot)} ${cw}`,
    `المشتريات: ${money(t.purch)} ${cw}${t.pn ? ` (${g2(t.pw)} جم)` : ''}`,
    `المصروفات: ${money(t.exp)} ${cw}`,
    `مع الدفتر: ${st}`,
    '',
    sentAt(),
  ].join('\n');
}

/** ملخص التقرير للواتساب (بدل «في النظام الحقيقي…» في النموذج). */
export function reportText(): string {
  const R = periodRange(U.rperiod!); const A = agg(idsIn(R.from, R.to)); const cw = currencyWord();
  return [
    `*تقرير ${R.label}*`,
    `المبيعات: ${money(A.sales)} ${cw} (${strip(piecesW(A.sn))}، ${g2(A.sw)} جم)`,
    `إجمالي الأجور: ${money(A.tot)} ${cw}`,
    `المشتريات: ${money(A.purch)} ${cw} (${g2(A.pw)} جم)`,
    `المصروفات: ${money(A.exp)} ${cw}`,
    `أيام مُدخلة: ${A.ids.length}`,
    '',
    sentAt(),
  ].join('\n');
}

export function waDialog(opts: { text: string; title: string; tag: string; toOwner: boolean }): string {
  const n = S.branch.wa || '';
  const url = `https://wa.me/${opts.toOwner && n ? n : ''}?text=${encodeURIComponent(opts.text)}`;
  const note = opts.toOwner
    ? (n ? `يفتح الواتساب على محادثة صاحب المحل (${num(waFmt(n))}) والرسالة مكتوبة. تضغط أنت «إرسال».` : 'رقم صاحب المحل غير محفوظ في الإعدادات، فتختار المحادثة بنفسك بعد فتح الواتساب.')
    : 'يفتح الواتساب والرسالة مكتوبة، وتختار أنت لمن ترسلها.';
  const ls = opts.text.split('\n');
  const body = ls.map((x, i) => (i === 0 ? `<b>${esc(x.replace(/^\*|\*$/g, ''))}</b>` : x === '' ? '<span class="sp"></span>' : i === ls.length - 1 ? `<span class="ft">${esc(x)}</span>` : `<span>${esc(x)}</span>`)).join('');
  return `<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-t">
    ${dlgHead(opts.title, opts.tag)}
    <div class="dlg-note">${note}</div>
    <div class="wa-msg">${body}</div>
    <textarea class="wa-src" hidden>${esc(opts.text)}</textarea>
    <div class="dlg-f"><a class="btn-gold" href="${esc(url)}" target="_blank" rel="noopener" data-act="waopen">${ico('send', 18)} افتح الواتساب</a><button type="button" class="btn-ghost" data-act="wacopy">${ico('copy', 17)} انسخ الرسالة</button></div>
    <p class="u" style="margin:12px 0 0">الرسالة صورة لحظية: إذا عُدّل اليوم بعد الإرسال، لا تتغير الرسالة في الواتساب.</p>
  </div>`;
}

export const dayWaDialog = (id: string, toOwner: boolean): string =>
  waDialog({ text: waText(S.days[id]!), title: toOwner ? 'أرسل الملخص لصاحب المحل' : 'شارك الملخص على الواتساب', tag: dayShort(id), toOwner });
export const reportWaDialog = (): string =>
  waDialog({ text: reportText(), title: 'أرسل التقرير على الواتساب', tag: periodRange(U.rperiod!).label, toOwner: false });
