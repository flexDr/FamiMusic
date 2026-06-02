const audio = document.getElementById('reproductor');

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(reg => console.log('Service Worker listo'))
    .catch(err => console.warn('Error en Service Worker', err));
}

function reproducirCancion(urlYoutube, titulo, artista, portada) {
    const urlApi = `/api/stream?url=${encodeURIComponent(urlYoutube)}`;
    
    audio.src = urlApi;
    audio.load();

    audio.play().then(() => {
        // ACTIVAR CONTROLES DE PANTALLA APAGADA (Background Play)
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: titulo,
                artist: artista,
                album: 'MusicAPI',
                artwork: [
                    { src: portada, sizes: '512x512', type: 'image/png' }
                ]
            });

            navigator.mediaSession.setActionHandler('play', () => audio.play());
            navigator.mediaSession.setActionHandler('pause', () => audio.pause());
            navigator.mediaSession.setActionHandler('seekto', (details) => {
                if (details.fastSeek && 'fastSeek' in audio) {
                    audio.fastSeek(details.seekTime);
                } else {
                    audio.currentTime = details.seekTime;
                }
            });
        }
    }).catch(err => console.error("Safari requiere interacción primero:", err));
}
