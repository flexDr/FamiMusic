import subprocess
import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="MusicAPI Pro")

# Configuramos CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montamos la carpeta estática para la PWA
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def index():
    return FileResponse("static/index.html")

@app.get("/sw.js")
async def service_worker():
    return FileResponse("static/sw.js", media_type="application/javascript")

@app.get("/manifest.json")
async def manifest():
    return FileResponse("static/manifest.json", media_type="application/json")

@app.get("/api/stream")
async def stream_audio(request: Request, url: str):
    if not url:
        raise HTTPException(status_code=400, detail="Falta la URL")

    # Cabeceras anti-bloqueo para Safari
    headers = {
        'Content-Type': 'audio/mpeg',
        'Accept-Ranges': 'bytes',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked'
    }

    async def audio_generator():
        ytdl_process = None
        ffmpeg_process = None
        try:
            # 1. Extraer audio combinado evitando bloqueos de YT
            ytdl_cmd = [
                'yt-dlp', '-o', '-', '-f', 'best', '--no-playlist', '--no-cache-dir',
                '--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
                url
            ]
            # 2. Forzar MP3 limpio e ignorar el video
            ffmpeg_cmd = [
                'ffmpeg', '-i', 'pipe:0', '-vn', '-f', 'mp3', '-acodec', 'libmp3lame',
                '-ab', '128k', 'pipe:1'
            ]

            ytdl_process = subprocess.Popen(ytdl_cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
            ffmpeg_process = subprocess.Popen(ffmpeg_cmd, stdin=ytdl_process.stdout, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
            
            # Cerramos la salida de ytdl en Python para que fluya directo a ffmpeg
            ytdl_process.stdout.close()

            # 3. Leer y transmitir en fragmentos
            while True:
                # Si Safari desconecta, rompemos el ciclo inmediatamente
                if await request.is_disconnected():
                    break
                chunk = ffmpeg_process.stdout.read(1024 * 64) # Fragmentos de 64KB
                if not chunk:
                    break
                yield chunk
        except Exception as e:
            logging.error(f"Error en transmisión: {e}")
        finally:
            # 4. Asesino de Zombies (Igual que res.on('close'))
            if ytdl_process and ytdl_process.poll() is None:
                ytdl_process.kill()
            if ffmpeg_process and ffmpeg_process.poll() is None:
                ffmpeg_process.kill()

    return StreamingResponse(audio_generator(), headers=headers, media_type="audio/mpeg")
