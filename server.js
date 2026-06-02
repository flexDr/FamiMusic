const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const app = express();

// Rutas para servir tu interfaz web y la PWA
app.use('/static', express.static(path.join(__dirname, 'static')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});

app.get('/sw.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'sw.js'));
});

app.get('/manifest.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'manifest.json'));
});

// Ruta maestra de extracción de audio
app.get('/api/stream', (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).send('Falta la URL');

    // Forzar limpieza si Safari o el iPhone cortan la conexión
    res.on('close', () => {
        destroyProcesses();
    });

    // Cabeceras anti-bloqueo para que Safari acepte el flujo en vivo
    res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Accept-Ranges': 'bytes',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked'
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
