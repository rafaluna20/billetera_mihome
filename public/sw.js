// Service worker de la billetera.
//
// SEGURIDAD: aquí solo se guardan archivos ESTÁTICOS (íconos, scripts y estilos de la app). Nunca las pantallas
// con saldos o movimientos (/home, /yapear, /depositar): en un teléfono compartido, otra persona vería la
// billetera de la sesión anterior aunque ya se hubiera cerrado. Las páginas siempre van a la red.
const CACHE_NAME = 'mihome-pwa-cache-v2';
const STATIC_ASSETS = [
  '/manifest.webmanifest',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

const ES_ESTATICO = (url) =>
  url.pathname.startsWith('/_next/static/') || STATIC_ASSETS.includes(url.pathname);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Borra TODO lo guardado por versiones anteriores (la v1 guardaba páginas).
  event.waitUntil(
    caches.keys().then((nombres) => Promise.all(nombres.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // Todo lo que no sea un archivo estático (páginas, acciones, API) pasa directo a la red, sin tocar el caché.
  if (!ES_ESTATICO(url)) return;

  event.respondWith(
    caches.match(event.request).then((guardado) => {
      const red = fetch(event.request).then((respuesta) => {
        if (respuesta && respuesta.status === 200 && respuesta.type === 'basic') {
          const copia = respuesta.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
        }
        return respuesta;
      });
      return guardado || red;
    })
  );
});
