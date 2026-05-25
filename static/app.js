let playlistActual = [];
let indiceActual = 0;
let modoVideoActivo = false;
let reproductorYT = null;
let progresoIntervalo = null;
let memoriasInicio = {}; // <- LA NUEVA RAM VIRTUAL (Evita que el código se riegue en pantalla)

const elArte = document.getElementById('arte-cancion');
const uiRep = document.getElementById('reproductor-ui');
const btnPlay = document.getElementById('btn-play');
const barra = document.getElementById('barra-progreso');
const miniPlayer = document.getElementById('mini-player');
const btnMiniPlay = document.getElementById('mini-play-btn');
const cajaMedia = document.getElementById('media-box-anim');

const iconPlay = `<svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
const iconPause = `<svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
const iconMiniPlay = `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
const iconMiniPause = `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

// === LIMPIEZA EXTREMA DE TEXTO ===
function limpiarTexto(html) {
    let txt = document.createElement("textarea");
    txt.innerHTML = html;
    // Eliminamos comillas dobles y simples para que NUNCA rompan el HTML
    return txt.value.replace(/['"]/g, '').trim(); 
}

function onYouTubeIframeAPIReady() {
    reproductorYT = new YT.Player('yt-video-container', {
        height: '100%', width: '100%', videoId: '',
        playerVars: { 'playsinline': 1, 'controls': 0, 'disablekb': 1, 'rel': 0, 'modestbranding': 1 },
        events: { 'onStateChange': cambioEstadoReproductor }
    });
}

function cambioEstadoReproductor(event) {
    if (event.data === YT.PlayerState.ENDED) pistaSiguiente();
    if (event.data === YT.PlayerState.PLAYING) actualizarUIPlay(true);
    if (event.data === YT.PlayerState.PAUSED) actualizarUIPlay(false);
}

function cambiarTab(idVista, tabApretado) {
    document.querySelectorAll('.vista').forEach(v => v.classList.remove('activa'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('activo'));
    document.getElementById('vista-' + idVista).classList.add('activa');
    tabApretado.classList.add('activo');
    if(idVista === 'biblioteca') cargarBiblioteca();
}

window.onload = () => {
    cargarFila("mix exitos globales", "fila-destacadas", false);
    cargarHistorial();
    cargarFila("dembow dominicano hits", "fila-dembow", false);
};

// Tarjeta Cuadrada (Inicio)
function crearHTMLTarjeta(cancion, index, idMemoria) {
    let tituloRaw = limpiarTexto(cancion.title);
    let artista = "Fami Music";
    let titulo = tituloRaw;
    if (tituloRaw.includes("-")) {
        let partes = tituloRaw.split("-");
        artista = partes[0].trim();
        titulo = partes.slice(1).join("-").trim();
    }
    return `
        <div class="tarjeta" onclick="iniciarPista(${index}, '${idMemoria}')">
            <img src="${cancion.thumb}" onerror="this.src='https://ui-avatars.com/api/?name=Mix&background=1c1c1e&color=fff'">
            <div class="titulo-tarjeta">${titulo}</div>
            <div class="artista-tarjeta">${artista}</div>
        </div>
    `;
}

// Lista Alargada (Búsqueda y Biblioteca)
function crearHTMLLista(cancion, index, idMemoria) {
    let tituloRaw = limpiarTexto(cancion.title);
    let artista = "Fami Music";
    let titulo = tituloRaw;
    if (tituloRaw.includes("-")) {
        let partes = tituloRaw.split("-");
        artista = partes[0].trim();
        titulo = partes.slice(1).join("-").trim();
    }
    return `
        <div class="tarjeta" onclick="iniciarPista(${index}, '${idMemoria}')">
            <img src="${cancion.thumb}" onerror="this.src='https://ui-avatars.com/api/?name=Mix&background=1c1c1e&color=fff'">
            <div class="textos-tarjeta">
                <div class="titulo-tarjeta">${titulo}</div>
                <div class="artista-tarjeta">${artista}</div>
            </div>
        </div>
    `;
}

async function cargarFila(busqueda, idContenedor, esLista = false) {
    const contenedor = document.getElementById(idContenedor);
    contenedor.innerHTML = '<div class="mensaje-carga">Buscando temas...</div>';
    try {
        const res = await fetch(`/search/${encodeURIComponent(busqueda)}`);
        const datos = await res.json();
        if (!datos || datos.length === 0) throw new Error("Vacío");
        
        memoriasInicio[idContenedor] = datos; // Guardamos en la memoria RAM, no en el HTML
        contenedor.innerHTML = datos.map((c, i) => esLista ? crearHTMLLista(c, i, idContenedor) : crearHTMLTarjeta(c, i, idContenedor)).join('');
    } catch (e) { contenedor.innerHTML = '<div class="mensaje-carga">Error al cargar la música.</div>'; }
}

let searchTimeout = null;
document.getElementById('input-buscador').oninput = (e) => {
    const query = e.target.value.trim();
    if (query.length < 2) return;
    clearTimeout(searchTimeout);
    document.getElementById('grid-buscar').innerHTML = '<div class="mensaje-carga">Buscando...</div>';
    searchTimeout = setTimeout(() => { cargarFila(query, 'grid-buscar', true); }, 800);
};

function cargarHistorial() {
    let historial = JSON.parse(localStorage.getItem('Fami_Memoria')) || [];
    const cont = document.getElementById('fila-recientes');
    if(historial.length === 0) { cont.innerHTML = '<div class="mensaje-carga">Aún no hay música escuchada.</div>'; return; }
    
    memoriasInicio['fila-recientes'] = historial;
    cont.innerHTML = historial.map((c, i) => crearHTMLTarjeta(c, i, 'fila-recientes')).join('');
}

function cargarBiblioteca() {
    let lib = JSON.parse(localStorage.getItem('Fami_Memoria')) || [];
    const cont = document.getElementById('grid-biblioteca');
    if(lib.length === 0) { cont.innerHTML = '<div class="mensaje-carga">Tu biblioteca está vacía.</div>'; return; }
    
    memoriasInicio['grid-biblioteca'] = lib;
    cont.innerHTML = lib.map((c, i) => crearHTMLLista(c, i, 'grid-biblioteca')).join('');
}

function guardarEnHistorial(cancion) {
    let h = JSON.parse(localStorage.getItem('Fami_Memoria')) || [];
    h = h.filter(item => item.id !== cancion.id);
    h.unshift(cancion);
    if(h.length > 20) h.pop();
    localStorage.setItem('Fami_Memoria', JSON.stringify(h));
    cargarHistorial(); 
}

function anunciarDJ(cancion) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); 
    let msg = new SpeechSynthesisUtterance(`¡Activo! Poniendo ${cancion}`);
    msg.lang = 'es-US'; msg.rate = 1.15; msg.pitch = 1.1; 
    window.speechSynthesis.speak(msg);
}

function iniciarPista(indice, idMemoria) {
    if (!reproductorYT) return alert("Cargando motor de audio...");
    
    // Leemos la lista desde la memoria RAM, evitando strings gigantes
    playlistActual = memoriasInicio[idMemoria]; 
    indiceActual = indice;
    const pista = playlistActual[indiceActual];

    let tituloRaw = limpiarTexto(pista.title);
    let artista = "Fami Music";
    let titulo = tituloRaw;
    if (tituloRaw.includes("-")) {
        let partes = tituloRaw.split("-");
        artista = partes[0].trim();
        titulo = partes.slice(1).join("-").trim();
    }

    document.getElementById('titulo-actual').innerText = titulo;
    document.getElementById('artista-actual').innerText = artista;
    elArte.src = pista.thumb;
    
    document.getElementById('mini-title').innerText = titulo;
    document.getElementById('mini-img').src = pista.thumb;
    miniPlayer.style.display = 'flex'; 

    guardarEnHistorial(pista);
    anunciarDJ(titulo);

    reproductorYT.loadVideoById(pista.id);
    abrirReproductor();

    clearInterval(progresoIntervalo);
    progresoIntervalo = setInterval(actualizarBarra, 500);
}

// === BLOQUEO DE PANTALLA ===
function abrirReproductor() { 
    uiRep.classList.add('activo'); 
    document.body.classList.add('bloqueado'); 
}
function cerrarReproductor() { 
    uiRep.classList.remove('activo'); 
    document.body.classList.remove('bloqueado'); 
}

function alternarPlay() {
    if (!reproductorYT) return;
    reproductorYT.getPlayerState() === 1 ? reproductorYT.pauseVideo() : reproductorYT.playVideo();
}
function alternarPlayFiltro(e) { e.stopPropagation(); alternarPlay(); }

function actualizarUIPlay(estaSonando) {
    if (estaSonando) {
        btnPlay.innerHTML = iconPause;
        btnMiniPlay.innerHTML = iconMiniPause;
        cajaMedia.classList.remove('pausado');
    } else {
        btnPlay.innerHTML = iconPlay;
        btnMiniPlay.innerHTML = iconMiniPlay;
        cajaMedia.classList.add('pausado'); 
    }
}

function alternarModoVideo() {
    modoVideoActivo = !modoVideoActivo;
    const btnV = document.getElementById('btn-toggle-video');
    if (modoVideoActivo) {
        elArte.classList.add('oculto');
        btnV.classList.add('encendido');
        btnV.innerText = "Ocultar Video";
    } else {
        elArte.classList.remove('oculto');
        btnV.classList.remove('encendido');
        btnV.innerText = "Ver Video Oficial";
    }
}

function pistaSiguiente() {
    if (indiceActual < playlistActual.length - 1) iniciarPista(indiceActual + 1, 'playlist_actual'); // Parche rapido
    else iniciarPista(0, 'playlist_actual');
    // Para que el next track no se rompa, pasamos la lista a una memoria global segura
    memoriasInicio['playlist_actual'] = playlistActual;
}
function pistaAnterior() {
    memoriasInicio['playlist_actual'] = playlistActual;
    if (indiceActual > 0) iniciarPista(indiceActual - 1, 'playlist_actual');
}

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

barra.oninput = (e) => { if (reproductorYT) reproductorYT.seekTo(e.target.value, true); };if (event.data === YT.PlayerState.PLAYING) actualizarUIPlay(true);
    if (event.data === YT.PlayerState.PAUSED) actualizarUIPlay(false);
}

function cambiarTab(idVista, tabApretado) {
    document.querySelectorAll('.vista').forEach(v => v.classList.remove('activa'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('activo'));
    document.getElementById('vista-' + idVista).classList.add('activa');
    tabApretado.classList.add('activo');
    if(idVista === 'biblioteca') cargarBiblioteca();
}

window.onload = () => {
    cargarFila("mix exitos globales", "fila-destacadas", false);
    cargarHistorial();
    cargarFila("dembow dominicano hits", "fila-dembow", false);
};

function crearHTMLTarjeta(cancion, index, listaJson) {
    let tituloRaw = decodificarTexto(cancion.title);
    let titulo = tituloRaw;
    let artista = "Fami Music";
    if (tituloRaw.includes("-")) {
        let partes = tituloRaw.split("-");
        artista = partes[0].trim();
        titulo = partes.slice(1).join("-").trim();
    }
    return `
        <div class="tarjeta" onclick="iniciarPista(${index}, '${listaJson}')">
            <img src="${cancion.thumb}" onerror="this.src='https://ui-avatars.com/api/?name=Mix&background=1c1c1e&color=fff'">
            <div class="titulo-tarjeta">${titulo}</div>
            <div class="artista-tarjeta">${artista}</div>
        </div>
    `;
}

function crearHTMLLista(cancion, index, listaJson) {
    let tituloRaw = decodificarTexto(cancion.title);
    let titulo = tituloRaw;
    let artista = "Fami Music";
    if (tituloRaw.includes("-")) {
        let partes = tituloRaw.split("-");
        artista = partes[0].trim();
        titulo = partes.slice(1).join("-").trim();
    }
    return `
        <div class="tarjeta" onclick="iniciarPista(${index}, '${listaJson}')">
            <img src="${cancion.thumb}" onerror="this.src='https://ui-avatars.com/api/?name=Mix&background=1c1c1e&color=fff'">
            <div class="textos-tarjeta">
                <div class="titulo-tarjeta">${titulo}</div>
                <div class="artista-tarjeta">${artista}</div>
            </div>
        </div>
    `;
}

async function cargarFila(busqueda, idContenedor, esLista = false) {
    const contenedor = document.getElementById(idContenedor);
    contenedor.innerHTML = '<div class="mensaje-carga">Buscando temas...</div>';
    try {
        const res = await fetch(`/search/${encodeURIComponent(busqueda)}`);
        const datos = await res.json();
        if (!datos || datos.length === 0) throw new Error("Vacío");
        const listaStr = escape(JSON.stringify(datos));
        contenedor.innerHTML = datos.map((c, i) => esLista ? crearHTMLLista(c, i, listaStr) : crearHTMLTarjeta(c, i, listaStr)).join('');
    } catch (e) { contenedor.innerHTML = '<div class="mensaje-carga">Error al cargar.</div>'; }
}

let searchTimeout = null;
document.getElementById('input-buscador').oninput = (e) => {
    const query = e.target.value.trim();
    if (query.length < 2) return;
    clearTimeout(searchTimeout);
    document.getElementById('grid-buscar').innerHTML = '<div class="mensaje-carga">Buscando...</div>';
    searchTimeout = setTimeout(() => { cargarFila(query, 'grid-buscar', true); }, 800);
};

function cargarHistorial() {
    let historial = JSON.parse(localStorage.getItem('Fami_Memoria')) || [];
    const cont = document.getElementById('fila-recientes');
    if(historial.length === 0) { cont.innerHTML = '<div class="mensaje-carga">Aún no hay música.</div>'; return; }
    const listaStr = escape(JSON.stringify(historial));
    cont.innerHTML = historial.map((c, i) => crearHTMLTarjeta(c, i, listaStr)).join('');
}

function cargarBiblioteca() {
    let lib = JSON.parse(localStorage.getItem('Fami_Memoria')) || [];
    const cont = document.getElementById('grid-biblioteca');
    if(lib.length === 0) { cont.innerHTML = '<div class="mensaje-carga">Tu biblioteca está vacía.</div>'; return; }
    const listaStr = escape(JSON.stringify(lib));
    cont.innerHTML = lib.map((c, i) => crearHTMLLista(c, i, listaStr)).join('');
}

function guardarEnHistorial(cancion) {
    let h = JSON.parse(localStorage.getItem('Fami_Memoria')) || [];
    h = h.filter(item => item.id !== cancion.id);
    h.unshift(cancion);
    if(h.length > 20) h.pop();
    localStorage.setItem('Fami_Memoria', JSON.stringify(h));
    cargarHistorial(); 
}

function anunciarDJ(cancion) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); 
    let msg = new SpeechSynthesisUtterance(`¡Activo! Poniendo ${cancion}`);
    msg.lang = 'es-US'; msg.rate = 1.15; msg.pitch = 1.1; 
    window.speechSynthesis.speak(msg);
}

function iniciarPista(indice, listaString) {
    if (!reproductorYT) return alert("Cargando motor...");
    playlistActual = JSON.parse(unescape(listaString));
    indiceActual = indice;
    const pista = playlistActual[indiceActual];

    let tituloRaw = decodificarTexto(pista.title);
    let artista = "Fami Music";
    let titulo = tituloRaw;
    if (tituloRaw.includes("-")) {
        let partes = tituloRaw.split("-");
        artista = partes[0].trim();
        titulo = partes.slice(1).join("-").trim();
    }

    document.getElementById('titulo-actual').innerText = titulo;
    document.getElementById('artista-actual').innerText = artista;
    elArte.src = pista.thumb;
    
    document.getElementById('mini-title').innerText = titulo;
    document.getElementById('mini-img').src = pista.thumb;
    miniPlayer.style.display = 'flex'; 

    guardarEnHistorial(pista);
    anunciarDJ(titulo);

    reproductorYT.loadVideoById(pista.id);
    abrirReproductor();

    clearInterval(progresoIntervalo);
    progresoIntervalo = setInterval(actualizarBarra, 500);
}

// === BLOQUEO DE PANTALLA AL ABRIR REPRODUCTOR ===
function abrirReproductor() { 
    uiRep.classList.add('activo'); 
    document.body.classList.add('bloqueado'); // Congela la pantalla
}
function cerrarReproductor() { 
    uiRep.classList.remove('activo'); 
    document.body.classList.remove('bloqueado'); // Descongela la pantalla
}

function alternarPlay() {
    if (!reproductorYT) return;
    reproductorYT.getPlayerState() === 1 ? reproductorYT.pauseVideo() : reproductorYT.playVideo();
}
function alternarPlayFiltro(e) { e.stopPropagation(); alternarPlay(); }

function actualizarUIPlay(estaSonando) {
    if (estaSonando) {
        btnPlay.innerHTML = iconPause;
        btnMiniPlay.innerHTML = iconMiniPause;
        cajaMedia.classList.remove('pausado');
    } else {
        btnPlay.innerHTML = iconPlay;
        btnMiniPlay.innerHTML = iconMiniPlay;
        cajaMedia.classList.add('pausado'); 
    }
}

function alternarModoVideo() {
    modoVideoActivo = !modoVideoActivo;
    const btnV = document.getElementById('btn-toggle-video');
    if (modoVideoActivo) {
        elArte.classList.add('oculto');
        btnV.classList.add('encendido');
        btnV.innerText = "Ocultar Video";
    } else {
        elArte.classList.remove('oculto');
        btnV.classList.remove('encendido');
        btnV.innerText = "Ver Video Oficial";
    }
}

function pistaSiguiente() {
    if (indiceActual < playlistActual.length - 1) iniciarPista(indiceActual + 1, escape(JSON.stringify(playlistActual)));
    else iniciarPista(0, escape(JSON.stringify(playlistActual)));
}
function pistaAnterior() {
    if (indiceActual > 0) iniciarPista(indiceActual - 1, escape(JSON.stringify(playlistActual)));
}

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
