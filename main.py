import json
import urllib.request
import urllib.parse
import os
import yt_dlp
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI(title="FamiMusic")
app.mount("/static", StaticFiles(directory="static"), name="static")

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")

@app.get("/")
def home():
    return FileResponse("templates/index.html")

@app.get("/search/{q}")
def search(q: str):
    q_safe = urllib.parse.quote(q)
    url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q={q_safe}&type=video&key={YOUTUBE_API_KEY}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read().decode('utf-8'))
            resultados = []
            for item in data.get('items', []):
                if item['id'].get('videoId'):
                    resultados.append({
                        "id": item['id']['videoId'],
                        "title": item['snippet']['title'],
                        "thumb": item['snippet']['thumbnails']['high']['url']
                    })
            return JSONResponse(content=resultados)
    except:
        return JSONResponse(content=[])

@app.get("/audio/{video_id}")
def get_audio_url(video_id: str):
    # Esto es el "motor" que extrae el audio directo y lo pasa a tu reproductor HTML5
    ydl_opts = {'format': 'bestaudio', 'quiet': True}
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
        return {"url": info['url']}            resultados = []
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
