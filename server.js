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

// EL EXTRACTOR COMERCIAL (Conectado a la bóveda global de JioSaavn)
app.get('/api/get-audio', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Falta la canción' });

    try {
        // Tu iPhone le añade "audio oficial" a las búsquedas. 
        // Se lo quitamos para buscar el nombre limpio y exacto en la base de datos comercial.
        const cleanQuery = query.replace(/audio oficial/gi, '').trim();
        console.log(`[BUSCANDO EN BÓVEDA COMERCIAL] ${cleanQuery}`);

        // Nodos Open Source que conectan directo con la API sin bloqueos de Cloudflare
        const saavnNodes = [
            'https://saavn.dev/api/search/songs',
            'https://jiosaavn-api-privatecvc2.b4a.run/search/songs'
        ];

        for (let url of saavnNodes) {
            try {
                // Le damos 8 segundos a Render para traer los datos
                const searchRes = await axios.get(`${url}?query=${encodeURIComponent(cleanQuery)}`, { timeout: 8000 });
                const data = searchRes.data;

                // Verificamos que la búsqueda fue exitosa y hay resultados
                if (data && data.success && data.data && data.data.results && data.data.results.length > 0) {
                    const song = data.data.results[0];
                    
                    // Extraemos los enlaces de descarga directa
                    if (song.downloadUrl && song.downloadUrl.length > 0) {
                        // Agarramos la URL de mayor calidad (suele ser la última del array, ej. 320kbps)
                        const bestAudio = song.downloadUrl[song.downloadUrl.length - 1];
                        console.log(`[VICTORIA] Audio comercial extraído: ${song.name}`);
                        
                        // Enviamos el audio limpio al reproductor de tu iPhone
                        return res.json({ url: bestAudio.url });
                    }
                }
            } catch (e) {
                console.log(`[FALLO] Nodo ${url} lento o caído. Cambiando de servidor...`);
                continue;
            }
        }

        throw new Error("La canción no está disponible en este catálogo");

    } catch (error) {
        console.error(`[DERROTA] ${error.message}`);
        res.status(500).json({ error: 'Render no pudo extraer el audio en este momento.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Motor Comercial listo en el puerto ${PORT}`));
