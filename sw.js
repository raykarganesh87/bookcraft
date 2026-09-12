// BookCraft service worker — app-shell caching so the tool keeps working offline.
// Bump CACHE_NAME whenever you change index.html/manifest/icons so clients pick up the update.
const CACHE_NAME = 'bookcraft-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

// Cache the app shell up front.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Drop old caches on activate.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Stale-while-revalidate for everything, including the jsPDF/html2canvas/
// Google Fonts CDN requests — serves instantly from cache, refreshes in the
// background, and still works the first time only if online.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        const networkFetch = fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(() => cached); // offline and not cached yet — fall back to whatever we have

        return cached || networkFetch;
      })
    )
  );
});
