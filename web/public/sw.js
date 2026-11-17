// خدمة بسيطة: تحفظ واجهة التطبيق فقط. بيانات /api لا تُخزَّن أبدًا.
const CACHE = 'gold-shell-v3';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icon.svg'])));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // نفس الموقع فقط (لا إضافات المتصفح ولا مواقع ثانية)، وبدون /api
  if (e.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(fetch(e.request).then((res) => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => undefined);
    }
    return res;
  }).catch(() => caches.match(e.request).then((r) => r || caches.match('/'))));
});
