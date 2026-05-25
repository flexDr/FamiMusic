let playlistActual = [];
let indiceActual = 0;
let modoVideo = false;

// Elementos del DOM
const audioEl = document.getElementById('main-audio');
const videoEl = document.getElementById('player-video');
const imgEl = document.getElementById('player-img');
const playerUI = document.getElementById('player-ui');
const btnPlayPause = document.getElementById('btn-play-pause');

// === 1. CARGAR EL INICIO PROFESIONAL ===
window.onload = () => {
    // Aquí puedes poner las rutas correctas a tu backend para cargar cada fila
    cargarFila("mix exitos 2026", "sec-destacadas");
    cargarHistorial("sec-recientes"); // Lee del LocalStorage
    cargarFila("trap latino y reggaeton", "sec-recomendado");
    cargarFila("dembow dominicano hits", "sec-dembow");
    cargarFila("bachata dominicana exitos", "sec-bachata");
};

async function cargarFila(busqueda, contenedorId) {
    // Ajusta la URL "/search" por la que estés usando ahora con DeepSeek
    try {
        const respuesta = await fetch(`/search/${encodeURIComponent(busqueda)}`);
        const datos = await respuesta.json();
        const html = datos.map((cancion, index) => {
            return `
            <div class="card" onclick="reproducirPista(${index}, '${escape(JSON.stringify(datos))}')">
                <img src="${cancion.thumb}" alt="Cover">
                <div class="card-title">${cancion.title}</div>
                <div class="card-artist">Fami Music</div>
            </div>`;
        }).join('');
        document.getElementById(contenedorId).innerHTML = html;
    } catch (e) {
        console.log("Error cargando fila: ", busqueda);
    }
}

function cargarHistorial(contenedorId) {
    let historial = JSON.parse(localStorage.getItem('Fami_Historial')) || [];
    if(historial.length === 0) {
        document.getElementById(contenedorId).innerHTML = '<p style="color:#a1a1a6; font-size:14px;">Aún no hay canciones escuchadas.</p>';
        return;
    }
    // Renderizar historial...
}

// === 2. EL MOTOR DE REPRODUCCIÓN (INTEGRACIÓN DE DEEPSEEK) ===
function reproducirPista(indice, listaStringificada) {
    playlistActual = JSON.parse(unescape(listaStringificada));
    indiceActual = indice;
    const cancion = playlistActual[indiceActual];

    // Subir la interfaz de Apple Music
    playerUI.classList.add('active');
    document.getElementById('player-title').innerText = cancion.title;
    imgEl.src = cancion.thumb;

    // Guardar en historial
    guardarEnHistorial(cancion);

    // =========================================================
    // AQUÍ PONES EL CÓDIGO DE REPRODUCCIÓN QUE TE DIO DEEPSEEK
    // Ejemplo:
    // const urlMusica = `/tu_ruta_magica_deepseek?id=${cancion.id}`;
    // audioEl.src = urlMusica;
    // videoEl.src = urlMusica; // Si tu ruta soporta MP4 de video
    // =========================================================

    if(modoVideo) {
        videoEl.play().catch(e => console.log(e));
        audioEl.pause();
    } else {
        audioEl.play().catch(e => console.log(e));
        videoEl.pause();
    }
    
    btnPlayPause.innerText = "⏸";
}

// === 3. REPRODUCCIÓN AUTOMÁTICA (SIGUIENTE CANCIÓN) ===
audioEl.onended = () => cancionSiguiente();
videoEl.onended = () => cancionSiguiente();

function cancionSiguiente() {
    if (indiceActual < playlistActual.length - 1) {
        reproducirPista(indiceActual + 1, escape(JSON.stringify(playlistActual)));
    } else {
        // Si se acaba la lista, vuelve a la primera
        reproducirPista(0, escape(JSON.stringify(playlistActual)));
    }
}

function cancionAnterior() {
    if (indiceActual > 0) {
        reproducirPista(indiceActual - 1, escape(JSON.stringify(playlistActual)));
    }
}

// === 4. CONTROLES Y VIDEO ===
function togglePlay() {
    const medioActivo = modoVideo ? videoEl : audioEl;
    if (medioActivo.paused) {
        medioActivo.play();
        btnPlayPause.innerText = "⏸";
    } else {
        medioActivo.pause();
        btnPlayPause.innerText = "▶";
    }
}

function alternarVideo() {
    modoVideo = !modoVideo;
    const btn = document.getElementById('btn-video');
    
    if(modoVideo) {
        imgEl.classList.remove('active');
        videoEl.classList.add('active');
        btn.classList.add('on');
        btn.innerText = "Desactivar Video";
        
        // Pausar audio, arrancar video en el mismo segundo
        videoEl.currentTime = audioEl.currentTime;
        audioEl.pause();
        videoEl.play();
    } else {
        videoEl.classList.remove('active');
        imgEl.classList.add('active');
        btn.classList.remove('on');
        btn.innerText = "Activar Video";
        
        // Pausar video, arrancar audio en el mismo segundo
        audioEl.currentTime = videoEl.currentTime;
        videoEl.pause();
        audioEl.play();
    }
}

function cerrarReproductor() {
    playerUI.classList.remove('active');
}

// === 5. BARRA DE PROGRESO ===
function actualizarProgreso(medio) {
    const actual = document.getElementById('time-current');
    const total = document.getElementById('time-total');
    const barra = document.getElementById('progress-bar');
    
    if(!isNaN(medio.duration)) {
        barra.max = medio.duration;
        barra.value = medio.currentTime;
        actual.innerText = formatearTiempo(medio.currentTime);
        total.innerText = "-" + formatearTiempo(medio.duration - medio.currentTime);
    }
}

audioEl.ontimeupdate = () => { if(!modoVideo) actualizarProgreso(audioEl); };
videoEl.ontimeupdate = () => { if(modoVideo) actualizarProgreso(videoEl); };

document.getElementById('progress-bar').oninput = (e) => {
    const medioActivo = modoVideo ? videoEl : audioEl;
    medioActivo.currentTime = e.target.value;
};

function formatearTiempo(segundos) {
    let min = Math.floor(segundos / 60);
    let sec = Math.floor(segundos % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function guardarEnHistorial(cancion) {
    let historial = JSON.parse(localStorage.getItem('Fami_Historial')) || [];
    historial = historial.filter(c => c.id !== cancion.id);
    historial.unshift(cancion);
    if(historial.length > 10) historial.pop();
    localStorage.setItem('Fami_Historial', JSON.stringify(historial));
}
