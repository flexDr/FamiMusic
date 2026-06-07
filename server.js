const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());

// LAS RUTAS VISUALES
app.use('/static', express.static(path.join(__dirname, 'static')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'templates', 'index.html')));
app.get('/sw.js', (req, res) => res.sendFile(path.join(__dirname, 'static', 'sw.js')));
app.get('/manifest.json', (req, res) => res.sendFile(path.join(__dirname, 'static', 'manifest.json')));

// EL EXTRACTOR EN EL SERVIDOR (Para evadir el candado CORS del iPhone)
app.get('/api/get-audio', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Falta la canción' });

    const pipedNodes = [
        "https://pipedapi.kavin.rocks",
        "https://pipedapi.smnz.de",
        "https://pipedapi.tokhmi.xyz"
    ];

    for (let api of pipedNodes) {
        try {
            // Buscamos la canción en YouTube de forma invisible
            const searchRes = await axios.get(`${api}/search?q=${encodeURIComponent(query)}&filter=music_songs`, { timeout: 5000 });
            
            if (searchRes.data.items && searchRes.data.items.length > 0) {
                const videoUrl = searchRes.data.items[0].url;
                const videoId = videoUrl.split('?v=')[1];

                // Sacamos los enlaces puros
                const streamRes = await axios.get(`${api}/streams/${videoId}`, { timeout: 5000 });
                const audioStreams = streamRes.data.audioStreams;

                if (audioStreams && audioStreams.length > 0) {
                    // Seleccionamos el mejor formato (MP4A)
                    const bestAudio = audioStreams.find(s => s.mimeType.includes('mp4')) || audioStreams[0];
                    console.log(`[ÉXITO] Audio extraído por Render de: ${api}`);
                    return res.json({ url: bestAudio.url }); // Le pasamos el enlace limpio al iPhone
                }
            }
        } catch (error) {
            console.log(`[FALLO] Nodo ${api} lento, intentando otro...`);
            continue;
        }
    }
    
    res.status(500).json({ error: 'Todos los servidores fallaron' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor Híbrido listo en el puerto ${PORT}`));
