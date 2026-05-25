let playlistActual = [];
let indiceActual = 0;
let modoVideoActivo = false;
let reproductorYT = null;
let progresoIntervalo = null;

// Referencias del DOM
const elArte = document.getElementById('arte-cancion');
const uiRep = document.getElementById('reproductor-ui');
const btnPlay = document.getElementById('btn-play');
const barra = document.getElementById('barra-progreso');

// ==========================================
// 1. INICIALIZAR REPRODUCTOR OFICIAL DE YOUTUBE
// ==========================================
function onYouTubeIframeAPIReady() {
    reproductorYT = new YT.Player('yt-video-container', {
        height: '100%',
        width: '100%',
        videoId: '',
        playerVars: {
            'playsinline': 1, 
            'controls': 0, // Ocultar controles nativos, usamos los de Apple Music
            'disablekb': 1,
            'rel': 0,
            'modestbranding': 1
        },
        events: {
            'onStateChange': cambioEstadoReproductor
        }
    });
}

// Cuando la canción termina, pasar a la siguiente
function cambioEstadoReproductor(event) {
    if (event.data === YT.PlayerState.ENDED) {
        pistaSiguiente();
    }
}

// ==========================================
// 2. CARGAR EL INICIO (CONECTANDO A DEEPSEEK)
// ==========================================
window.onload = () => {
    cargarFila("mix exitos 2026", "fila-destacadas");
    cargarHistorial();
    cargarFila("trap latino y reggaeton", "fila-recomendado");
    cargarFila("dembow dominicano hits", "fila-dembow");
    cargarFila("bachata dominicana exitos", "fila-bachata");
};

async function cargarFila(busqueda, idContenedor) {
    const contenedor = document.getElementById(idContenedor);
    contenedor.innerHTML = '<div class="mensaje-carga">Buscando temas...</div>';
    
    try {
        // Usa tu main.py exacto de DeepSeek
        const res = await fetch(`/search/${encodeURIComponent(busqueda)}`);
        if (!res.ok) throw new Error("Fallo de red");
        
        const datos = await res.json();
        if (!datos || datos.length === 0) throw new Error("Vacío");

        contenedor.innerHTML = datos.map((cancion, index) => `
            <div class="card tarjeta" onclick="iniciarPista(${index}, '${escape(JSON.stringify(datos))}')">
                <img src="${cancion.thumb}" onerror="this.src='https://ui-avatars.com/api/?name=Mix&background=1c1c1e&color=fff'">
                <div class="titulo-tarjeta">${cancion.title}</div>
                <div class="artista-tarjeta">YouTube</div>
            </div>
        `).join('');
    } catch (error) {
        contenedor.innerHTML = '<div class="mensaje-carga" style="color: #fa233b;">No se pudo cargar. Intenta de nuevo.</div>';
    }
}

// ==========================================
// 3. HISTORIAL (Escuchado Recientemente)
// ==========================================
function cargarHistorial() {
    let historial = JSON.parse(localStorage.getItem('Fami_Memoria')) || [];
    const cont = document.getElementById('fila-recientes');
    if(historial.length === 0) {
        cont.innerHTML = '<div class="mensaje-carga">Aún no hay música escuchada.</div>';
        return;
    }
    cont.innerHTML = historial.map((c, i) => `
        <div class="card tarjeta" onclick="iniciarPista(${i}, '${escape(JSON.stringify(historial))}')">
            <img src="${c.thumb}">
            <div class="titulo-tarjeta">${c.title}</div>
            <div class="artista-tarjeta">Reciente</div>
        </div>
    `).join('');
}

function guardarEnHistorial(cancion) {
    let h = JSON.parse(localStorage.getItem('Fami_Memoria')) || [];
    h = h.filter(item => item.id !== cancion.id);
    h.unshift(cancion);
    if(h.length > 15) h.pop();
    localStorage.setItem('Fami_Memoria', JSON.stringify(h));
    cargarHistorial(); 
}

// ==========================================
// 4. REPRODUCIR Y LA IA DEL DJ
// ==========================================
function anunciarDJ(cancion) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); 
    let frases = [
        `¡Sube el volumen, suena ${cancion}!`,
        `¡Activo! Poniendo ${cancion}.`,
        `¡Atención la cabina, entra ${cancion}!`
    ];
    let msg = new SpeechSynthesisUtterance(frases[Math.floor(Math.random() * frases.length)]);
    msg.lang = 'es-US'; 
    msg.rate = 1.15; 
    msg.pitch = 1.1; 
    window.speechSynthesis.speak(msg);
}

function iniciarPista(indice, listaString) {
    if (!reproductorYT) return alert("Cargando reproductor, espera un segundo...");

    playlistActual = JSON.parse(unescape(listaString));
    indiceActual = indice;
    const pista = playlistActual[indiceActual];

    // Levantar interfaz
    uiRep.classList.add('activo');
    document.getElementById('titulo-actual').innerText = pista.title;
    elArte.src = pista.thumb;
    
    guardarEnHistorial(pista);
    anunciarDJ(pista.title);

    // Cargar video oficial en YouTube Iframe y darle play
    reproductorYT.loadVideoById(pista.id);
    reproductorYT.playVideo();
    btnPlay.innerText = "⏸";

    // Iniciar barra de progreso
    clearInterval(progresoIntervalo);
    progresoIntervalo = setInterval(actualizarBarra, 500);
}

function cerrarReproductor() { uiRep.classList.remove('activo'); }

// ==========================================
// 5. CONTROLES Y VIDEO TOGGLE
// ==========================================
function alternarPlay() {
    if (!reproductorYT) return;
    const estado = reproductorYT.getPlayerState();
    
    // 1 es PLAYING
    if (estado === 1) {
        reproductorYT.pauseVideo();
        btnPlay.innerText = "▶";
    } else {
        reproductorYT.playVideo();
        btnPlay.innerText = "⏸";
    }
}

function alternarModoVideo() {
    modoVideoActivo = !modoVideoActivo;
    const btnV = document.getElementById('btn-toggle-video');
    
    if (modoVideoActivo) {
        // Ocultar portada para ver el iframe de video
        elArte.classList.add('oculto');
        btnV.classList.add('encendido');
        btnV.innerText = "Modo Video: ON";
    } else {
        // Mostrar portada encima del iframe (Modo Audio)
        elArte.classList.remove('oculto');
        btnV.classList.remove('encendido');
        btnV.innerText = "Modo Video: OFF";
    }
}

function pistaSiguiente() {
    if (indiceActual < playlistActual.length - 1) {
        iniciarPista(indiceActual + 1, escape(JSON.stringify(playlistActual)));
    } else {
        iniciarPista(0, escape(JSON.stringify(playlistActual))); 
    }
}

function pistaAnterior() {
    if (indiceActual > 0) iniciarPista(indiceActual - 1, escape(JSON.stringify(playlistActual)));
}

// ==========================================
// 6. BARRA DE PROGRESO
// ==========================================
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

// Adelantar canción si tocan la barra
barra.oninput = (e) => {
    if (reproductorYT) reproductorYT.seekTo(e.target.value, true);
};
