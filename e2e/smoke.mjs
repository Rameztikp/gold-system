// تجربة كاملة في المتصفح بشكل النموذج: إعداد، بصمة (افتراضية)، يوم 2 أكتوبر كامل من الدفتر عبر النوافذ،
// المقارنة بالدفتر، الإلغاء والإرجاع، التكرار، البحث، التقارير، اللوحة، الجوال، الخروج والدخول.
// التشغيل: node e2e/smoke.mjs http://localhost:8787 <مجلد الصور>
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
// يرجّع آخر نشاط للجلسات للماضي (قاعدة البيانات المحلية للتجربة) كأن الجهاز تُرك
const idle = (min) => execSync(`npx wrangler d1 execute gold-db --local --persist-to ${process.env.WSTATE ?? '/tmp/wstate'} --command "UPDATE sessions SET last_active = ${Date.now() - min * 60000}"`, { stdio: 'ignore' });

const BASE = process.argv[2] ?? 'http://localhost:8787';
const SHOTS = process.argv[3] ?? '/tmp/shots';
const DAY = JSON.parse(readFileSync(new URL('../prototype/data.json', import.meta.url), 'utf8')).find((d) => d.id === '2026-10-02');
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome' });
const ctx = await browser.newContext({ locale: 'ar', viewport: { width: 1360, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' && !/40[19]|423|ERR_INTERNET_DISCONNECTED/.test(m.text())) errors.push(m.text()); });
page.on('pageerror', (e) => { console.log('PAGEERROR', String(e)); errors.push(String(e)); });
const cdp = await ctx.newCDPSession(page);
await cdp.send('WebAuthn.enable');
await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true } });
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true });
const step = (s) => console.log('✓', s);
const M = '#modal-root';
const fill = async (name, v) => { if (v !== null && v !== undefined && v !== '') await page.fill(`${M} [name="${name}"]`, String(v)); };
const saveLine = async () => {
  const n = await page.evaluate(() => document.querySelectorAll('.lines .ln').length);
  await page.click(`${M} button[type=submit]`);
  // السطر يظهر على طول؛ لو طلع خطأ أو سؤال التكرار نعرف فورًا بدل ما يضيع بصمت
  await page.waitForFunction((n0) => document.querySelectorAll('.lines .ln').length > n0
    || !document.querySelector('#modal-root [data-out=err]')?.hidden || !document.querySelector('#modal-root [data-out=dup]')?.hidden, n);
  const err = await page.evaluate(() => { const e = document.querySelector('#modal-root [data-out=err]'); return e && !e.hidden ? e.textContent : ''; });
  if (err) throw new Error('السطر ما انحفظ: ' + err);
};

async function setKarats(k) {
  await page.waitForSelector(`${M} .sug`, { state: 'hidden' }).catch(() => {});
  const want = k ? k.split(' + ') : [];
  for (const c of ['24', '22', '21', '18']) {
    const b = page.locator(`${M} [data-chips="k"] .chip[data-v="${c}"]`);
    if ((await b.getAttribute('aria-pressed') === 'true') !== want.includes(c)) await b.click();
  }
}

await page.goto(BASE);
await page.fill('[name=token]', 'local-setup-token-123456');
await page.fill('[name=ownerName]', 'يوسف العمراني');
await page.fill('[name=username]', 'yousef12');
await page.click('form[data-form=setup] button[type=submit]');
await page.click('[data-act=addkey]');
await page.waitForSelector('.shell');
step('الإعداد ومفتاح المرور ثم الدخول');

await page.click('.side [data-r=users]');
await page.click('[data-act=adduser]');
await page.waitForTimeout(150);
await page.type(`${M} [name=name]`, 'مدخل2 البيانات!'); await page.type(`${M} [name=username]`, 'Clerk 1#');
if (await page.inputValue(`${M} [name=name]`) !== 'مدخل البيانات' || await page.inputValue(`${M} [name=username]`) !== 'clerk1') throw new Error('خانة الاسم قبلت أرقام'); await fill('password', 'password-123456');
await page.click(`${M} button[type=submit]`);
await page.waitForSelector('text=clerk1');
await page.click('[data-act=codes]');
await page.waitForSelector(`${M} [data-act=copycodes]`);
await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
await page.click(`${M} [data-act=copycodes]`);
const copied = await page.evaluate(() => navigator.clipboard.readText());
if (copied.split('\n').length !== 10) throw new Error('نسخ الرموز: ' + copied);
await page.click(`${M} .dlg-h [data-act=close]`);
await shot('01-users');
step('الخانات: الاسم حروف بس والسعر أرقام بس'); step('إضافة مدخل بيانات، ورموز الاسترجاع مع زر النسخ (10 رموز)');

await page.click('.side [data-r=days]');
await page.click('[data-act=newday]');
await page.waitForTimeout(150);
await page.fill(`${M} [name=date]`, DAY.id);
await page.type(`${M} [name=buy]`, 'ab4x2.5.0');
if (await page.inputValue(`${M} [name=buy]`) !== '42.50') throw new Error('خانة السعر قبلت حروف: ' + await page.inputValue(`${M} [name=buy]`));
await page.fill(`${M} [name=buy]`, String(DAY.gold));
await page.click(`${M} button[type=submit]`);
await page.waitForSelector(`${M} form[data-sec=sales]`);
for (const l of DAY.sales) {
  await fill('p', l.p); await fill('g', l.g); await fill('m', l.m); await fill('d', l.d); await page.fill(`${M} [name=mk]`, l.mk === null ? '' : String(l.mk));
  await setKarats(l.k || '');
  await saveLine();
  if (await page.locator(`${M} [data-out=dup]:not([hidden])`).count()) { await page.click(`${M} [data-act=dupok]`); await page.waitForTimeout(300); }
}
await page.click(`${M} .dlg-h [data-act=close]`);
step(`إدخال ${DAY.sales.length} سطر بيع عبر النافذة`);

await page.click('[data-act=step][data-s=purch]');
await page.click('[data-act="add-purch"]');
await page.waitForTimeout(150);
for (const l of DAY.purch) { await fill('a', l.a); await fill('g', l.g); await fill('m', l.m); await fill('d', l.d); await saveLine(); }
await page.click(`${M} .dlg-h [data-act=close]`);
await page.click('[data-act=step][data-s=exp]');
await page.click('[data-act="add-exp"]');
await page.waitForTimeout(150);
for (const l of [...DAY.exp, ...DAY.wd.map((w) => ({ d: w.n === 'محمد' ? 'مصاريف محمد' : w.n, c: 'للموظفين', a: w.a, emp: w.n }))]) {
  await fill('a', l.a); await fill('d', l.d);
  await page.click(`${M} [data-chips=c] .chip[data-v="${l.c}"]`);
  if (l.emp) await fill('nn', l.emp);
  await saveLine();
}
await page.click(`${M} .dlg-h [data-act=close]`);
step('المشتريات والمصروفات');

await page.click('.dh-end [data-act=daydata]');
await fill('comm', DAY.comm);
await page.click(`${M} button[type=submit]`);
await page.waitForSelector(`${M} form`, { state: 'detached' });
await page.click('[data-act=step][data-s=check]');
for (const [k, v] of Object.entries(DAY.ledger)) await page.fill(`form[data-form=compare] [name=${k}]`, String(v));
await page.waitForSelector('[data-act=cmpok]', { timeout: 8000 }).catch(async (e) => { await shot('dbg-cmp'); console.log('DBG', JSON.stringify(await page.evaluate(async (id) => { const srv = await (await fetch(`/api/days/${id}`)).json(); return { srv: [srv.sales.length, srv.purch.length, srv.exp.length], ui: [...document.querySelectorAll('.lines .ln')].length, q: localStorage.length, txt: document.querySelector('form[data-form=compare]')?.innerText.slice(0, 900) }; }, DAY.id))); throw e; });
await shot('02-compare');
await page.click('[data-act=cmpok]');
await page.waitForSelector('.dayhead .pill.ok');
step('المقارنة بالدفتر: كل البنود الستة مطابقة → مطابق للدفتر');

await page.click('[data-act=step][data-s=sales]');
await page.click('.l-sales .ln >> nth=0');
await page.click(`${M} [data-act=xask]`);
await page.fill(`${M} [name=xr]`, 'تجربة الإلغاء');
await page.click(`${M} [data-act=xdo]`);
await page.waitForSelector('.l-sales .ln.is-x');
if (!(await page.locator('.dayhead .pill.wait').count())) throw new Error('الإلغاء ما أعاد فتح اليوم');
await page.click('.l-sales .ln.is-x');
await page.click(`${M} [data-act=unx]`);
await page.waitForSelector('.l-sales .ln.is-x', { state: 'detached' });
step('إلغاء سطر بسبب ثم إرجاعه (واليوم رجع «لم يُقارن»)');

await page.click('[data-act="add-sales"]');
await page.waitForTimeout(150);
const last = DAY.sales[DAY.sales.length - 1];
await fill('p', last.p); await fill('g', last.g); await fill('m', last.m); await fill('d', last.d); await fill('mk', last.mk); await setKarats(last.k || '');
await page.click(`${M} button[type=submit]`);
await page.waitForSelector(`${M} [data-out=dup]:not([hidden])`, { timeout: 8000 }).catch(async (e) => { await shot('dbg-dup'); console.log('DBG', await page.evaluate(() => ({ modal: document.querySelector('#modal-root')?.innerText.slice(0, 600), toast: document.querySelector('.toast, #toast')?.innerText }))); throw e; });
await page.click(`${M} [data-act=dupno]`);
await page.click(`${M} .dlg-h [data-act=close]`);
step('سؤال السطر المكرر');

await page.click('.side [data-r=search]');
await page.fill('#q', 'ضيافة');
await page.waitForSelector('.sr');
step('البحث');
await page.click('.side [data-r=reports]');
await page.waitForSelector('.paper');
await shot('03-reports');
await page.click('.side [data-r=dash]');
await page.waitForSelector('.tiles');
const sales = await page.textContent('#tile-sales .tv');
if (!sales.includes('87,260')) throw new Error('مبيعات اللوحة: ' + sales);
await shot('04-dash-dark');
await page.click('.side-foot [data-act=theme]');
await shot('05-dash-light');
await page.click('.side-foot [data-act=theme]');
step('اللوحة (مبيعات 87,260.00) والثيمان');
if (!(await page.locator('.dash-head [data-k=day][aria-selected=true]').count())) throw new Error('اللوحة ما فتحت على اليوم');
await page.click('.dash-head [data-k=month]');
const cover = await page.textContent('.dash-head .cover');
if (!/من يوم واحد مُدخلة بس، من أصل 31/.test(cover.replace(/\s+/g, ' '))) throw new Error('سطر الأيام الناقصة: ' + cover);
await page.reload(); await page.waitForSelector('.tiles');
if (!(await page.locator('.dash-head [data-k=month][aria-selected=true]').count())) throw new Error('ما تذكّر اختيار الشهر');
await shot('04b-dash-cover');
await page.click('.dash-head [data-k=day]');
step('اللوحة تفتح على آخر يوم، وتتذكر الاختيار، وتوضح الأيام الناقصة');

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForSelector('.tabbar');
await shot('06-mobile-dash');
await page.click('.tabbar [data-r=entry]');
await page.click('[data-act=step][data-s=sales]');
await page.click('[data-act="add-sales"]');
await shot('07-mobile-line');
await page.click(`${M} .dlg-h [data-act=close]`);
await page.setViewportSize({ width: 1360, height: 900 });
step('الجوال: شريط سفلي ونافذة من الأسفل');

await page.click('.side [data-act=logout]');
await page.waitForSelector('[data-act=passkey]');
await page.click('[data-act=passkey]');
await page.waitForSelector('.shell');
step('الخروج ثم الدخول بالبصمة');

idle(6);
await page.click('.side [data-r=log]');
await page.waitForSelector('[data-act=unlockkey]');
await shot('08-locked-owner');
await page.click('[data-act=unlockkey]');
await page.waitForSelector('.shell');
await page.waitForSelector('.loglist');
step('قفل بعد 5 دقائق ← فتح بالبصمة ← يكمل من نفس الصفحة');

await page.click('.side [data-r=users]');
await page.click('[data-act=linkcode]');
await page.waitForSelector(`${M} .link-code`);
await shot('09-link-code');
const linkCode = (await page.textContent(`${M} .link-code`)).replace(/\D/g, '');
await page.click(`${M} .dlg-f [data-act=close]`);
{
  const ctx2 = await browser.newContext({ locale: 'ar', viewport: { width: 1360, height: 900 } });
  const p2 = await ctx2.newPage();
  const cdp2 = await ctx2.newCDPSession(p2);
  await cdp2.send('WebAuthn.enable');
  await cdp2.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true } });
  await p2.goto(BASE);
  await p2.click('summary:has-text("رمز ربط")');
  await p2.type('[name=l_code]', linkCode);
  await p2.click('button[data-v=link]');
  await p2.waitForSelector('.shell');
  await p2.waitForSelector('#modal-root [data-act=addkey]');
  await p2.screenshot({ path: `${SHOTS}/10-new-device-passkey.png` });
  await p2.click('#modal-root [data-act=addkey]');
  await p2.waitForFunction(() => !document.querySelector('#modal-root [data-act=addkey]'));
  await p2.click('.side [data-act=logout]');
  await p2.click('[data-act=passkey]');
  await p2.waitForSelector('.shell');
  await ctx2.close();
}
step('جهاز جديد برمز ربط ← يسجل بصمته ← يدخل بالبصمة');

await page.click('.side [data-act=logout]');
await page.click('[data-act=pick][data-v=clerk]');
await page.fill('[name=user]', 'clerk1');
await page.fill('[name=pw]', 'password-123456');
await page.click('form[data-form=login] button[type=submit]');
await page.waitForSelector('.shell');
if (await page.locator('.side [data-r=users]').count()) throw new Error('مدخل البيانات يرى الإدارة');
step('مدخل البيانات بدون «الإدارة»');

await page.click('.side [data-r=entry]');
await page.click('[data-act=step][data-s=sales]');
const nBefore = await page.locator('.l-sales .ln').count();
await ctx.setOffline(true);
await page.click('[data-act="add-sales"]');
await page.waitForTimeout(150);
{ const l = DAY.sales[0]; await fill('p', 1234); await fill('g', l.g); await fill('m', l.m); await fill('d', 'خاتم تجربة النت'); await fill('mk', l.mk); await setKarats(l.k || ''); }
await page.click(`${M} button[type=submit]`);
await page.waitForSelector('#netq');
await page.click(`${M} .dlg-h [data-act=close]`);
await page.waitForSelector('.l-sales .ln.is-pending');
await shot('11-offline-pending');
if (await page.locator('.l-sales .ln').count() !== nBefore + 1) throw new Error('السطر ما ظهر وهو بدون نت');
await ctx.setOffline(false);
await page.evaluate(() => window.dispatchEvent(new Event('online')));
await page.waitForSelector('#netq', { state: 'detached', timeout: 15000 });
await page.waitForSelector('.l-sales .ln.is-pending', { state: 'detached' });
{
  const srv = await page.evaluate(async (id) => (await (await fetch(`/api/days/${id}`)).json()).sales.length, DAY.id);
  if (srv !== nBefore + 1) throw new Error(`الخادم عنده ${srv} سطور، المفروض ${nBefore + 1}`);
}
step('بدون نت: السطر يظهر «بانتظار الإرسال» وينرسل لحاله لما يرجع النت (مرة وحدة)');

{
  const ctx3 = await browser.newContext({ locale: 'ar', viewport: { width: 1360, height: 900 } });
  const p3 = await ctx3.newPage();
  await p3.goto(BASE);
  await p3.click('[data-act=pick][data-v=clerk]');
  await p3.fill('[name=user]', 'clerk1'); await p3.fill('[name=pw]', 'password-123456');
  await p3.click('form[data-form=login] button[type=submit]');
  await p3.waitForSelector('.shell');
  const r = await p3.evaluate(async (id) => (await fetch(`/api/days/${id}/lines`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: crypto.randomUUID().replace(/^(.{14})./, '$17'), sec: 'exp', line: { d: 'تجربة التحديث التلقائي', c: 'أخرى', emp: '', a: 7 } }) })).status, DAY.id);
  if (r !== 201) throw new Error('إضافة من جهاز ثاني: ' + r);
  await ctx3.close();
}
await page.click('[data-act=step][data-s=exp]');
await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
await page.waitForSelector('.l-exp .ln:has-text("تجربة التحديث التلقائي")', { timeout: 10000 });
step('جهاز ثاني يضيف سطر ← يظهر هنا لحاله لما ترجع للتطبيق (بدون تحميل الصفحة)');

idle(16);
await page.reload();
await page.waitForSelector('form[data-form=unlock]');
await page.fill('[name=pw]', 'wrong-password');
await page.click('form[data-form=unlock] button[type=submit]');
await page.waitForSelector('text=كلمة المرور غير صحيحة');
await page.fill('[name=pw]', 'password-123456');
await page.click('form[data-form=unlock] button[type=submit]');
await page.waitForSelector('.shell');
step('مدخل البيانات: قفل بعد 15 دقيقة ← كلمة مرور خاطئة تُرفض ← الصحيحة تفتح');

await browser.close();
if (errors.length) { console.error('أخطاء في المتصفح:', errors); process.exit(1); }
console.log('كل التجارب نجحت');
