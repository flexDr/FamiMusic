const CACHE_NAME = 'famimusic-v1';
const MEDIA_CACHE = 'famimusic-media-v1';
const urlsToCache = [
  '/',
  '/static/style.css',
  '/static/app.js',
  '/static/manifest.json'
];

// Instalación
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting(); // Toma el control inmediatamente
});

// Activación
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME && key !== MEDIA_CACHE)
          .map(key => caches.delete(key))
      );
    })
  );
  return self.clients.claim(); // Hace que el SW controle las páginas ya abiertas
});

// Estrategia: Stale-while-revalidate para API y cache-first para recursos estáticos
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Para peticiones a la API (search y stream) usamos network-first con fallback a caché
  if (url.pathname.includes('/search/') || url.pathname.includes('/stream/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clona y guarda en caché (solo para stream, opcional)
          if (url.pathname.includes('/stream/') && response.ok) {
            const responseClone = response.clone();
            caches.open(MEDIA_CACHE).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) return cachedResponse;
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        })
    );
    return;
  }
  
  // Para recursos estáticos (CSS, JS, imágenes) usamos cache-first
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).then(fetchResponse => {
        // Opcional: guardar en caché las nuevas respuestas
        if (event.request.method === 'GET' && 
            (event.request.url.includes('/static/') || event.request.url === '/')) {
          const responseToCache = fetchResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return fetchResponse;
      });
    }).catch(() => {
      return new Response('Offline', { status: 503 });
    })
  );
});

// Mensajes para cachear audio bajo demanda (útil si luego quieres descarga offline)
self.addEventListener('message', async event => {
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
