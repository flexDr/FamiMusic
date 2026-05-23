let playlist = []; 
let currentIndex = -1; 
let memoriasInicio = { favs: [], dembow: [], trap: [], biblioteca: [] }; 
let isVideoMode = false; 
let isInfinityMode = false;

let activeDeck = 1; 
let isMixing = false;
let fallosSeguidos = 0; 

function getAudio() { return document.getElementById('audio' + activeDeck); }

let audioDesbloqueado = false;
document.addEventListener('touchstart', function() {
    if (!audioDesbloqueado) {
        document.getElementById('audio1').play().then(() => document.getElementById('audio1').pause()).catch(() => {});
        document.getElementById('audio2').play().then(() => document.getElementById('audio2').pause()).catch(() => {});
        audioDesbloqueado = true;
    }
}, { once: true });

document.addEventListener("visibilitychange", () => {
    const audio = getAudio();
    if (document.hidden && isVideoMode && !audio.paused) {
        setTimeout(() => { audio.play().catch(()=>{}); }, 50);
    }
});

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

// === EL NUEVO MOTOR DIRECTO AL CELULAR ===
async function getDirectAudio(id) {
    const nodes = [
        "https://pipedapi.kavin.rocks",
        "https://pipedapi.smnz.de",
        "https://pipedapi.tokhmi.xyz"
    ];
    for (let node of nodes) {
        try {
            const res = await fetch(`${node}/streams/${id}`);
            const data = await res.json();
            if (data.audioStreams) {
                // Buscamos M4A puro, el formato sagrado de Apple
                const track = data.audioStreams.find(s => s.format === 'M4A');
                if (track && track.url) return track.url;
            }
        } catch(e) { continue; }
    }
    return null;
}

function toggleVideoMode(e) {
    if(e) e.stopPropagation();
    isVideoMode = !isVideoMode;
    const btn = document.getElementById('btnToggleVideo');
    if (isVideoMode) {
        btn.classList.add('active');
        getAudio().classList.add('show-video');
    } else {
        btn.classList.remove('active');
        document.getElementById('audio1').classList.remove('show-video');
        document.getElementById('audio2').classList.remove('show-video');
    }
    if (currentIndex !== -1) playIndex(currentIndex, true, false); 
}

async function descargarCancion(e) {
    if(e) e.stopPropagation();
    if(currentIndex === -1) return;
    const song = playlist[currentIndex];
    let biblioteca = JSON.parse(localStorage.getItem('FamiMusic_Lib')) || [];

    if(!biblioteca.some(s => s.id === song.id)) {
        const btn = document.getElementById('btnDownload');
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="var(--accent)"><circle cx="12" cy="12" r="10" opacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10h-2a8 8 0 0 0-8-8V2z"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></path></svg>`;
        try {
            const directUrl = await getDirectAudio(song.id);
            if (!directUrl) throw new Error("No URL");
            
            song.offlineUrl = directUrl; 
            biblioteca.unshift(song); 
            localStorage.setItem('FamiMusic_Lib', JSON.stringify(biblioteca));
            btn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`;
            cargarBiblioteca();
        } catch(error) {
            btn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`;
        }
    }
}

function cargarBiblioteca() {
    let biblioteca = JSON.parse(localStorage.getItem('FamiMusic_Lib')) || [];
    const libView = document.getElementById('libraryView');
    memoriasInicio['biblioteca'] = biblioteca; 
    if (biblioteca.length === 0) {
        libView.innerHTML = `<div style="padding: 40px 20px; text-align: center; color: #888;"><p>Las canciones descargadas estarán aquí.</p></div>`;
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

async function playIndex(index, preserveTime = false, isCrossfade = false) {
    if (isCrossfade) isMixing = true; 
    else isMixing = false;

    const oldAudio = getAudio(); 
    let newDeck = activeDeck === 1 ? 2 : 1; 
    const nextAudio = document.getElementById('audio' + newDeck); 

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

    const audio = getAudio(); 
    currentIndex = index; 
    const song = playlist[index]; 
    const player = document.getElementById('player');
    
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
        navigator.mediaSession.setActionHandler('play', () => { getAudio().play(); actualizarBotonesPlay(svgPause); });
        navigator.mediaSession.setActionHandler('pause', () => { document.getElementById('audio1').pause(); document.getElementById('audio2').pause(); actualizarBotonesPlay(svgPlay); });
        navigator.mediaSession.setActionHandler('previoustrack', () => prevSong());
        navigator.mediaSession.setActionHandler('nexttrack', () => nextSong());
    }

    audio.volume = 0; 
    document.getElementById('trackName').innerText = isCrossfade ? "Mezclando pista..." : "Cargando...";
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

    try {
        let mediaUrl = "";

        if (song.offlineUrl && !isVideoMode) {
            mediaUrl = song.offlineUrl;
        } else {
            // El celular hace la magia aquí, sin pasar por Render
            mediaUrl = await getDirectAudio(song.id);
            if (!mediaUrl) throw new Error("Fallo de extracción en el celular");
        }

        audio.src = mediaUrl;
        audio.onended = () => { nextSong(); };
        
        audio.ontimeupdate = () => {
            let d = Math.floor(audio.duration);
            if (isNaN(d) || !d) return;

            document.getElementById('timeTotal').innerText = "-" + formatoTiempo(d - audio.currentTime);
            document.getElementById('barraProgreso').max = d;
            document.getElementById('timeActual').innerText = formatoTiempo(audio.currentTime);
            document.getElementById('barraProgreso').value = audio.currentTime;
            document.getElementById('miniProgress').style.width = ((audio.currentTime / d) * 100) + "%";
            
            const restante = d - audio.currentTime;
            if (restante <= 8 && restante > 1 && !isMixing) {
                isMixing = true; 
                nextSong(null, true); 
            }
        };

        document.getElementById('trackName').innerText = trackStr;
        
        if (isVideoMode) {
            oldAudio.classList.remove('show-video');
            audio.classList.add('show-video');
        }

        try { if (preserveTime && typeof previousTime !== 'undefined' && previousTime > 0) audio.currentTime = previousTime; } catch(err) {}

        if (isCrossfade) {
            audio.play().catch(()=>{});
            
            let volOut = 1.0;
            let fadeOutInt = setInterval(() => {
                volOut -= 0.05; 
                if (volOut <= 0.05) { 
                    oldAudio.pause(); 
                    oldAudio.volume = 1; 
                    clearInterval(fadeOutInt); 
                } else { oldAudio.volume = volOut; }
            }, 250);

            let volIn = 0;
            let fadeInInt = setInterval(() => {
                volIn += 0.05;
                if (volIn >= 0.95) { 
                    audio.volume = 1; 
                    clearInterval(fadeInInt); 
                } else { audio.volume = volIn; }
            }, 250);
            
        } else {
            audio.volume = 1;
            audio.play().catch(()=>{});
        }
        
        document.getElementById('barraProgreso').oninput = (e) => { getAudio().currentTime = e.target.value; };
        fallosSeguidos = 0; 

    } catch (error) {
        fallosSeguidos++;
        audio.volume = 1;
        audio.onended = null;
        audio.ontimeupdate = null;
        isMixing = false; 
        
        if (fallosSeguidos >= 3) {
            document.getElementById('trackName').innerText = "❌ Conexión inestable. Pausado.";
            actualizarBotonesPlay(svgPlay);
        } else {
            document.getElementById('trackName').innerText = "⚠️ Buscando fuente limpia...";
            if(isVideoMode) {
                isVideoMode = false;
                document.getElementById('btnToggleVideo').classList.remove('active');
            }
            setTimeout(() => nextSong(null, false), 1500); 
        }
    }
}

function actualizarBotonesPlay(svgString) { 
    document.getElementById('btnPlayPauseMini').innerHTML = svgString; 
    document.getElementById('btnPlayPauseBig').innerHTML = svgString; 
}

function togglePlay(e) {
    if(e) e.stopPropagation();
    const audio1 = document.getElementById('audio1');
    const audio2 = document.getElementById('audio2');
    const mainAudio = getAudio();
    if (mainAudio.paused) { 
        mainAudio.play(); 
        actualizarBotonesPlay(svgPause); 
    } else { 
        audio1.pause(); 
        audio2.pause(); 
        actualizarBotonesPlay(svgPlay); 
    }
}
