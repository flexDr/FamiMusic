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

// EL EXTRACTOR BLINDADO (Arsenal de doble red)
app.get('/api/get-audio', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Falta la canción' });

    // Mezclamos redes Invidious y Piped para que Render siempre tenga una puerta abierta
    const arsenalNodos = [
        { type: 'invidious', url: 'https://invidious.nerdvpn.de' },
        { type: 'invidious', url: 'https://inv.tux.pizza' },
        { type: 'invidious', url: 'https://invidious.fdn.fr' },
        { type: 'piped', url: 'https://pipedapi.kavin.rocks' },
        { type: 'piped', url: 'https://pipedapi.tokhmi.xyz' },
        { type: 'piped', url: 'https://pipedapi.smnz.de' }
    ];

    for (let nodo of arsenalNodos) {
        try {
            if (nodo.type === 'invidious') {
                // Intento con red Invidious (Le damos 8 segundos a Render para conectar)
                const searchRes = await axios.get(`${nodo.url}/api/v1/search?q=${encodeURIComponent(query)}&type=video`, { timeout: 8000 });
                if (searchRes.data && searchRes.data.length > 0) {
                    const videoId = searchRes.data[0].videoId;
                    const audioUrl = `${nodo.url}/latest_version?id=${videoId}&itag=140`;
                    console.log(`[ÉXITO] Render penetró la red Invidious por: ${nodo.url}`);
                    return res.json({ url: audioUrl });
                }
            } else if (nodo.type === 'piped') {
                // Intento con red Piped
                const searchRes = await axios.get(`${nodo.url}/search?q=${encodeURIComponent(query)}&filter=music_songs`, { timeout: 8000 });
                if (searchRes.data.items && searchRes.data.items.length > 0) {
                    const videoUrl = searchRes.data.items[0].url;
                    const videoId = videoUrl.split('?v=')[1];
                    const streamRes = await axios.get(`${nodo.url}/streams/${videoId}`, { timeout: 8000 });
                    
                    if (streamRes.data.audioStreams && streamRes.data.audioStreams.length > 0) {
                        const bestAudio = streamRes.data.audioStreams.find(s => s.mimeType.includes('mp4')) || streamRes.data.audioStreams[0];
                        console.log(`[ÉXITO] Render penetró la red Piped por: ${nodo.url}`);
                        return res.json({ url: bestAudio.url });
                    }
                }
            }
        } catch (error) {
            // Si el nodo bloquea a Render o tarda mucho, se reporta y salta al siguiente
            console.log(`[BLOQUEO] El nodo ${nodo.url} rechazó a Render. Saltando...`);
            continue;
        }
    }
    
    console.error(`[DERROTA TOTAL] Ningún servidor le dio acceso a Render para la canción: ${query}`);
    res.status(500).json({ error: 'Todos los servidores bloquearon a Render' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor Blindado listo en el puerto ${PORT}`));
