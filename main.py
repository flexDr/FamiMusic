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

# Montamos la carpeta estática para la PWA (archivos JS)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Ruta principal buscando en la carpeta templates
@app.get("/")
async def index():
    return FileResponse("templates/index.html")

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
            # Comando de extracción optimizado (Sin disfraz, directo al audio)
            ytdl_cmd = [
                'yt-dlp', '-o', '-', '-f', 'bestaudio/best', '--no-playlist', '--no-cache-dir',
                '--cookies', 'cookies.txt',
                url
            ]
            # Comando de conversión a MP3
            ffmpeg_cmd = [
                'ffmpeg', '-i', 'pipe:0', '-vn', '-f', 'mp3', '-acodec', 'libmp3lame',
                '-ab', '128k', 'pipe:1'
            ]

            # ¡SIN SILENCIADORES! (Quitamos stderr=subprocess.DEVNULL)
            # Ahora los errores irán directo a los logs de Render
            ytdl_process = subprocess.Popen(ytdl_cmd, stdout=subprocess.PIPE)
            ffmpeg_process = subprocess.Popen(ffmpeg_cmd, stdin=ytdl_process.stdout, stdout=subprocess.PIPE)
            
            # Cerramos la salida de ytdl en Python para que fluya directo a ffmpeg
            ytdl_process.stdout.close()

            # Leer y transmitir en fragmentos de 64KB
            while True:
                # Si Safari desconecta, rompemos el ciclo inmediatamente
                if await request.is_disconnected():
                    break
                chunk = ffmpeg_process.stdout.read(1024 * 64)
                if not chunk:
                    break
                yield chunk
        except Exception as e:
            logging.error(f"Error en transmisión: {e}")
        finally:
            # Asesino de Zombies: matar procesos si se corta la conexión
            if ytdl_process and ytdl_process.poll() is None:
                ytdl_process.kill()
            if ffmpeg_process and ffmpeg_process.poll() is None:
                ffmpeg_process.kill()

    return StreamingResponse(audio_generator(), headers=headers, media_type="audio/mpeg")
