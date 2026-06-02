const express = require('express');
const axios = require('axios'); // Asegúrate de hacer: npm install axios
const app = express();

// Lista de servidores públicos de Invidious estables
const INVIDIOUS_INSTANCES = [
    'https://nerdvpn.de',
    'https://yewtu.be',
    'https://puffyan.us',
    'https://tux.digital'
];

app.get('/api/stream', async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).send('Falta la URL');

    // Extraer el ID del video (ejemplo: ajSprgoe0WI)
    const videoIdMatch = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?\S*v=))([\w-]{11})/);
    if (!videoIdMatch) return res.status(400).send('URL de YouTube inválida');
    const videoId = videoIdMatch[1];

    // Configurar cabeceras de streaming para Safari y PWAs
    res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Accept-Ranges': 'bytes',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked'
    });

    // Intentar obtener el flujo de audio desde las instancias de Invidious
    for (const instance of INVIDIOUS_INSTANCES) {
        try {
            // Consultamos la API de la instancia para obtener las URLs directas de los archivos
            const response = await axios.get(`${instance}/api/v1/videos/${videoId}`);
            const adaptiveFormats = response.data.adaptiveFormats;

            // Buscamos una pista que sea solo audio (audio/webm o audio/mp4)
            const audioTrack = adaptiveFormats.find(format => format.type.startsWith('audio/'));

            if (audioTrack && audioTrack.url) {
                // Hacemos un puente (Pipe) del audio directamente hacia Safari/Tu PWA
                const audioStream = await axios({
                    method: 'get',
                    url: audioTrack.url,
                    responseType: 'stream'
                });

                audioStream.data.pipe(res);
                return; // Éxito, salimos de la función
            }
        } catch (error) {
            console.warn(`Instancia ${instance} falló, intentando la siguiente...`);
        }
    }

    // Si todas las instancias fallan
    res.status(502).send('No se pudo extraer el audio en este momento.');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Motor rugiendo en el puerto ${PORT}`));
    });

   const ytdl = spawn('yt-dlp', [
    '-o', '-', 
    '-f', 'ba/b', // Busca mejor audio (ba), si falla, usa el video+audio más ligero (b)
    '--no-playlist',
    '--no-cache-dir',
    '--cookies', './cookies.txt',
    '--extractor-args', 'youtube:player_client=web', 
    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    videoUrl
]);

    // FFmpeg empaquetando un MP3 limpio en vuelo
    const ffmpeg = spawn('ffmpeg', [
        '-i', 'pipe:0',
        '-vn',
        '-f', 'mp3',
        '-acodec', 'libmp3lame',
        '-ab', '128k',
        'pipe:1'
    ]);

    // Conectar las tuberías
    ytdl.stdout.pipe(ffmpeg.stdin);
    ffmpeg.stdout.pipe(res);

    // Registro de errores hacia la consola de Render
    ytdl.stderr.on('data', (data) => console.error('yt-dlp log:', data.toString()));

    // Función segura para matar procesos zombies
    function destroyProcesses() {
        if (!ytdl.killed) ytdl.kill('SIGKILL');
        if (!ffmpeg.killed) ffmpeg.kill('SIGKILL');
    }
});

// Render inyecta el puerto dinámicamente aquí
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Motor de Node.js rugiendo en el puerto ${PORT}`));
