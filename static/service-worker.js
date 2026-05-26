// static/service-worker.js
const CACHE_NAME = 'famimusic-v2';

self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    clients.claim();
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    // No cachear el streaming de audio
    if (url.pathname.startsWith('/stream/')) {
        return; // dejar pasar directamente
    }
    event.respondWith(
        fetch(event.request)
            .then(response => {
                let responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
