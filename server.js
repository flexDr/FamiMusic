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

// EL RADAR: Solo entra a YouTube para sacar el código del video
app.get('/api/search-yt', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Falta la búsqueda' });

    try {
        console.log(`[RADAR YOUTUBE] Buscando: ${query}`);
        const ytRes = await axios.get(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        });
        
        // Extraemos el código secreto del video (ej. dQw4w9WgXcQ)
        const match = ytRes.data.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
        if (match && match[1]) {
            return res.json({ videoId: match[1] });
        }
        res.status(404).json({ error: 'No encontrado' });
    } catch (error) {
        res.status(500).json({ error: 'Error en el radar' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Radar Híbrido listo en el puerto ${PORT}`));
