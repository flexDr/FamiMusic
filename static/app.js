let playlistActual = [];
let indiceActual = 0;
let modoVideoActivo = false;

// Referencias del DOM
const elAudio = document.getElementById('audio-cancion');
const elVideo = document.getElementById('video-cancion');
const elArte = document.getElementById('arte-cancion');
const uiRep = document.getElementById('reproductor-ui');
const btnPlay = document.getElementById('btn-play');
const barra = document.getElementById('barra-progreso');

// Desbloqueo inicial para iPhone
document.addEventListener('touchstart', () => {
    elAudio.play().catch(()=>{}); 
    elAudio.pause();
}, { once: true });

// 1. CARGAR LA PANTALLA INICIAL SIN ERRORES
window.onload = () => {
    cargarFila("mix exitos 2026", "fila-destacadas");
    cargarHistorial();
    cargarFila("trap latino y reggaeton", "fila-recomendado");
    cargarFila("dembow dominicano hits", "fila-dembow");
    cargarFila("bachata dominicana mix", "fila-bachata");
};

async function cargarFila(busqueda, idContenedor) {
    const contenedor = document.getElementById(idContenedor);
    contenedor.innerHTML = '<div class="mensaje-carga">Buscando temas...</div>';
    
    try {
        // Asegúrate de que esta sea la ruta correcta a tu buscador
        const res = await fetch(`/search/${encodeURIComponent(busqueda)}`);
        if (!res.ok) throw new Error("Fallo de red");
        
        const datos = await res.json();
        if (datos.length === 0) throw new Error("Vacío");

        contenedor.innerHTML = datos.map((cancion, index) => `
            <div class="card tarjeta" onclick="iniciarPista(${index}, '${escape(JSON.stringify(datos))}')">
                <img src="${cancion.thumb}" onerror="this.src='https://ui-avatars.com/api/?name=Mix&background=1c1c1e&color=fff'">
                <div class="titulo-tarjeta">${cancion.title}</div>
                <div class="artista-tarjeta">YouTube</div>
            </div>
        `).join('');
    } catch (error) {
        contenedor.innerHTML = '<div class="mensaje-carga" style="color: #fa233b;">No se pudo cargar la categoría.</div>';
    }
}

// 2. HISTORIAL
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
    cargarHistorial(); // Refresca la fila en vivo
}

// 3. EL REPRODUCTOR PRINCIPAL
function iniciarPista(indice, listaString) {
    playlistActual = JSON.parse(unescape(listaString));
    indiceActual = indice;
    const pista = playlistActual[indiceActual];

    // Levantar interfaz
    uiRep.classList.add('activo');
    document.getElementById('titulo-actual').innerText = pista.title;
    elArte.src = pista.thumb;
    
    guardarEnHistorial(pista);

    // =========================================================
    // ¡AQUÍ VA LA RUTA DE DEEPSEEK QUE YA TE FUNCIONA!
    // Reemplaza esto con el código exacto que hace sonar la música
    const urlMagica = `/api/audio/${pista.id}`; // <- Ajusta esto si es diferente
    const urlVideo = `/api/video/${pista.id}`; // <- Opcional si el backend lo soporta
    
    elAudio.src = urlMagica;
    elVideo.src = urlVideo; 
    // =========================================================

    if (modoVideoActivo) {
        elVideo.play().catch(()=>{});
        elAudio.pause();
    } else {
        elAudio.play().catch(()=>{});
        elVideo.pause();
    }
    btnPlay.innerText = "⏸";
}

function cerrarReproductor() { uiRep.classList.remove('activo'); }

// 4. CONTROLES DE PAUSA Y CAMBIO
function alternarPlay() {
    const reproductorActivo = modoVideoActivo ? elVideo : elAudio;
    if (reproductorActivo.paused) {
        reproductorActivo.play();
        btnPlay.innerText = "⏸";
    } else {
        reproductorActivo.pause();
        btnPlay.innerText = "▶";
    }
}

function alternarModoVideo() {
    modoVideoActivo = !modoVideoActivo;
    const btnV = document.getElementById('btn-toggle-video');
    
    if (modoVideoActivo) {
        elArte.classList.remove('activo');
        elVideo.classList.add('activo');
        btnV.classList.add('encendido');
        btnV.innerText = "Modo Video: ON";
        
        elVideo.currentTime = elAudio.currentTime;
        elAudio.pause();
        elVideo.play();
    } else {
        elVideo.classList.remove('activo');
        elArte.classList.add('activo');
        btnV.classList.remove('encendido');
        btnV.innerText = "Modo Video: OFF";
        
        elAudio.currentTime = elVideo.currentTime;
        elVideo.pause();
        elAudio.play();
    }
}

// 5. REPRODUCCIÓN AUTOMÁTICA
elAudio.onended = () => pistaSiguiente();
elVideo.onended = () => pistaSiguiente();

function pistaSiguiente() {
    if (indiceActual < playlistActual.length - 1) {
        iniciarPista(indiceActual + 1, escape(JSON.stringify(playlistActual)));
    } else {
        iniciarPista(0, escape(JSON.stringify(playlistActual))); // Reinicia si se acaba
    }
}

function pistaAnterior() {
    if (indiceActual > 0) iniciarPista(indiceActual - 1, escape(JSON.stringify(playlistActual)));
}

// 6. BARRA DE PROGRESO
function formatoTiempo(segundos) {
    if (isNaN(segundos)) return "0:00";
    let min = Math.floor(segundos / 60);
    let sec = Math.floor(segundos % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function actualizarBarra(medio) {
    if (!isNaN(medio.duration)) {
        barra.max = medio.duration;
        barra.value = medio.currentTime;
        document.getElementById('tiempo-actual').innerText = formatoTiempo(medio.currentTime);
        document.getElementById('tiempo-restante').innerText = "-" + formatoTiempo(medio.duration - medio.currentTime);
    }
}

elAudio.ontimeupdate = () => { if(!modoVideoActivo) actualizarBarra(elAudio); };
elVideo.ontimeupdate = () => { if(modoVideoActivo) actualizarBarra(elVideo); };

barra.oninput = (e) => {
    const medio = modoVideoActivo ? elVideo : elAudio;
    medio.currentTime = e.target.value;
};
