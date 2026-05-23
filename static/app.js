let playlist = []; 
let currentIndex = -1; 
let memoriasInicio = { favs: [], dembow: [], trap: [], biblioteca: [] }; 
let isInfinityMode = false;

// --- EL CABALLO DE TROYA (REPRODUCTORES INVISIBLES YOUTUBE) ---
const ytCont1 = document.createElement('div');
ytCont1.style.position = 'absolute'; ytCont1.style.opacity = '0'; ytCont1.style.width = '1px'; ytCont1.style.height = '1px'; ytCont1.style.pointerEvents = 'none';
ytCont1.id = 'yt1';
document.body.appendChild(ytCont1);

const ytCont2 = document.createElement('div');
ytCont2.style.position = 'absolute'; ytCont2.style.opacity = '0'; ytCont2.style.width = '1px'; ytCont2.style.height = '1px'; ytCont2.style.pointerEvents = 'none';
ytCont2.id = 'yt2';
document.body.appendChild(ytCont2);

let ytPlayer1, ytPlayer2;
let ytReady = false;
let activeDeck = 1; 
let isMixing = false;
let timeUpdateInterval;

// Inyectar el código oficial de YouTube en tu app
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

window.onYouTubeIframeAPIReady = function() {
    ytPlayer1 = new YT.Player('yt1', {
        playerVars: { 'playsinline': 1, 'controls': 0, 'disablekb': 1 },
        events: { 'onStateChange': (e) => handleYTState(e, 1) }
    });
    ytPlayer2 = new YT.Player('yt2', {
        playerVars: { 'playsinline': 1, 'controls': 0, 'disablekb': 1 },
        events: { 'onStateChange': (e) => handleYTState(e, 2) }
    });
    ytReady = true;
}

function handleYTState(event, deckNum) {
    if (event.data === YT.PlayerState.ENDED && activeDeck === deckNum) { nextSong(); }
}

function getActivePlayer() { return activeDeck === 1 ? ytPlayer1 : ytPlayer2; }
function getOldPlayer() { return activeDeck === 1 ? ytPlayer2 : ytPlayer1; }

const svgPlay = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
const svgPause = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

function toggleInfinity(e) {
    if(e) e.stopPropagation();
    isInfinityMode = !isInfinityMode;
    document.getElementById('btnInfinity').style.color = isInfinityMode ? 'var(--accent)' : 'rgba(255,255,255,0.4)';
}

function guardarHistorial(titulo) {
    let historial = JSON.parse(localStorage.getItem('Fami_Cerebro')) || [];
    let artista = titulo.includes("-") ? titulo.split("-")[0].trim() : titulo.split(" ")[0];
    historial = historial.filter(a => a !== artista);
    historial.unshift(artista);
    if (historial.length > 6) historial.pop();
    localStorage.setItem('Fami_Cerebro', JSON.stringify(historial));
}

function obtenerQueryInteligente() {
    let historial = JSON.parse(localStorage.getItem('Fami_Cerebro')) || [];
    if (historial.length > 0) return historial[Math.floor(Math.random() * historial.length)] + " exitos mix oficial";
    const defaults = ["The Weeknd XXXTentacion", "Trap Latino Mix", "Dembow Dominicano hits"];
    return defaults[Math.floor(Math.random() * defaults.length)];
}

const poolDembow = ["Dembow Dominicano hits", "El Alfa El Jefe official audio", "Rochy RD Dembow clasicos", "Tokischa Dembow Mix"];
const poolTrap = ["Trap Latino Mix", "Anuel AA Bryant Myers Trap Clasicos", "Eladio Carrion Solito Trap"];

window.onload = async () => {
    cargarCarrusel(obtenerQueryInteligente(), "carousel1", "favs");
    cargarCarrusel(poolDembow[Math.floor(Math.random() * poolDembow.length)], "carousel2", "dembow");
    cargarCarrusel(poolTrap[Math.floor(Math.random() * poolTrap.length)], "carousel3", "trap");
    cargarBiblioteca(); 
};

function switchTab(tabId, btnElement) {
    document.querySelectorAll('.menu-item').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
    document.getElementById('homeView').style.display = 'none';
    document.getElementById('searchView').style.display = 'none';
    document.getElementById('libraryView').style.display = 'none';
    document.getElementById('searchWrapper').style.display = 'none';

    const title = document.getElementById('headerTitle');
    if(tabId === 'home') {
        document.getElementById('homeView').style.display = 'block';
        title.innerText = 'Inicio';
        cargarCarrusel(obtenerQueryInteligente(), "carousel1", "favs");
    } else if(tabId === 'search') {
        document.getElementById('searchView').style.display = 'grid';
        document.getElementById('searchWrapper').style.display = 'block';
        title.innerText = 'Buscar';
        document.getElementById('searchBar').focus(); 
    } else if(tabId === 'library') {
        cargarBiblioteca();
        document.getElementById('libraryView').style.display = 'block';
        title.innerText = 'Biblioteca';
    }
}

function crearHTMLTarjeta(s, actionStr) {
    let title = s.title;
    let artist = "YouTube Audio";
    if (s.title.includes("-")) {
        let parts = s.title.split("-");
        artist = parts[0].trim();
        title = parts.slice(1).join("-").trim();
    }
    return `<div class="card" onclick="${actionStr}"><img src="${s.thumb}" onerror="this.style.display='none'"><div class="card-title">${title}</div><div class="card-subtitle">${artist}</div></div>`;
}

// Descargar canción ahora funciona como un botón de "Favoritos" para evitar bloqueos
function descargarCancion(e) {
    if(e) e.stopPropagation();
    if(currentIndex === -1) return;
    const song = playlist[currentIndex];
    let biblioteca = JSON.parse(localStorage.getItem('FamiMusic_Lib')) || [];

    if(!biblioteca.some(s => s.id === song.id)) {
        biblioteca.unshift(song); 
        localStorage.setItem('FamiMusic_Lib', JSON.stringify(biblioteca));
        document.getElementById('btnDownload').innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="var(--accent)"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`;
        cargarBiblioteca();
    }
}

function cargarBiblioteca() {
    let biblioteca = JSON.parse(localStorage.getItem('FamiMusic_Lib')) || [];
    const libView = document.getElementById('libraryView');
    memoriasInicio['biblioteca'] = biblioteca; 
    if (biblioteca.length === 0) {
        libView.innerHTML = `<div style="padding: 40px 20px; text-align: center; color: #888;"><p>Tus canciones guardadas estarán aquí.</p></div>`;
        return;
    }
    libView.innerHTML = `<div class="grid">${biblioteca.map((s, index) => {
        let html = crearHTMLTarjeta(s, `playDesdeCarrusel('biblioteca', ${index})`);
        return `<div style="position: relative;">${html}<button onclick="eliminarDeBiblioteca(event, '${s.id}')" style="position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.7); border: none; color: white; border-radius: 50%; width: 25px; height: 25px; cursor: pointer; font-weight: bold; z-index: 10;">✕</button></div>`;
    }).join('')}</div>`;
}

function eliminarDeBiblioteca(e, id) {
    if(e) e.stopPropagation();
    let biblioteca = JSON.parse(localStorage.getItem('FamiMusic_Lib')) || [];
    biblioteca = biblioteca.filter(s => s.id !== id);
    localStorage.setItem('FamiMusic_Lib', JSON.stringify(biblioteca));
    cargarBiblioteca(); 
}

async function cargarCarrusel(query, containerId, memoriaKey) {
    try {
        const res = await fetch("/search/" + encodeURIComponent(query));
        const data = await res.json();
        memoriasInicio[memoriaKey] = data; 
        const container = document.getElementById(containerId);
        container.style.opacity = "0.3";
        container.innerHTML = data.map((s, index) => crearHTMLTarjeta(s, `playDesdeCarrusel('${memoriaKey}', ${index})`)).join('');
        container.style.transition = "opacity 0.3s ease";
        container.style.opacity = "1";
    } catch (e) {}
}

function playDesdeCarrusel(memoriaKey, index) { playlist = memoriasInicio[memoriaKey]; playIndex(index); }

let searchTimeout = null;
document.getElementById('searchBar').oninput = (e) => {
    const query = e.target.value.trim();
    const searchView = document.getElementById('searchView');
    if (query.length < 2) { searchView.innerHTML = ""; return; }
    
    clearTimeout(searchTimeout);
    searchView.innerHTML = "<p style='padding: 20px; color: #888;'>Escribiendo...</p>";
    
    searchTimeout = setTimeout(async () => {
        searchView.innerHTML = "<p style='padding: 20px; color: #fa233b;'>Buscando opciones...</p>";
        try {
            const res = await fetch("/search/" + encodeURIComponent(query));
            const data = await res.json();
            playlist = data; 
            if(data.length === 0) {
                searchView.innerHTML = "<p style='padding: 20px; color: #888;'>No se encontraron resultados.</p>";
                return;
            }
            searchView.innerHTML = data.map((s, index) => crearHTMLTarjeta(s, `playIndex(${index})`)).join('');
        } catch (e) { searchView.innerHTML = "<p style='padding: 20px; color: #888;'>Hubo un error de conexión.</p>"; }
    }, 800);
};

async function nextSong(e = null, isCrossfade = false) { 
    if(e) e.stopPropagation(); 
    if (currentIndex < playlist.length - 1) {
        playIndex(currentIndex + 1, false, isCrossfade); 
    } else if (isInfinityMode) {
        const lastSong = playlist[currentIndex];
        let artist = lastSong.title.includes("-") ? lastSong.title.split("-")[0].trim() : lastSong.title;
        try {
            if(!isCrossfade) document.getElementById('trackName').innerText = "🤖 Buscando...";
            const res = await fetch("/search/" + encodeURIComponent(artist + " mix audio"));
            const data = await res.json();
            playlist = playlist.concat(data);
            playIndex(currentIndex + 1, false, isCrossfade);
        } catch(err) { playIndex(0, false, false); }
    } else {
        playIndex(0, false, false); 
    }
}

function prevSong(e) { if(e) e.stopPropagation(); if (currentIndex > 0) playIndex(currentIndex - 1, false, false); }

function toggleFullScreen(e) {
    if(e) e.stopPropagation();
    const player = document.getElementById('player');
    const nav = document.getElementById('appNav');
    if(player.classList.contains('active')) {
        player.classList.toggle('fullscreen');
        nav.style.transform = player.classList.contains('fullscreen') ? 'translateY(100%)' : 'translateY(0)'; 
    }
}

function formatoTiempo(segundos) {
    if (!segundos || isNaN(segundos)) return "0:00";
    const min = Math.floor(segundos / 60);
    const sec = Math.floor(segundos % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

// --- EL NUEVO MOTOR DE REPRODUCCIÓN OFICIAL ---
function playIndex(index, preserveTime = false, isCrossfade = false) {
    if (!ytReady) {
        document.getElementById('trackName').innerText = "Iniciando motor...";
        setTimeout(() => playIndex(index, preserveTime, isCrossfade), 1000);
        return;
    }

    if (isCrossfade) isMixing = true; 
    else isMixing = false;

    const oldPlayer = getActivePlayer(); 
    activeDeck = activeDeck === 1 ? 2 : 1; 
    const newPlayer = getActivePlayer(); 

    if (!isCrossfade && oldPlayer && oldPlayer.stopVideo) { oldPlayer.stopVideo(); }

    currentIndex = index; 
    const song = playlist[index]; 
    const playerUI = document.getElementById('player');
    
    guardarHistorial(song.title);
    
    let fullTitle = song.title;
    let trackStr = fullTitle;
    let artistStr = "YouTube Audio";
    if (fullTitle.includes("-")) {
        let parts = fullTitle.split("-");
        artistStr = parts[0].trim();
        trackStr = parts.slice(1).join("-").trim();
    }

    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({ title: trackStr, artist: artistStr, artwork: [{ src: song.thumb, sizes: '512x512', type: 'image/jpeg' }] });
        navigator.mediaSession.setActionHandler('play', () => { getActivePlayer().playVideo(); actualizarBotonesPlay(svgPause); });
        navigator.mediaSession.setActionHandler('pause', () => { getActivePlayer().pauseVideo(); actualizarBotonesPlay(svgPlay); });
        navigator.mediaSession.setActionHandler('previoustrack', () => prevSong());
        navigator.mediaSession.setActionHandler('nexttrack', () => nextSong());
    }

    document.getElementById('trackName').innerText = isCrossfade ? "Mezclando pista..." : trackStr;
    document.getElementById('artistName').innerText = artistStr;
    document.getElementById('hudImg').src = song.thumb;
    document.getElementById('ambientBg').src = song.thumb; 
    
    if(!preserveTime && !isCrossfade) {
        document.getElementById('timeActual').innerText = "0:00";
        document.getElementById('timeTotal').innerText = "-0:00";
        document.getElementById('barraProgreso').value = 0;
        document.getElementById('miniProgress').style.width = "0%";
    }
    
    actualizarBotonesPlay(svgPause);
    playerUI.classList.add('active');

    // Cargar directamente desde YouTube oficial
    newPlayer.setVolume(isCrossfade ? 0 : 100);
    newPlayer.loadVideoById(song.id);
    
    clearInterval(timeUpdateInterval);
    timeUpdateInterval = setInterval(() => {
        if (newPlayer && newPlayer.getPlayerState && newPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
            let curr = newPlayer.getCurrentTime();
            let d = newPlayer.getDuration();
            if(!d) return;

            document.getElementById('timeTotal').innerText = "-" + formatoTiempo(d - curr);
            document.getElementById('barraProgreso').max = d;
            document.getElementById('timeActual').innerText = formatoTiempo(curr);
            document.getElementById('barraProgreso').value = curr;
            document.getElementById('miniProgress').style.width = ((curr / d) * 100) + "%";
            
            // EL DJ sigue vivo
            const restante = d - curr;
            if (restante <= 8 && restante > 1 && !isMixing) {
                isMixing = true; 
                nextSong(null, true); 
            }
        }
    }, 500);

    if (isCrossfade) {
        let volOut = 100;
        let fadeOutInt = setInterval(() => {
            volOut -= 5; 
            if (volOut <= 5) { 
                oldPlayer.stopVideo(); 
                clearInterval(fadeOutInt); 
            } else { oldPlayer.setVolume(volOut); }
        }, 250);

        let volIn = 0;
        let fadeInInt = setInterval(() => {
            volIn += 5;
            if (volIn >= 95) { 
                newPlayer.setVolume(100); 
                clearInterval(fadeInInt); 
            } else { newPlayer.setVolume(volIn); }
        }, 250);
    }

    document.getElementById('barraProgreso').oninput = (e) => { newPlayer.seekTo(e.target.value, true); };
}

function togglePlay(e) {
    if(e) e.stopPropagation();
    const p = getActivePlayer();
    if (p && p.getPlayerState) {
        if (p.getPlayerState() === YT.PlayerState.PLAYING) { 
            p.pauseVideo(); 
            actualizarBotonesPlay(svgPlay); 
        } else { 
            p.playVideo(); 
            actualizarBotonesPlay(svgPause); 
        }
    }
}
