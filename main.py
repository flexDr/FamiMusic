import json
import urllib.request
import urllib.parse
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
import yt_dlp

app = FastAPI(title="FamiMusic")
app.mount("/static", StaticFiles(directory="static"), name="static")

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")

# Canciones de respaldo
BACKUP_SONGS = [
    {"id": "dQw4w9WgXcQ", "title": "Never Gonna Give You Up", "thumb": "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg"},
    {"id": "kJQP7kiw5Fk", "title": "Dance Monkey", "thumb": "https://img.youtube.com/vi/kJQP7kiw5Fk/hqdefault.jpg"},
]

@app.get("/")
def home():
    return FileResponse("templates/index.html")

@app.get("/search/{q}")
def search(q: str):
    if not YOUTUBE_API_KEY:
        return JSONResponse(content=BACKUP_SONGS)
    
    q_safe = urllib.parse.quote(q)
    url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q={q_safe}&type=video&key={YOUTUBE_API_KEY}"
    
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read().decode('utf-8'))
            resultados = []
            for item in data.get('items', []):
                if item['id'].get('videoId'):
                    vid = item['id']['videoId']
                    thumb = item['snippet']['thumbnails'].get('high', {}).get('url')
                    if not thumb:
                        thumb = item['snippet']['thumbnails'].get('medium', {}).get('url', '')
                    resultados.append({
                        "id": vid,
                        "title": item['snippet']['title'],
                        "thumb": thumb
                    })
            if not resultados:
                return JSONResponse(content=BACKUP_SONGS)
            return JSONResponse(content=resultados)
    except Exception as e:
        print(f"Error: {e}")
        return JSONResponse(content=BACKUP_SONGS)

@app.get("/audio/{video_id}")
def get_audio(video_id: str):
    """Devuelve la URL del stream de audio para reproducir con <audio>"""
    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            # Buscar la URL del stream de audio
            if 'url' in info:
                audio_url = info['url']
            else:
                # Buscar en formats
                for f in info.get('formats', []):
                    if f.get('acodec') != 'none' and f.get('vcodec') == 'none':
                        audio_url = f['url']
                        break
                else:
                    audio_url = info['formats'][0]['url']
        return JSONResponse({"audio_url": audio_url})
    except Exception as e:
        print(f"Error extrayendo audio: {e}")
        return JSONResponse({"error": "No se pudo obtener el audio"}, status_code=500)
