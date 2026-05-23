const CACHE_NAME = 'famimusic-v1';
const MEDIA_CACHE = 'famimusic-media-v1';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                '/',
                '/static/style.css',
                '/static/app.js',
                '/static/manifest.json'
            ]);
        })
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (url.pathname.includes('/stream/') || url.pathname.includes('/search/')) {
        event.respondWith(
            fetch(event.request).catch(async () => {
                const cache = await caches.open(MEDIA_CACHE);
                const cachedResponse = await cache.match(event.request);
                if (cachedResponse) return cachedResponse;
                throw new Error('Offline y no descargado');
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

self.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'CACHE_AUDIO') {
        try {
            const cache = await caches.open(MEDIA_CACHE);
            const response = await fetch(event.data.url);
            if (response.ok) {
                await cache.put(event.data.url, response.clone());
                event.source.postMessage({ type: 'DOWNLOAD_COMPLETE', id: event.data.id });
            }
        } catch (error) {
            console.error('Error al guardar audio offline:', error);
        }
    }
});