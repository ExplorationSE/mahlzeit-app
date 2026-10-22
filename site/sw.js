const C = 'mahlzeit-v2', SHELL = ['./', './index.html', './app.js', './manifest.webmanifest', './fonts/explorationse-mahlzeit.woff2', './icons/favicon-v1-32.png', './icons/favicon-v1-16.png', './icons/icon-v1-192.png', './icons/icon-v1-512.png', './icons/apple-touch-icon-v1.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x.startsWith('mahlzeit-') && x !== C).map(x => caches.delete(x))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || !u.pathname.startsWith(new URL('./', self.registration.scope).pathname)) return; // fremde Seiten/andere Apps: Browser lädt direkt
  if (u.pathname.endsWith('.webmanifest') || u.pathname.includes('/icons/')) return;
  if (u.pathname.includes('/data/')) { // Speisepläne: immer Netzwerk zuerst, nur offline der letzte Stand
    const key = u.origin + u.pathname;
    e.respondWith(fetch(e.request, { cache: 'no-store' }).then(r => { if (r.ok) { const cp = r.clone(); caches.open(C).then(c => c.put(key, cp)); } return r; }).catch(() => caches.match(key)));
    return;
  }
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); } return r; }).catch(() => caches.match(e.request)));
});
