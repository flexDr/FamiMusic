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

    // Tu configuración óptima de yt-dlp con cookies y cliente ios/web
    const ytdl = spawn('yt-dlp', [
        '-o', '-',
        '-f', 'ba',
        '--no-playlist',
        '--no-cache-dir',
        '--cookies', './cookies.txt',
        '--extractor-args', 'youtube:player_client=ios,web',
        '--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
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