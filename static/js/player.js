// FamiMusic Player - Apple Music Style + Crossfade + DJ Ready

let currentAudio = null;
let nextAudio = null;
let isPlaying = false;
let currentTrack = null;
let queue = [];
let currentIndex = 0;
let isCrossfadeEnabled = true;
let crossfadeDuration = 3; // segundos

// Elementos del DOM
const audio1 = document.getElementById('audio1');
const audio2 = document.getElementById('audio2');
const trackName = document.getElementById('trackName');
const artistName = document.getElementById('artistName');
const hudImg = document.getElementById('hudImg');
const barraProgreso = document.getElementById('barraProgreso');
const timeActual = document.getElementById('timeActual');
const timeTotal = document.getElementById('timeTotal');

const btnPlayPause = document.getElementById('btnPlayPauseBig');

const baseUrl = window.location.origin;

// Función principal para reproducir canción
function playSong(videoId, title, artist = 'Artista Desconocido', thumbnail = '') {
    currentTrack = { id: videoId, title, artist, thumbnail };
    
    trackName.textContent = title;
    artistName.textContent = artist;
    if (thumbnail) hudImg.src = thumbnail;

    // Preparar audio
    if (currentAudio) {
        fadeOut(currentAudio);
    }

    currentAudio = audio1;
    currentAudio.src = `${baseUrl}/api/audio/${videoId}`;
    currentAudio.crossOrigin = "anonymous";

    currentAudio.play().then(() => {
        isPlaying = true;
        updatePlayButton();
    }).catch(err => {
        console.error("Error reproduciendo:", err);
    });

    // Actualizar progreso
    setupProgress();
}

// Crossfade entre dos audios
function fadeOut(audio, duration = crossfadeDuration) {
    if (!audio) return;
    const fadeSteps = 20;
    const step = duration / fadeSteps;
    let volume = audio.volume || 1;

    const fadeInterval = setInterval(() => {
        volume -= 1 / fadeSteps;
        if (volume <= 0) {
            audio.pause();
            audio.volume = 1;
            clearInterval(fadeInterval);
        } else {
            audio.volume = volume;
        }
    }, step * 1000);
}

// Configurar barra de progreso
function setupProgress() {
    if (!currentAudio) return;

    currentAudio.ontimeupdate = () => {
        if (!currentAudio.duration) return;
        const progress = (currentAudio.currentTime / currentAudio.duration) * 100;
        barraProgreso.value = progress;

        timeActual.textContent = formatTime(currentAudio.currentTime);
        timeTotal.textContent = formatTime(currentAudio.duration);
    };

    currentAudio.onended = () => {
        nextSong();
    };
}

function formatTime(seconds) {
    if (!seconds) return '0:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function togglePlay() {
    if (!currentAudio) return;

    if (isPlaying) {
        currentAudio.pause();
    } else {
        currentAudio.play();
    }
    isPlaying = !isPlaying;
    updatePlayButton();
}

function updatePlayButton() {
    if (btnPlayPause) {
        btnPlayPause.innerHTML = isPlaying ? 
            '<svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>' : 
            '<svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor"><path d="M8 5.14v14l11-7z"/></svg>';
    }
}

function nextSong() {
    if (queue.length > currentIndex + 1) {
        currentIndex++;
        const next = queue[currentIndex];
        playSong(next.id, next.title, next.artist, next.thumb);
    }
}

function prevSong() {
    if (currentIndex > 0) {
        currentIndex--;
        const prev = queue[currentIndex];
        playSong(prev.id, prev.title, prev.artist, prev.thumb);
    }
}

// Funciones dummy para botones existentes
window.togglePlay = togglePlay;
window.nextSong = nextSong;
window.prevSong = prevSong;

console.log('🎵 FamiMusic Player cargado - Listo para DJ + IA');
