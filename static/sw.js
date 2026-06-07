const CACHE_NAME = 'famimusic-v1';

// Solo se cachean los assets del shell de la app (no el audio)
const SHELL_URLS = [
    '/',
    '/manifest.json'
];

// ─── INSTALACIÓN ─────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(SHELL_URLS);
        })
    );
    self.skipWaiting();
});

// ─── ACTIVACIÓN (limpia cachés viejos) ────────────────────────────────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

// ─── INTERCEPCIÓN DE REQUESTS ─────────────────────────────────────────────────
self.addEventListener('fetch', event => {
    const url = event.request.url;

    // REGLA 1: NUNCA cachear el audio (evita colapsar RAM en iPhone)
    if (url.includes('/api/get-audio') || url.includes('/api/stream')) {
        return; // Deja pasar directamente a la red
    }

    // REGLA 2: NUNCA cachear la API de iTunes (necesita datos frescos)
    if (url.includes('itunes.apple.com')) {
        return;
    }

    // REGLA 3: Para imágenes de portadas, red primero → caché como fallback
    if (url.includes('mzstatic.com') || url.includes('artworkUrl')) {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
        return;
    }

    // REGLA 4: Para el shell (HTML, manifest), caché primero → red como fallback
    event.respondWith(
        caches.match(event.request).then(cached => {
            return cached || fetch(event.request).then(response => {
                // Guardar en caché si la respuesta es válida
                if (response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            });
        }).catch(() => {
            // Offline fallback: devuelve la página principal
            if (event.request.mode === 'navigate') {
                return caches.match('/');
            }
        })
    );
});
