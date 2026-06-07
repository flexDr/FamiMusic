const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());

// LAS RUTAS VISUALES (Hacia tu increíble diseño)
app.use('/static', express.static(path.join(__dirname, 'static')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'templates', 'index.html')));
app.get('/sw.js', (req, res) => res.sendFile(path.join(__dirname, 'static', 'sw.js')));
app.get('/manifest.json', (req, res) => res.sendFile(path.join(__dirname, 'static', 'manifest.json')));

// EL EXTRACTOR MAESTRO (YouTube Directo + Red Cobalt/Piped)
app.get('/api/get-audio', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Falta la canción' });

    try {
        // PASO 1: Infiltración directa a YouTube para robar el ID (Cero bloqueos de API)
        console.log(`[BUSCANDO] ${query}`);
        const ytRes = await axios.get(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        });
        
        // Usamos una expresión regular para encontrar el código exacto del primer video
        const match = ytRes.data.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
        if (!match) throw new Error("No se encontró el ID del video en YouTube");
        
        const videoId = match[1];
        const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
        console.log(`[VIDEO ENCONTRADO] ${youtubeUrl}`);

        // PASO 2: Extracción del audio usando múltiples bóvedas
        const extractionNodes = [
            // Nodos Cobalt (La mejor herramienta Open Source del mundo ahora mismo)
            { type: 'cobalt', url: 'https://api.cobalt.tools/api/json' },
            { type: 'cobalt', url: 'https://co.wuk.sh/api/json' },
            // Nodos Piped (Entramos directo a la bóveda de audio saltándonos su buscador)
            { type: 'piped', url: 'https://pipedapi.kavin.rocks' },
            { type: 'piped', url: 'https://pipedapi.tokhmi.xyz' }
        ];

        for (let nodo of extractionNodes) {
            try {
                if (nodo.type === 'cobalt') {
                    const cobaltRes = await axios.post(nodo.url, {
                        url: youtubeUrl,
                        isAudioOnly: true,
                        aFormat: "mp3"
                    }, { 
                        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }, 
                        timeout: 8000 
                    });

                    if (cobaltRes.data && cobaltRes.data.url) {
                        console.log(`[ÉXITO] Audio extraído por Cobalt: ${nodo.url}`);
                        return res.json({ url: cobaltRes.data.url });
                    }
                } 
                else if (nodo.type === 'piped') {
                    // Piped rara vez bloquea peticiones directas de stream
                    const streamRes = await axios.get(`${nodo.url}/streams/${videoId}`, { timeout: 8000 });
                    if (streamRes.data && streamRes.data.audioStreams) {
                        const bestAudio = streamRes.data.audioStreams.find(s => s.mimeType.includes('mp4')) || streamRes.data.audioStreams[0];
                        if (bestAudio && bestAudio.url) {
                            console.log(`[ÉXITO] Audio extraído por Piped: ${nodo.url}`);
                            return res.json({ url: bestAudio.url });
                        }
                    }
                }
            } catch (e) {
                console.log(`[FALLO] El nodo ${nodo.url} rechazó la extracción. Saltando...`);
                continue; // Si un nodo falla, pasa al siguiente instantáneamente
            }
        }

        throw new Error("Todos los servidores de extracción bloquearon la petición");

    } catch (error) {
        console.error(`[ERROR FATAL] ${error.message}`);
        res.status(500).json({ error: 'Render no pudo extraer el audio en este momento.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor Maestro listo en el puerto ${PORT}`));
