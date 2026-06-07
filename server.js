const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());

// Le decimos a Express que todos tus archivos (sw.js, manifest, etc.) están aquí mismo
app.use(express.static(__dirname));

// La puerta principal carga tu diseño
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// EL BUSCADOR: Le pregunta a Audiomack qué canciones existen
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Falta la búsqueda' });

    try {
        const searchRes = await axios.get(`https://audiomack.com/api/search?q=${encodeURIComponent(query)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        
        const canciones = searchRes.data.songs.map(song => ({
            titulo: song.title,
            artista: song.artist,
            imagen: song.image,
            url: `https://audiomack.com/${song.artist_url}/song/${song.url_slug}` 
        }));

        res.json(canciones);
    } catch (error) {
        console.error("Error buscando:", error.message);
        res.status(500).json({ error: 'Error al buscar en el catálogo' });
    }
});

// EL EXTRACTOR DE AUDIO
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
        const infoRes = await axios.get(`https://audiomack.com/api/music/url/song/${datos.artista}/${datos.titulo}?extended=true`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        
        const urlAudioPuro = infoRes.data.url;
        if (!urlAudioPuro) throw new Error("Sin enlace directo");
        
        res.redirect(urlAudioPuro);
    } catch (error) {
        res.status(500).send('Error conectando con la API');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`FamiMusic App rugiendo en el puerto ${PORT}`));
