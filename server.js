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

// EL DISFRAZ MILITAR PARA ENGAÑAR A CLOUDFLARE Y COBALT
const headersMilitares = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Origin': 'https://cobalt.tools', // Le hacemos creer a Cobalt que estamos en su página
    'Referer': 'https://cobalt.tools/'
};

// EL EXTRACTOR MAESTRO
app.get('/api/get-audio', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Falta la canción' });

    try {
        console.log(`[BUSCANDO] ${query}`);
        // 1. Infiltración en YouTube
        const ytRes = await axios.get(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
            headers: { 'User-Agent': headersMilitares['User-Agent'] }
        });
        
        const match = ytRes.data.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
        if (!match) throw new Error("No se encontró el ID del video en YouTube");
        
        const videoId = match[1];
        const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
        console.log(`[VIDEO ENCONTRADO] ${youtubeUrl}`);

        // 2. Nodos de Extracción
        const extractionNodes = [
            { type: 'cobalt', url: 'https://co.wuk.sh/api/json' },
            { type: 'cobalt', url: 'https://api.cobalt.tools/api/json' },
            { type: 'piped', url: 'https://pipedapi.kavin.rocks' },
            { type: 'piped', url: 'https://pipedapi.tokhmi.xyz' },
            { type: 'piped', url: 'https://pipedapi.smnz.de' }
        ];

        for (let nodo of extractionNodes) {
            try {
                if (nodo.type === 'cobalt') {
                    // Petición a Cobalt CON disfraz
                    const cobaltRes = await axios.post(nodo.url, {
                        url: youtubeUrl,
                        isAudioOnly: true,
                        aFormat: "mp3"
                    }, { 
                        headers: headersMilitares, 
                        timeout: 8000 
                    });

                    if (cobaltRes.data && cobaltRes.data.url) {
                        console.log(`[ÉXITO] Audio extraído por Cobalt: ${nodo.url}`);
                        return res.json({ url: cobaltRes.data.url });
                    }
                } 
                else if (nodo.type === 'piped') {
                    // Petición a Piped CON disfraz
                    const streamRes = await axios.get(`${nodo.url}/streams/${videoId}`, { 
                        headers: { 'User-Agent': headersMilitares['User-Agent'] },
                        timeout: 8000 
                    });
                    
                    if (streamRes.data && streamRes.data.audioStreams) {
                        const bestAudio = streamRes.data.audioStreams.find(s => s.mimeType.includes('mp4') || s.mimeType.includes('m4a')) || streamRes.data.audioStreams[0];
                        if (bestAudio && bestAudio.url) {
                            console.log(`[ÉXITO] Audio extraído por Piped: ${nodo.url}`);
                            return res.json({ url: bestAudio.url });
                        }
                    }
                }
            } catch (e) {
                // Ahora registramos la razón exacta del bloqueo (ej. Error 403, 526 o Timeout)
                const errorReal = e.response ? `Código ${e.response.status}` : e.message;
                console.log(`[FALLO] El nodo ${nodo.url} rechazó la extracción (${errorReal}). Saltando...`);
                continue; 
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
