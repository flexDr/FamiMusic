// ================== FamiMusic - Player.js ==================

let currentVideoId = null;
let playerIframe = null;

// Función principal para reproducir
async function playSong(videoId, title = "Reproduciendo...") {
    currentVideoId = videoId;
    
    const playerContainer = document.getElementById('player-container');
    if (!playerContainer) {
        console.error("No se encontró #player-container");
        return;
    }

    // Crear iframe de YouTube
    playerContainer.innerHTML = `
        <iframe 
            width="100%" 
            height="380" 
            src="https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&origin=https://famimusic.onrender.com"
            title="${title}"
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            allowfullscreen
            referrerpolicy="strict-origin-when-cross-origin">
        </iframe>
    `;

    console.log(`🎵 Reproduciendo: ${title} (${videoId})`);
    
    // Actualizar título
    const nowPlaying = document.getElementById('now-playing');
    if (nowPlaying) nowPlaying.textContent = title;
}

// Búsqueda
async function searchSongs(query) {
    const resultsContainer = document.getElementById('search-results');
    if (resultsContainer) resultsContainer.innerHTML = '<p>Buscando...</p>';

    try {
        const res = await fetch(`/search/${encodeURIComponent(query)}`);
        const data = await res.json();

        if (resultsContainer) {
            resultsContainer.innerHTML = '';
            if (data.length === 0) {
                resultsContainer.innerHTML = '<p>No se encontraron resultados.</p>';
                return;
            }

            data.forEach(song => {
                const card = document.createElement('div');
                card.className = 'song-card';
                card.innerHTML = `
                    <img src="${song.thumb}" alt="${song.title}">
                    <h3>${song.title}</h3>
                `;
                card.onclick = () => playSong(song.id, song.title);
                resultsContainer.appendChild(card);
            });
        }
    } catch (e) {
        console.error("Error en búsqueda:", e);
    }
}

// Cargar secciones del Inicio (Para Ti, Dembow, etc.)
async function loadSection(sectionId, query) {
    const container = document.getElementById(sectionId);
    if (!container) return;

    try {
        const res = await fetch(`/search/${encodeURIComponent(query)}`);
        const data = await res.json();

        container.innerHTML = '';
        data.forEach(song => {
            const div = document.createElement('div');
            div.className = 'card';
            div.innerHTML = `
                <img src="${song.thumb}" alt="${song.title}">
                <p>${song.title}</p>
            `;
            div.onclick = () => playSong(song.id, song.title);
            container.appendChild(div);
        });
    } catch (e) {
        console.error(`Error cargando ${sectionId}:`, e);
    }
}

// Inicializar la página
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 FamiMusic cargado");

    // Cargar secciones del Inicio automáticamente
    loadSection('para-ti', 'dembow dominicano hits');
    loadSection('puro-dembow', 'el alfa dembow');
    loadSection('trap-latino', 'bad bunny anuel aa');

    // Buscador
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchSongs(searchInput.value);
            }
        });
    }
});
