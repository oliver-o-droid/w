const CACHE_NAME = 'enlaces-cache-v1';
const urlsToCache = [
  '/',
  'index.html',
  // Puedes añadir aquí tus archivos CSS y JS si los separas en el futuro
  'icons/icon-192x192.png',
  'icons/icon-512x512.png'
];

// Instala el Service Worker y cachea los archivos principales
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Intercepta las peticiones y sirve desde la caché si es posible
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});