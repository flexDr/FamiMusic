let playlist = []; 
let currentIndex = -1; 
let memoriasInicio = { favs: [], dembow: [], trap: [], biblioteca: [] }; 
let isInfinityMode = false;
let isVideoMode = false; 
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

function anunciarDJ(cancion, artista, esMezcla) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); 
    let frasesInicio = [
        `¡Sube el volumen, aquí viene ${cancion}!`,
        `¡Activo! Soltando ${cancion}.`,
        `¡Atención la cabina, entra ${cancion}!`
    ];
    let frasesMezcla = [`¡Sin pausas! Mezclando ${cancion}.`, `¡Cambiando el ritmo con ${cancion}!`];
    let texto = esMezcla ? frasesMezcla[Math.floor(Math.random() * frasesMezcla.length)] : frasesInicio[Math.floor(Math.random() * frasesInicio.length)];
    let msg = new SpeechSynthesisUtterance(texto);
    msg.lang = 'es-US'; 
    msg.rate = 1.15; 
    msg.pitch = 1.1; 
    window.speechSynthesis.speak(msg);
}

const svgPlay = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
const svgPause = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

// === EL NUEVO CEREBRO (BUSCADOR DIRECTO DESDE TU MAC/IPHONE) ===
async function buscarEnRedGlobal(query) {
    const nodos = [
        "https://invidious.jing.rocks",
        "https://inv.tux.pizza",
        "https://invidious.nerdvpn.de",
        "https://inv.nadeko.net"
    ];
    nodos.sort(() => Math.random() - 0.5); // Aleatorio para no saturar

    for (let nodo of nodos) {
        try {
            const res = await fetch(`${nodo}/api/v1/search?q=${encodeURIComponent(query)}&type=video`);
            if (!res.ok) continue;
            const data = await res.json();
            let resultados = [];
            for (let item of data) {
                if (item.videoId) {
                    resultados.push({
                        id: item.videoId,
                        title: item.title,
                        thumb: `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg` // Imagen HD directa que Safari sí acepta
                    });
                }
                if (resultados.length >= 15) break;
            }
            if (resultados.length > 0) return resultados;
        } catch (e) { console.log("Fallo nodo, intentando el siguiente..."); }
    }
    return [];
}

function toggleVideoMode(e) {
    if(e) e.stopPropagation();
    isVideoMode = !isVideoMode;
    const btn = document.getElementById('btnToggleVideo');
    if (btn) {
        if (isVideoMode) {
            btn.classList.add('active');
            getAudio().classList.add('show-video');
        } else {
            btn.classList.remove('active');
            document.getElementById('audio1').classList.remove('show-video');
            document.getElementById('audio2').classList.remove('show-video');
        }
    }
    if (currentIndex !== -1) playIndex(currentIndex, true, false); 
}

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
    const defaults = ["Dembow Dominicano hits", "Trap Latino Mix", "Anuel AA exitos"];
    return defaults[Math.floor(Math.random() * defaults.length)];
}

const poolDembow = ["Dembow Dominicano hits", "El Alfa Mix Oficial", "Rochy RD Dembow", "Tokischa Mix"];
const poolTrap = ["Trap Latino Mix", "Anuel AA Trap", "Eladio Carrion Mix"];

window.onload = async () => {
    cargarCarrusel(obtenerQueryInteligente(), "carousel1", "favs");
    cargarCarrusel(poolDembow[Math.floor(Math.random() * poolDembow.length)], "carousel2", "dembow");
    cargarCarrusel(poolTrap[Math.floor(Math.random() * poolTrap.length)], "carousel3", "trap");
    cargarBiblioteca(); 
    
    // Hacemos que toda el área del reproductor sea clicable para maximizar
    const player = document.getElementById('player');
    if(player) {
        player.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
                toggleFullScreen();
            }
        });
    }
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
    let artist = "YouTube Oficial";
    if (s.title.includes("-")) {
        let parts = s.title.split("-");
        artist = parts[0].trim();
        title = parts.slice(1).join("-").trim();
    }
    return `<div class="card" onclick="${actionStr}">
        <img src="${s.thumb}" onerror="this.src='https://ui-avatars.com/api/?name=Mix&background=2a2a2a&color=fff'">
        <div class="card-title">${title}</div><div class="card-subtitle">${artist}</div>
    </div>`;
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
    const container = document.getElementById(containerId);
    try {
        const data = await buscarEnRedGlobal(query);
        if (data.length > 0) {
            memoriasInicio[memoriaKey] = data; 
            container.innerHTML = data.map((s, index) => crearHTMLTarjeta(s, `playDesdeCarrusel('${memoriaKey}', ${index})`)).join('');
        }
    } catch (e) {
        container.innerHTML = `<p style="padding:20px; color:#fa233b;">Error de conexión. Intenta recargar.</p>`;
    }
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
            const data = await buscarEnRedGlobal(query);
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
            const data = await buscarEnRedGlobal(artist + " mix oficial");
            if(data.length > 0) {
                playlist = playlist.concat(data);
                playIndex(currentIndex + 1, false, isCrossfade);
            }
        } catch(err) { playIndex(0, false, false); }
    } else { playIndex(0, false, false); }
}

function prevSong(e) { if(e) e.stopPropagation(); if (currentIndex > 0) playIndex(currentIndex - 1, false, false); }

function toggleFullScreen(e) {
    if(e) e.stopPropagation();
    const player = document.getElementById('player');
    const nav = document.getElementById('appNav');
    if(player && player.classList.contains('active')) {
        player.classList.toggle('fullscreen');
        if (nav) nav.style.transform = player.classList.contains('fullscreen') ? 'translateY(100%)' : 'translateY(0)'; 
    }
}

function formatoTiempo(segundos) {
    if (!segundos || isNaN(segundos)) return "0:00";
    const min = Math.floor(segundos / 60);
    const sec = Math.floor(segundos % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

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
    let artistStr = song.title.includes("-") ? song.title.split("-")[0].trim() : "Fami Music";

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
    
    // Forzamos al reproductor a levantarse para que lo veas claro
    player.classList.add('active');
    setTimeout(() => {
        if(!player.classList.contains('fullscreen')) {
            player.classList.add('fullscreen');
            const nav = document.getElementById('appNav');
            if (nav) nav.style.transform = 'translateY(100%)';
        }
    }, 150);

    // === REPRODUCCIÓN DIRECTA DESDE LA MAC/IPHONE (Adiós Render) ===
    const nodos_inv = ["https://invidious.jing.rocks", "https://inv.tux.pizza", "https://invidious.nerdvpn.de", "https://inv.nadeko.net"];
    const nodoSeleccionado = nodos_inv[Math.floor(Math.random() * nodos_inv.length)];
    
    if (isVideoMode) {
        oldAudio.classList.remove('show-video');
        audio.classList.add('show-video');
        audio.src = `${nodoSeleccionado}/latest_version?id=${song.id}&itag=18&local=true`;
    } else {
        audio.src = `${nodoSeleccionado}/latest_version?id=${song.id}&itag=140&local=true`;
        if (!preserveTime) anunciarDJ(trackStr, artistStr, isCrossfade);
    }

    iniciarReproduccion(audio, oldAudio, isCrossfade, preserveTime);

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
    document.getElementById('barraProgreso').oninput = (e) => { audio.currentTime = e.target.value; };
}

function iniciarReproduccion(audio, oldAudio, isCrossfade, preserveTime) {
    try { if (preserveTime && typeof previousTime !== 'undefined' && previousTime > 0) audio.currentTime = previousTime; } catch(err) {}
    
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
