const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());

// 1. LAS RUTAS VISUALES (Intactas)
app.use('/static', express.static(path.join(__dirname, 'static')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'templates', 'index.html')));
app.get('/sw.js', (req, res) => res.sendFile(path.join(__dirname, 'static', 'sw.js')));
app.get('/manifest.json', (req, res) => res.sendFile(path.join(__dirname, 'static', 'manifest.json')));

// 2. EL DISFRAZ MAESTRO (Spoofing)
const audiomackHeaders = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://audiomack.com/',
    'Origin': 'https://audiomack.com',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
};

// 3. EL BUSCADOR (Atacando la API de Audiomack con el disfraz)
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Falta la búsqueda' });

    try {
        const searchRes = await axios.get(`https://audiomack.com/api/search?q=${encodeURIComponent(query)}`, {
            headers: audiomackHeaders
        });
        
        const canciones = searchRes.data.songs.map(song => ({
            titulo: song.title,
            artista: song.artist,
            // Forzamos la imagen a alta resolución cambiando el tamaño en la URL
            imagen: song.image.replace('?width=150', '?width=512'), 
            url: `https://audiomack.com/${song.artist_url}/song/${song.url_slug}` 
        }));

        res.json(canciones);
    } catch (error) {
        console.error("Golpe rebotado en Búsqueda:", error.message);
        res.status(500).json({ error: 'Audiomack bloqueó la búsqueda' });
    }
});

// 4. EL EXTRACTOR DE AUDIO
function extraerDatosUrl(url) {
    try {
        const urlObj = new URL(url);
        const partes = urlObj.pathname.split('/').filter(Boolean);
        if (partes.length >= 3) return { artista: partes[0], titulo: partes[2] };
        return null;
    } catch (e) { return null; }
}

app.get('/api/stream', async (req, res) => {
    const videoUrl = req.query.url;
    const datos = extraerDatosUrl(videoUrl);
    if (!datos) return res.status(400).send('URL no válida');

    try {
        // Golpe directo al endpoint de audio con el disfraz puesto
        const infoRes = await axios.get(`https://audiomack.com/api/music/url/song/${datos.artista}/${datos.titulo}?extended=true`, {
            headers: audiomackHeaders
        });
        
        const urlAudioPuro = infoRes.data.url;
        if (!urlAudioPuro) throw new Error("Audiomack escondió el enlace");
        
        console.log(`[VICTORIA] Audio extraído: ${datos.titulo}`);
        
        // Enviamos el audio limpio al iPhone
        res.redirect(urlAudioPuro);
    } catch (error) {
        console.error("Golpe rebotado en Extracción:", error.message);
        res.status(500).send('Audiomack bloqueó la extracción');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Motor de Combate Audiomack rugiendo en el puerto ${PORT}`));
