// تجربة كاملة في المتصفح: إعداد، مفتاح مرور (افتراضي)، مستخدم، يوم، سطور، مقارنة، دخول.
// التشغيل: node e2e/smoke.mjs http://localhost:8787 <مجلد الصور>
import { chromium } from '@playwright/test';

const BASE = process.argv[2] ?? 'http://localhost:8787';
const SHOTS = process.argv[3] ?? '/tmp/shots';
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome' });
const ctx = await browser.newContext({ locale: 'ar' });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('401')) errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
const cdp = await ctx.newCDPSession(page);
await cdp.send('WebAuthn.enable');
await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true } });
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true });
const step = (s) => console.log('✓', s);

await page.goto(BASE);
await page.fill('[name=token]', 'local-setup-token-123456');
await page.fill('[name=ownerName]', 'عبدالله');
await page.fill('[name=username]', 'owner');
await page.click('button.primary');
await page.click('[data-add]');
await page.waitForSelector('[data-adduser]');
step('الإعداد ومفتاح المرور');
await page.click('[data-adduser]');
await page.fill('.modal [name=name]', 'مدخل البيانات');
await page.fill('.modal [name=username]', 'entry1');
await page.fill('.modal [name=password]', 'password-123456');
await page.click('.modal button.primary');
await page.waitForSelector('text=@entry1');
await shot('01-users');
step('إضافة مدخل بيانات');

await page.goto(`${BASE}/#/days`);
await page.click('[data-new]');
await page.fill('.modal [name=date]', '2026-10-01');
await page.click('.modal button.primary');
await page.waitForSelector('[data-add=sale]');
for (const [d, g, m, a, w] of [['خاتم ذهب', '6.25', '', '1500', '50'], ['سلسلة', '12', '5', '3200.50', '80']]) {
  await page.click('[data-add=sale]');
  await page.fill('.modal [name=description]', d);
  await page.fill('.modal [name=grams]', g);
  if (m) await page.fill('.modal [name=milli]', m);
  await page.fill('.modal [name=amount]', a);
  await page.fill('.modal [name=wages]', w);
  await page.click('.modal [data-save]');
  await page.waitForSelector('.modal', { state: 'detached' });
}
await page.waitForSelector('tbody tr:nth-child(2)');
const foot = await page.textContent('tfoot');
if (!foot.includes('4,700.50') || !foot.includes('18.75')) throw new Error('مجاميع خاطئة: ' + foot);
await shot('02-day-sales');
step('إدخال سطرين: المجموع 4,700.50 والوزن 18.75');

await page.click('[data-add=sale]');
await page.fill('.modal [name=description]', 'سلسلة');
await page.fill('.modal [name=grams]', '12');
await page.fill('.modal [name=milli]', '5');
await page.fill('.modal [name=amount]', '3200.50');
await page.fill('.modal [name=wages]', '80');
await page.click('.modal [data-save]');
await page.waitForSelector('text=مطابق للسطر الذي قبله');
await page.click('[data-no]');
await page.click('[data-close]');
step('سؤال السطر المكرر');

await page.click('[data-step="3"]');
await page.fill('[name=l_salesFils]', '4700.50');
await page.fill('[name=l_salesCg]', '18.75');
for (const k of ['purchasesFils', 'purchasesCg', 'expensesFils']) await page.fill(`[name=l_${k}]`, '0');
await page.fill('[name=l_wagesFils]', '130');
await page.click('[data-compare] button.primary');
await page.waitForSelector('.day-title .badge.matched');
await shot('03-compare');
step('المقارنة: مطابق للدفتر');

await page.goto(`${BASE}/#/search`);
await page.fill('[name=q]', 'سلس');
await page.waitForSelector('text=سلسلة');
step('البحث');
await page.goto(`${BASE}/#/reports`);
await page.fill('[name=from]', '2026-10-01');
await page.fill('[name=to]', '2026-10-31');
await page.click('[data-range] button.primary');
await page.waitForSelector('.stat-value:has-text("4,700.50")');
await shot('04-reports');
step('التقارير');

await page.goto(`${BASE}/#/`);
await page.click('[data-period=month]');
await page.click('[data-shift="-1"]');
await page.waitForSelector('.chart');
await shot('05-dashboard-dark');
await page.click('.top-actions [data-theme]');
await shot('06-dashboard-light');
await page.click('.top-actions [data-theme]');
step('اللوحة والثيمين');

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForSelector('.bottombar');
await shot('07-mobile-dashboard');
await page.goto(`${BASE}/#/days`);
await page.fill('[name=month]', '2026-10');
await page.dispatchEvent('[name=month]', 'change');
await page.click('.day-row');
await page.click('[data-step="0"]');
await page.click('[data-add=sale]');
await shot('08-mobile-line-sheet');
await page.click('[data-close]');
step('الجوال: شريط سفلي ونافذة من الأسفل');

await page.click('.top-actions [data-logout]');
await page.waitForSelector('[data-passkey]');
await page.click('[data-passkey]');
await page.waitForSelector('.bottombar');
step('الخروج ثم الدخول بمفتاح المرور');

await page.click('.top-actions [data-logout]');
await page.waitForSelector('[data-passkey]');
await page.fill('[name=username]', 'entry1');
await page.fill('[name=password]', 'password-123456');
await page.click('[data-form=password] button');
await page.waitForSelector('.bottombar');
if (await page.$('a[href="#/admin"]')) throw new Error('مدخل البيانات يرى الإدارة');
step('مدخل البيانات بدون «الإدارة»');

await browser.close();
if (errors.length) { console.error('أخطاء في المتصفح:', errors); process.exit(1); }
console.log('كل التجارب نجحت');
