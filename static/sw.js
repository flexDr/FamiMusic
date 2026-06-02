const CACHE_NAME = 'musicapi_cache_v1';
const URLS_A_CACHEAR = [
  const URLS_A_CACHEAR = [
  '/',
  '/static/app.js',
  '/manifest.json'
];

// Fase 1: Instalación (Guardar la interfaz en el celular)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_A_CACHEAR))
  );
  self.skipWaiting();
});

// Fase 2: Intercepción de red
self.addEventListener('fetch', e => {
  // REGLA DE ORO: Nunca cachear el túnel de audio. 
  // Si cacheamos la música, el iPhone colapsará la memoria RAM.
  if (e.request.url.includes('/api/stream')) {
      return; 
  }
  
  // Para todo lo demás (HTML, CSS, JS), sirve la versión ultrarrápida del caché
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
