import json
import urllib.request
import urllib.parse
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI(title="FamiMusic")
app.mount("/static", StaticFiles(directory="static"), name="static")

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")

BACKUP_SONGS = [
    {"id": "dQw4w9WgXcQ", "title": "Never Gonna Give You Up", "thumb": "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg"},
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
                    thumb = item['snippet']['thumbnails'].get('high', {}).get('url') or item['snippet']['thumbnails'].get('medium', {}).get('url', '')
                    resultados.append({"id": vid, "title": item['snippet']['title'], "thumb": thumb})
            return JSONResponse(content=resultados if resultados else BACKUP_SONGS)
    except Exception as e:
        print(f"Error: {e}")
        return JSONResponse(content=BACKUP_SONGS)
