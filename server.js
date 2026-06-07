const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());

// 1. LAS RUTAS CORRECTAS (Para tus carpetas 'static' y 'templates')
app.use('/static', express.static(path.join(__dirname, 'static')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'templates', 'index.html')));
app.get('/sw.js', (req, res) => res.sendFile(path.join(__dirname, 'static', 'sw.js')));
app.get('/manifest.json', (req, res) => res.sendFile(path.join(__dirname, 'static', 'manifest.json')));

// 2. EL BUSCADOR (Apple Music - Intacto y perfecto)
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

// 3. EL EXTRACTOR DE AUDIO (Potenciado por Piped Proxy)
app.get('/api/stream', async (req, res) => {
    const searchQuery = req.query.url; 
    if (!searchQuery) return res.status(400).send('Falta la canción');

    // Nodos Piped que incluyen servidores Proxy para evadir el bloqueo de IP
    const pipedInstances = [
        "https://pipedapi.kavin.rocks",
        "https://pipedapi.smnz.de",
        "https://pipedapi.tokhmi.xyz"
    ];

    for (let api of pipedInstances) {
        try {
            // 1. Buscamos la canción específica
            const searchRes = await axios.get(`${api}/search?q=${encodeURIComponent(searchQuery)}&filter=music_songs`, { timeout: 6000 });
            
            if (searchRes.data.items && searchRes.data.items.length > 0) {
                const videoUrl = searchRes.data.items[0].url; // Ej: /watch?v=codigo
                const videoId = videoUrl.split('?v=')[1];
                
                // 2. Extraemos el stream. Piped automáticamente nos da una URL que pasa por su Proxy.
                const streamRes = await axios.get(`${api}/streams/${videoId}`, { timeout: 6000 });
                const audioStreams = streamRes.data.audioStreams;

                if (audioStreams && audioStreams.length > 0) {
                    // Seleccionamos el mejor formato para iPhone (m4a/mp4)
                    const bestAudio = audioStreams.find(s => s.mimeType.includes('mp4')) || audioStreams[0];
                    
                    console.log(`[ÉXITO] Transmitiendo audio proxificado desde: ${api}`);
                    // Esta URL ya engaña a Google, el iPhone la leerá sin problemas
                    return res.redirect(bestAudio.url);
                }
            }
        } catch (error) {
            console.log(`[FALLO] El nodo ${api} está ocupado. Saltando al siguiente...`);
            continue;
        }
    }

    // Si la red global falla
    console.error(`[ERROR TOTAL] Ningún proxy pudo resolver: ${searchQuery}`);
    res.status(500).send('Servidores de audio ocupados.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Motor Piped Proxy rugiendo en el puerto ${PORT}`));
