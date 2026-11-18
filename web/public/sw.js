// خدمة بسيطة: تحفظ واجهة التطبيق فقط. بيانات /api لا تُخزَّن أبدًا.
// لو الشبكة بطيئة (VPN أو تغطية ضعيفة) ما ننتظر للأبد: بعد 4 ثواني نفتح من النسخة المحفوظة.
const CACHE = 'gold-shell-v4';
const SLOW_MS = 4000;
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icon.svg'])));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

function fromNet(req) {
  return fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined); }
    return res;
  });
}
const fromCache = (req) => caches.match(req).then((r) => r || (req.mode === 'navigate' ? caches.match('/') : undefined));

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // نفس الموقع فقط (لا إضافات المتصفح ولا مواقع ثانية)، وبدون /api
  if (e.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  const req = e.request;
  // ملفات /assets/ أسماؤها تتغير مع كل تحديث، فالمحفوظ منها صحيح دائمًا
  if (url.pathname.startsWith('/assets/')) { e.respondWith(caches.match(req).then((r) => r || fromNet(req))); return; }
  e.respondWith(new Promise((done) => {
    let settled = false;
    const finish = (r) => { if (!settled && r) { settled = true; done(r); } };
    const net = fromNet(req);
    const t = setTimeout(() => fromCache(req).then(finish), SLOW_MS);
    net.then((r) => { clearTimeout(t); finish(r); })
      .catch(() => { clearTimeout(t); fromCache(req).then((r) => finish(r || Response.error())); });
    // لو المحفوظ ما فيه شي، ننتظر الشبكة مهما طولت
    net.then(finish, () => undefined);
  }));
});
