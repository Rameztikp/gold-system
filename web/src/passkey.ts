/* طلب البصمة بشكل يتحمّل الآيفون والآيباد:
   - الطلب يُجهَّز مسبقًا، فالضغطة تفتح نافذة البصمة فورًا (Safari يرفض لو تأخرت بعد الضغطة).
   - لو النافذة انقفلت أو التطبيق راح للخلفية وما رجع رد، الزر يرجع بعد 60 ثانية بدل ما يعلق. */
import { startAuthentication, type AuthenticationResponseJSON, type PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';
import { api } from './api';

interface Ready { path: string; at: number; challengeId: string; options: PublicKeyCredentialRequestOptionsJSON }
let ready: Ready | null = null;
let pending: Promise<void> | null = null;
const FRESH_MS = 2 * 60 * 1000; // الخادم يقبل الطلب 5 دقائق
const WAIT_MS = 60 * 1000;

/** يجهّز الطلب من الحين (يُنادى وقت عرض شاشة الدخول أو القفل). */
export function prepare(path: string): void {
  if ((ready && ready.path === path && Date.now() - ready.at < FRESH_MS) || pending) return;
  pending = api.post<{ challengeId: string; options: PublicKeyCredentialRequestOptionsJSON }>(path)
    .then((r) => { ready = { path, at: Date.now(), ...r }; })
    .catch(() => { ready = null; })
    .finally(() => { pending = null; });
}

async function take(path: string): Promise<Ready> {
  if (pending) await pending;
  const r = ready && ready.path === path && Date.now() - ready.at < FRESH_MS ? ready : null;
  ready = null;
  if (r) return r;
  return { path, at: Date.now(), ...(await api.post<{ challengeId: string; options: PublicKeyCredentialRequestOptionsJSON }>(path)) };
}

export class PasskeyTimeout extends Error { constructor() { super('timeout'); this.name = 'PasskeyTimeout'; } }

/** يفتح نافذة البصمة ويرجّع الرد مع رقم الطلب. */
export async function askPasskey(path: string): Promise<{ challengeId: string; response: AuthenticationResponseJSON }> {
  const r = await take(path);
  let timer = 0;
  const timeout = new Promise<never>((_, no) => { timer = window.setTimeout(() => no(new PasskeyTimeout()), WAIT_MS); });
  try {
    const response = await Promise.race([startAuthentication({ optionsJSON: r.options }), timeout]);
    return { challengeId: r.challengeId, response };
  } finally { window.clearTimeout(timer); }
}

/** رسالة واضحة لما البصمة ما تمشي. */
export function passkeyFailText(e: unknown, onLock: boolean): string {
  const name = e instanceof Error ? e.name : '';
  const way = onLock ? 'اضغط «ادخل برمز استرجاع» تحت.' : 'افتح «ادخل برمز استرجاع» تحت.';
  if (name === 'PasskeyTimeout') return 'ما وصل رد من البصمة. اضغط الزر مرة ثانية.';
  if (name === 'NotAllowedError') return `انلغى التحقق، أو ما في مفتاح مرور لهذا النظام على هذا الجهاز. جرّب مرة ثانية، وإذا ما ظهر اسمك ${way}`;
  return 'ما تم التحقق بالبصمة. جرّب مرة ثانية.';
}
