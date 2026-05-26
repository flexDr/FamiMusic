import json
import urllib.request
import urllib.parse
import os
import requests
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
import yt_dlp

app = FastAPI(title="FamiMusic")
app.mount("/static", StaticFiles(directory="static"), name="static")

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")

# Canciones de respaldo si no hay API key
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
                    resultados.append({
                        "id": vid,
                        "title": item['snippet']['title'],
                        "thumb": item['snippet']['thumbnails']['high']['url']
                    })
            return JSONResponse(content=resultados)
    except Exception as e:
        print("Error YouTube:", e)
        return JSONResponse(content=[])

@app.get("/stream/{video_id}")
async def stream(video_id: str):
    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'no_warnings': True,
        'noplaylist': True,
        'extract_flat': False,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            audio_url = info['url']
            title = info.get('title', 'Sin título')
        except Exception as e:
            return JSONResponse({"error": f"No se pudo obtener el audio: {str(e)}"}, status_code=400)

    def iter_audio():
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': '*/*',
        }
        with requests.get(audio_url, stream=True, headers=headers) as r:
            r.raise_for_status()
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    yield chunk

    return StreamingResponse(
        iter_audio(),
        media_type="audio/mp4",
        headers={
            "Content-Disposition": f'inline; filename="{title}.m4a"',
            "Cache-Control": "no-cache",
        }
    )
