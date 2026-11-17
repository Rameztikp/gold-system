import { formatAmount, formatWeight, parseDate, todayIn } from '../../shared/domain';
import { state } from './state';
import { T } from '../texts';

export const money = (fils: number): string => formatAmount(fils);
export const moneyCur = (fils: number): string => `${formatAmount(fils)} ${state.settings?.currency ?? ''}`.trim();
export const weight = (cg: number): string => `${formatWeight(cg)} جم`;

const dateFmt = new Intl.DateTimeFormat('ar-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const shortFmt = new Intl.DateTimeFormat('ar-u-nu-latn', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const monthFmt = new Intl.DateTimeFormat('ar-u-nu-latn', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const timeFmt = new Intl.DateTimeFormat('ar-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' });

export const longDate = (d: string): string => dateFmt.format(parseDate(d));
export const shortDate = (d: string): string => shortFmt.format(parseDate(d));
export const monthName = (d: string): string => monthFmt.format(parseDate(d));
export const dateTime = (ms: number): string => timeFmt.format(new Date(ms));

export const today = (): string => todayIn(state.settings?.timezone ?? 'Asia/Dubai');

export const statusText = (s: keyof typeof T.status): string => T.status[s];

/** قيمة الفلس لحقل إدخال: 150000 → "1500.00"، والصفر فارغ. */
export const moneyInput = (fils: number): string => (fils === 0 ? '' : (fils / 100).toFixed(2));
export const grams = (cg: number): string => formatWeight(cg);
