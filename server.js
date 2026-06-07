const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.static(__dirname));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// EL BUSCADOR (Apple Music - Intacto y perfecto)
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Falta la búsqueda' });

    try {
        const searchRes = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=20`);
        const canciones = searchRes.data.results.map(song => ({
            titulo: song.trackName,
            artista: song.artistName,
            imagen: song.artworkUrl100.replace('100x100bb', '512x512bb'),
            url: `${song.artistName} ${song.trackName}` 
        }));
        res.json(canciones);
    } catch (error) {
        console.error("Error buscando en Apple:", error.message);
        res.status(500).json({ error: 'Error al buscar en el catálogo' });
    }
});

// EL NUEVO EXTRACTOR (Potenciado por Invidious)
app.get('/api/stream', async (req, res) => {
    const searchQuery = req.query.url; 
    if (!searchQuery) return res.status(400).send('Falta la canción');

    // Nodos Invidious de alta disponibilidad
    const invidiousInstances = [
        "https://invidious.nerdvpn.de",
        "https://inv.tux.pizza",
        "https://invidious.fdn.fr",
        "https://invidious.slipfox.xyz"
    ];

    for (let api of invidiousInstances) {
        try {
            // 1. Buscamos el ID interno
            const searchRes = await axios.get(`${api}/api/v1/search?q=${encodeURIComponent(searchQuery)}&type=video`, { timeout: 6000 });
            
            if (searchRes.data && searchRes.data.length > 0) {
                const videoId = searchRes.data[0].videoId;
                
                // 2. MAGIA: itag=140 es el código universal de YouTube para el audio puro en M4A.
                // Invidious nos redirige directo sin que Render tenga que descargar nada.
                const audioUrl = `${api}/latest_version?id=${videoId}&itag=140`;
                
                console.log(`[ÉXITO] Transmitiendo "${searchQuery}" a través de: ${api}`);
                return res.redirect(audioUrl);
            }
        } catch (error) {
            console.log(`[FALLO] El nodo ${api} está ocupado. Saltando al siguiente...`);
            continue;
        }
    }

    // Si todos fallan
    console.error(`[ERROR TOTAL] Ningún servidor pudo resolver: ${searchQuery}`);
    res.status(500).send('Servidores de audio ocupados.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Motor Invidious rugiendo en el puerto ${PORT}`));
