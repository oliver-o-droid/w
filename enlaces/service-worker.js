const CACHE_NAME = 'enlaces-cache-v3'; // Forzar actualización del manifest
const urlsToCache = [
  '/',
  'index.html',
  'manifest.json',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png'
];

// 1. Instalar: Se ejecuta cuando se detecta un nuevo Service Worker.
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache abierto, añadiendo archivos principales.');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Fuerza al nuevo SW a activarse inmediatamente.
  );
});

// 2. Activar: Se ejecuta después de la instalación. Es el lugar ideal para limpiar cachés antiguas.
self.addEventListener('activate', event => {
  console.log('Service Worker: Activando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Si el nombre del caché no es el actual, lo borramos.
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Limpiando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Toma el control de las páginas abiertas.
  );
});

// 3. Fetch: Intercepta todas las peticiones de red.
self.addEventListener('fetch', event => {
  event.respondWith(
    // Intenta encontrar la petición en la caché.
    caches.match(event.request)
      .then(response => {
        // Si está en la caché, la devuelve. Si no, hace la petición a la red.
        return response || fetch(event.request);
      })
  );
});