let playlist = []; 
let currentIndex = -1; 
let memoriasInicio = { favs: [], dembow: [], trap: [], biblioteca: [] }; 
let isInfinityMode = false;
let activeDeck = 1; 
let isMixing = false;

function getAudio() { return document.getElementById('audio' + activeDeck); }

let audioDesbloqueado = false;
document.addEventListener('touchstart', function() {
    if (!audioDesbloqueado) {
        document.getElementById('audio1').play().catch(() => {});
        document.getElementById('audio2').play().catch(() => {});
        audioDesbloqueado = true;
    }
}, { once: true });

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

function descargarCancion(e) {
    if(e) e.stopPropagation();
    if(currentIndex === -1) return;
    const song = playlist[currentIndex];
    let biblioteca = JSON.parse(localStorage.getItem('FamiMusic_Lib')) || [];

    if(!biblioteca.some(s => s.id === song.id)) {
        biblioteca.unshift(song); 
        localStorage.setItem('FamiMusic_Lib', JSON.stringify(biblioteca));
        document.getElementById('btnDownload').innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`;
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
        container.innerHTML = data.map((s, index) => crearHTMLTarjeta(s, `playDesdeCarrusel('${memoriaKey}', ${index})`)).join('');
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
    } else { playIndex(0, false, false); }
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

// --- EL NUEVO REPRODUCTOR CERO DEMORAS ---
function playIndex(index, preserveTime = false, isCrossfade = false) {
    isMixing = isCrossfade;

    const oldAudio = getAudio(); 
    let newDeck = activeDeck === 1 ? 2 : 1; 
    const audio = document.getElementById('audio' + newDeck); 

    if (isCrossfade) {
        oldAudio.ontimeupdate = null;
        oldAudio.onended = null;
        activeDeck = newDeck; 
    } else {
        oldAudio.pause();
        oldAudio.volume = 1;
        oldAudio.ontimeupdate = null;
        oldAudio.onended = null;
    }

    currentIndex = index; 
    const song = playlist[index]; 
    const player = document.getElementById('player');
    
    guardarHistorial(song.title);
    
    let trackStr = song.title.includes("-") ? song.title.split("-").slice(1).join("-").trim() : song.title;
    let artistStr = song.title.includes("-") ? song.title.split("-")[0].trim() : "YouTube Audio";

    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({ title: trackStr, artist: artistStr, artwork: [{ src: song.thumb, sizes: '512x512', type: 'image/jpeg' }] });
        navigator.mediaSession.setActionHandler('play', () => { getAudio().play(); actualizarBotonesPlay(svgPause); });
        navigator.mediaSession.setActionHandler('pause', () => { document.getElementById('audio1').pause(); document.getElementById('audio2').pause(); actualizarBotonesPlay(svgPlay); });
        navigator.mediaSession.setActionHandler('previoustrack', () => prevSong());
        navigator.mediaSession.setActionHandler('nexttrack', () => nextSong());
    }

    document.getElementById('trackName').innerText = isCrossfade ? "Mezclando..." : trackStr;
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
    player.classList.add('active');

    // LA MAGIA: Le asignamos la dirección web y le damos Play inmediatamente, sin usar 'await'
    audio.src = "/stream/" + song.id;
    
    audio.onended = () => { nextSong(); };
    
    audio.ondurationchange = () => {
        document.getElementById('barraProgreso').max = audio.duration;
        document.getElementById('timeTotal').innerText = "-" + formatoTiempo(audio.duration);
    };

    audio.ontimeupdate = () => {
        let d = audio.duration;
        if (isNaN(d) || !d) return;

        document.getElementById('timeTotal').innerText = "-" + formatoTiempo(d - audio.currentTime);
        document.getElementById('timeActual').innerText = formatoTiempo(audio.currentTime);
        document.getElementById('barraProgreso').value = audio.currentTime;
        document.getElementById('miniProgress').style.width = ((audio.currentTime / d) * 100) + "%";
        
        const restante = d - audio.currentTime;
        if (restante <= 8 && restante > 1 && !isMixing) {
            isMixing = true; 
            nextSong(null, true); 
        }
    };

    if (isCrossfade) {
        audio.volume = 0;
        audio.play().catch(()=>{});
        
        let volOut = 1.0;
        let fadeOutInt = setInterval(() => {
            volOut -= 0.05; 
            if (volOut <= 0.05) { oldAudio.pause(); oldAudio.volume = 1; clearInterval(fadeOutInt); } 
            else { oldAudio.volume = volOut; }
        }, 250);

        let volIn = 0;
        let fadeInInt = setInterval(() => {
            volIn += 0.05;
            if (volIn >= 0.95) { audio.volume = 1; clearInterval(fadeInInt); } 
            else { audio.volume = volIn; }
        }, 250);
        
    } else {
        audio.volume = 1;
        audio.play().catch(()=>{});
    }

    document.getElementById('barraProgreso').oninput = (e) => { audio.currentTime = e.target.value; };
}

function actualizarBotonesPlay(svgString) { 
    document.getElementById('btnPlayPauseMini').innerHTML = svgString; 
    document.getElementById('btnPlayPauseBig').innerHTML = svgString; 
}

function togglePlay(e) {
    if(e) e.stopPropagation();
    const mainAudio = getAudio();
    if (mainAudio.paused) { 
        mainAudio.play(); 
        actualizarBotonesPlay(svgPause); 
    } else { 
        mainAudio.pause(); 
        actualizarBotonesPlay(svgPlay); 
    }
}
