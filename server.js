const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Función para extraer el nombre del artista y la pista de la URL
// Ejemplo: https://audiomack.com/badbunny/song/titimepregonto
function extraerDatosUrl(url) {
    try {
        const urlObj = new URL(url);
        const partes = urlObj.pathname.split('/').filter(Boolean);
        // partes[0] = artista, partes[1] = 'song', partes[2] = titulo
        if (partes.length >= 3) {
            return { artista: partes[0], titulo: partes[2] };
        }
        return null;
    } catch (e) {
        return null;
    }
}

app.get('/api/stream', async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).send('Falta la URL de Audiomack');

    const datos = extraerDatosUrl(videoUrl);
    if (!datos) return res.status(400).send('URL no válida');

    try {
        // PASO 1: Engañamos a la API pública para obtener el ID de la pista
        const infoRes = await axios.get(`https://audiomack.com/api/music/url/song/${datos.artista}/${datos.titulo}?extended=true`);
        
        // La API nos devuelve directamente el enlace del MP3 limpio
        const urlAudioPuro = infoRes.data.url;

        if (!urlAudioPuro) {
            throw new Error("Audiomack no devolvió el enlace directo.");
        }

        // PASO 2: Redirigimos el reproductor de tu iPhone directo a la mina de oro
        res.redirect(urlAudioPuro);

    } catch (error) {
        console.error("Error al extraer:", error.message);
        res.status(500).send('Error conectando con la API de Audiomack');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Motor API Gateway rugiendo en el puerto ${PORT}`);
});
