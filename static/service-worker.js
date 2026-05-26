// static/service-worker.js
const CACHE_NAME = 'famimusic-v2';

self.addEventListener('install', event => {
    self.skipWaiting(); // Activar inmediatamente
});

self.addEventListener('activate', event => {
    clients.claim(); // Tomar control de las pestañas abiertas
    // Limpiar cachés viejas
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
});

// No interceptar el streaming de audio
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    // Si es una petición a /stream/, no la cacheamos (la dejamos pasar)
    if (url.pathname.startsWith('/stream/')) {
        return; // No hacer nada, usar la red directamente
    }
    // Para el resto, estrategia network-first
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Cachear solo si la respuesta es válida (no streaming)
                let responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
