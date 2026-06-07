const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());

// Mantenemos tus rutas visuales que ya funcionaron perfecto
app.use('/static', express.static(path.join(__dirname, 'static')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'templates', 'index.html')));
app.get('/sw.js', (req, res) => res.sendFile(path.join(__dirname, 'static', 'sw.js')));
app.get('/manifest.json', (req, res) => res.sendFile(path.join(__dirname, 'static', 'manifest.json')));

// 1. EL NUEVO BUSCADOR (Potenciado por Apple Music / iTunes)
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Falta la búsqueda' });

    try {
        // Le preguntamos a Apple, que jamás bloquea las peticiones
        const searchRes = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=20`);
        
        const canciones = searchRes.data.results.map(song => ({
            titulo: song.trackName,
            artista: song.artistName,
            // Apple nos da la imagen pequeña, la cambiamos a alta resolución (512x512)
            imagen: song.artworkUrl100.replace('100x100bb', '512x512bb'),
            // En lugar de una URL, mandamos el texto de búsqueda para el extractor
            url: `${song.artistName} ${song.trackName}` 
        }));

        res.json(canciones);
    } catch (error) {
        console.error("Error buscando en Apple:", error.message);
        res.status(500).json({ error: 'Error al buscar en el catálogo' });
    }
});

// 2. EL NUEVO EXTRACTOR (Potenciado por la red Piped)
app.get('/api/stream', async (req, res) => {
    const searchQuery = req.query.url; // Ej: "Huan 62"
    if (!searchQuery) return res.status(400).send('Falta la canción');

    // Múltiples servidores de respaldo por si alguno está lleno
    const pipedInstances = [
        "https://pipedapi.kavin.rocks",
        "https://pipedapi.tokhmi.xyz",
        "https://pipedapi.smnz.de"
    ];

    let streamUrl = null;

    for (let api of pipedInstances) {
        try {
            // Buscamos el ID interno de la canción
            const searchRes = await axios.get(`${api}/search?q=${encodeURIComponent(searchQuery)}`);
            if (!searchRes.data.items || searchRes.data.items.length === 0) continue;
            
            const videoUrl = searchRes.data.items[0].url;
            const videoId = videoUrl.split('v=')[1]; // Extraemos solo el código
            
            // Pedimos los enlaces puros de audio
            const streamRes = await axios.get(`${api}/streams/${videoId}`);
            const audioStreams = streamRes.data.audioStreams;
            if (!audioStreams || audioStreams.length === 0) continue;
            
            // Ordenamos para obtener la mejor calidad y seleccionamos la URL
            audioStreams.sort((a, b) => b.bitrate - a.bitrate);
            streamUrl = audioStreams[0].url;
            break; // ¡Bingo! Encontramos la canción, salimos del ciclo.
            
        } catch (error) {
            console.log(`Fallo en el servidor ${api}, intentando el siguiente...`);
            continue;
        }
    }

    if (streamUrl) {
        // Redirigimos el audio directamente a tu iPhone
        res.redirect(streamUrl);
    } else {
        res.status(500).send('Servidores de audio ocupados.');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Motor Híbrido FamiMusic rugiendo en el puerto ${PORT}`));
