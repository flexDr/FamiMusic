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

// --- EL CEREBRO SOUNDCLOUD ---
// Llave maestra de respaldo por si el auto-robo falla
let scClientId = '82t6Z2y2T3kR5mRGEZtc2YmbqgL35Z2Q'; 

// Función hacker: Entra a SoundCloud y se roba la llave de API actual
async function renovarClientId() {
    try {
        const { data } = await axios.get('https://soundcloud.com', { timeout: 5000 });
        const scripts = data.match(/https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js/g);
        if (scripts) {
            for (let scriptUrl of scripts) {
                const scriptData = await axios.get(scriptUrl, { timeout: 5000 });
                const match = scriptData.data.match(/client_id:"([a-zA-Z0-9]{32})"/);
                if (match) {
                    scClientId = match[1];
                    console.log(`[SOUNDCLOUD] Llave maestra robada con éxito: ${scClientId}`);
                    break;
                }
            }
        }
    } catch (e) {
        console.log("[SOUNDCLOUD] Sistema de auto-robo falló, usando llave de respaldo.");
    }
}
renovarClientId(); // Ejecutamos el robo al encender el servidor

// EL EXTRACTOR MAESTRO (Enganchado a tu index.html sin que tengas que cambiar nada)
app.get('/api/get-audio', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Falta la canción' });

    try {
        console.log(`[BUSCANDO EN SOUNDCLOUD] ${query}`);
        
        // 1. Buscamos la canción exacta en la base de datos secreta de SoundCloud
        const searchUrl = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&client_id=${scClientId}&limit=5`;
        const searchRes = await axios.get(searchUrl, { timeout: 8000 });
        
        if (!searchRes.data.collection || searchRes.data.collection.length === 0) {
            throw new Error("No se encontró en SoundCloud");
        }

        // 2. Filtramos para asegurarnos de que la canción no esté bloqueada por derechos de autor (Suscripciones GO+)
        const track = searchRes.data.collection.find(t => t.policy !== 'BLOCK' && t.media && t.media.transcodings);
        
        if (!track) {
            throw new Error("SoundCloud bloqueó esta canción por derechos de autor");
        }

        console.log(`[TRACK ENCONTRADO] ${track.title} de ${track.user.username}`);

        // 3. Buscamos el formato de audio ideal (Progresivo = MP3 directo que tu iPhone va a reproducir como mantequilla)
        const streams = track.media.transcodings;
        const formatoIdeal = streams.find(s => s.format.protocol === 'progressive') || streams[0];

        // 4. Rompemos la encriptación final de la URL para sacar el enlace puro
        const streamRes = await axios.get(`${formatoIdeal.url}?client_id=${scClientId}`, { timeout: 8000 });
        
        if (streamRes.data && streamRes.data.url) {
            console.log(`[VICTORIA] Audio extraído y enviado al iPhone`);
            return res.json({ url: streamRes.data.url });
        }

        throw new Error("Fallo al desencriptar el MP3");

    } catch (error) {
        console.error(`[DERROTA] ${error.message}`);
        res.status(500).json({ error: 'Render no pudo extraer el audio en este momento.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Motor SoundCloud listo en el puerto ${PORT}`));
