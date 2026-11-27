// Service worker de la Nómina: primero busca la versión nueva en internet y,
// si no hay conexión, abre la última copia guardada. Nunca guarda en caché
// las llamadas a la base de datos (Google Apps Script).
const CACHE = 'nomina-v1';
const ARCHIVOS = ['./', './index.html', './manifest.json', './icono-180.png', './icono-192.png', './icono-512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(resp => {
      const copia = resp.clone();
      caches.open(CACHE).then(c => c.put(req, copia));
      return resp;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
