let playlistActual = [];
let indiceActual = 0;
let modoVideoActivo = false;
let reproductorYT = null;
let progresoIntervalo = null;
let ultimaVista = 'inicio';

// DOM
const elArte = document.getElementById('arte-cancion');
const uiRep = document.getElementById('reproductor-ui');
const btnPlay = document.getElementById('btn-play');
const barra = document.getElementById('barra-progreso');
const miniPlayer = document.getElementById('mini-player');
const btnMiniPlay = document.getElementById('mini-play-btn');
const cajaMedia = document.getElementById('media-box-anim');

// 1. INICIALIZAR YOUTUBE (DeepSeek Engine)
function onYouTubeIframeAPIReady() {
    reproductorYT = new YT.Player('yt-video-container', {
        height: '100%',
        width: '100%',
        videoId: '',
        playerVars: { 'playsinline': 1, 'controls': 0, 'disablekb': 1, 'rel': 0, 'modestbranding': 1 },
        events: { 'onStateChange': cambioEstadoReproductor }
    });
}

function cambioEstadoReproductor(event) {
    if (event.data === YT.PlayerState.ENDED) pistaSiguiente();
    if (event.data === YT.PlayerState.PLAYING) actualizarUIPlay(true);
    if (event.data === YT.PlayerState.PAUSED) actualizarUIPlay(false);
}

// 2. SISTEMA DE TABS (MENÚ INFERIOR)
function cambiarTab(idVista, tabApretado) {
    document.querySelectorAll('.vista').forEach(v => v.classList.remove('activa'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('activo'));
    
    document.getElementById('vista-' + idVista).classList.add('activa');
    tabApretado.classList.add('activo');
    
    if(idVista === 'biblioteca') cargarBiblioteca();
}

// 3. CARGA DE CONTENIDO INICIAL
window.onload = () => {
    cargarFila("mix exitos globales", "fila-destacadas");
    cargarHistorial();
    cargarFila("dembow dominicano hits", "fila-dembow");
};

async function cargarFila(busqueda, idContenedor, esGrid = false) {
    const contenedor = document.getElementById(idContenedor);
    contenedor.innerHTML = '<div class="mensaje-carga">Buscando temas...</div>';
    try {
        const res = await fetch(`/search/${encodeURIComponent(busqueda)}`);
        const datos = await res.json();
        if (!datos || datos.length === 0) throw new Error("Vacío");

        contenedor.innerHTML = datos.map((cancion, index) => `
            <div class="card tarjeta" onclick="iniciarPista(${index}, '${escape(JSON.stringify(datos))}')">
                <img src="${cancion.thumb}" onerror="this.src='https://ui-avatars.com/api/?name=Mix&background=1c1c1e&color=fff'">
                <div class="titulo-tarjeta">${cancion.title}</div>
                <div class="artista-tarjeta">Fami Music</div>
            </div>
        `).join('');
    } catch (e) { contenedor.innerHTML = '<div class="mensaje-carga">Error al cargar.</div>'; }
}

// 4. BUSCADOR EN VIVO
let searchTimeout = null;
document.getElementById('input-buscador').oninput = (e) => {
    const query = e.target.value.trim();
    if (query.length < 2) return;
    clearTimeout(searchTimeout);
    document.getElementById('grid-buscar').innerHTML = '<div class="mensaje-carga" style="width:100%;text-align:center;">Buscando...</div>';
    
    searchTimeout = setTimeout(() => {
        cargarFila(query, 'grid-buscar', true);
    }, 800);
};

// 5. HISTORIAL Y BIBLIOTECA
function cargarHistorial() {
    let historial = JSON.parse(localStorage.getItem('Fami_Memoria')) || [];
    const cont = document.getElementById('fila-recientes');
    if(historial.length === 0) { cont.innerHTML = '<div class="mensaje-carga">Aún no hay música.</div>'; return; }
    cont.innerHTML = historial.map((c, i) => `
        <div class="card tarjeta" onclick="iniciarPista(${i}, '${escape(JSON.stringify(historial))}')">
            <img src="${c.thumb}">
            <div class="titulo-tarjeta">${c.title}</div>
            <div class="artista-tarjeta">Reciente</div>
        </div>
    `).join('');
}

function cargarBiblioteca() {
    let lib = JSON.parse(localStorage.getItem('Fami_Memoria')) || [];
    const cont = document.getElementById('grid-biblioteca');
    if(lib.length === 0) { cont.innerHTML = '<div class="mensaje-carga" style="width:100%;text-align:center;">Tu biblioteca está vacía.</div>'; return; }
    cont.innerHTML = lib.map((c, i) => `
        <div class="card tarjeta" onclick="iniciarPista(${i}, '${escape(JSON.stringify(lib))}')">
            <img src="${c.thumb}">
            <div class="titulo-tarjeta">${c.title}</div>
            <div class="artista-tarjeta">Fami Music</div>
        </div>
    `).join('');
}

function guardarEnHistorial(cancion) {
    let h = JSON.parse(localStorage.getItem('Fami_Memoria')) || [];
    h = h.filter(item => item.id !== cancion.id);
    h.unshift(cancion);
    if(h.length > 20) h.pop();
    localStorage.setItem('Fami_Memoria', JSON.stringify(h));
    cargarHistorial(); 
}

// 6. VOZ DEL DJ (IA)
function anunciarDJ(cancion) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); 
    let frases = [`¡Aquí viene ${cancion}!`, `¡Soltando ${cancion}.`, `¡Entra ${cancion}!`];
    let msg = new SpeechSynthesisUtterance(frases[Math.floor(Math.random() * frases.length)]);
    msg.lang = 'es-US'; msg.rate = 1.15; msg.pitch = 1.1; 
    window.speechSynthesis.speak(msg);
}

// 7. EL REPRODUCTOR
function iniciarPista(indice, listaString) {
    if (!reproductorYT) return alert("Cargando motor de música...");
    playlistActual = JSON.parse(unescape(listaString));
    indiceActual = indice;
    const pista = playlistActual[indiceActual];

    // Llenar Datos UI Full
    document.getElementById('titulo-actual').innerText = pista.title;
    elArte.src = pista.thumb;
    
    // Llenar Datos Mini Player
    document.getElementById('mini-title').innerText = pista.title;
    document.getElementById('mini-img').src = pista.thumb;
    miniPlayer.classList.add('activo');
    
    guardarEnHistorial(pista);
    anunciarDJ(pista.title);

    reproductorYT.loadVideoById(pista.id);
    abrirReproductor();

    clearInterval(progresoIntervalo);
    progresoIntervalo = setInterval(actualizarBarra, 500);
}

function abrirReproductor() { uiRep.classList.add('activo'); }
function cerrarReproductor() { uiRep.classList.remove('activo'); }

// 8. CONTROLES
function alternarPlay() {
    if (!reproductorYT) return;
    reproductorYT.getPlayerState() === 1 ? reproductorYT.pauseVideo() : reproductorYT.playVideo();
}
function alternarPlayFiltro(e) {
    e.stopPropagation(); // Evita que se abra el reproductor grande al darle al botoncito de play
    alternarPlay();
}

function actualizarUIPlay(estaSonando) {
    if (estaSonando) {
        btnPlay.innerText = "⏸";
        btnMiniPlay.innerText = "⏸";
        cajaMedia.classList.remove('pausado');
    } else {
        btnPlay.innerText = "▶";
        btnMiniPlay.innerText = "▶";
        cajaMedia.classList.add('pausado'); // Efecto de encoger la portada
    }
}

function alternarModoVideo() {
    modoVideoActivo = !modoVideoActivo;
    const btnV = document.getElementById('btn-toggle-video');
    if (modoVideoActivo) {
        elArte.classList.add('oculto');
        btnV.classList.add('encendido');
        btnV.innerText = "Ver Portada";
    } else {
        elArte.classList.remove('oculto');
        btnV.classList.remove('encendido');
        btnV.innerText = "Ver Video";
    }
}

function pistaSiguiente() {
    if (indiceActual < playlistActual.length - 1) iniciarPista(indiceActual + 1, escape(JSON.stringify(playlistActual)));
    else iniciarPista(0, escape(JSON.stringify(playlistActual)));
}
function pistaAnterior() {
    if (indiceActual > 0) iniciarPista(indiceActual - 1, escape(JSON.stringify(playlistActual)));
}

// 9. BARRA DE PROGRESO
function formatoTiempo(segundos) {
    if (isNaN(segundos) || segundos < 0) return "0:00";
    let min = Math.floor(segundos / 60);
    let sec = Math.floor(segundos % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function actualizarBarra() {
    if (!reproductorYT || !reproductorYT.getDuration) return;
    const duracion = reproductorYT.getDuration();
    const actual = reproductorYT.getCurrentTime();
    if (duracion > 0) {
        barra.max = duracion;
        barra.value = actual;
        document.getElementById('tiempo-actual').innerText = formatoTiempo(actual);
        document.getElementById('tiempo-restante').innerText = "-" + formatoTiempo(duracion - actual);
    }
}

barra.oninput = (e) => { if (reproductorYT) reproductorYT.seekTo(e.target.value, true); };
