import json
import urllib.request
import urllib.parse
import os
import ssl
import random
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI(title="FamiMusic")
app.mount("/static", StaticFiles(directory="static"), name="static")

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")

# Ignorar errores de certificados SSL
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

@app.get("/")
def home():
    return FileResponse("templates/index.html")

@app.get("/search/{q}")
def search(q: str):
    q_safe = urllib.parse.quote(q)
    url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q={q_safe}&type=video&key={YOUTUBE_API_KEY}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10, context=ctx) as r:
            data = json.loads(r.read().decode('utf-8'))
            resultados = []
            for item in data.get('items', []):
                if item.get('id', {}).get('videoId'):
                    resultados.append({
                        "id": item['id']['videoId'],
                        "title": item['snippet']['title'],
                        "thumb": item['snippet']['thumbnails'].get('high', {}).get('url', '')
                    })
            return JSONResponse(content=resultados)
    except Exception as e:
        return JSONResponse(content=[])

@app.get("/audio/{video_id}")
def get_audio_url(video_id: str):
    # BYPASS: Usamos nodos públicos descentralizados para evitar el bloqueo de YouTube a Render
    nodos = [
        "https://pipedapi.kavin.rocks",
        "https://pipedapi.smnz.de",
        "https://pipedapi.tokhmi.xyz"
    ]
    random.shuffle(nodos)
    
    for nodo in nodos:
        try:
            req = urllib.request.Request(f"{nodo}/streams/{video_id}", headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=6, context=ctx) as r:
                datos = json.loads(r.read().decode('utf-8'))
                for stream in datos.get('audioStreams', []):
                    # Formato M4A es perfecto para el Background Play del iPhone
                    if stream.get('format') == 'M4A':
                        return {"url": stream['url']}
        except Exception:
            continue
            
    # Plan de respaldo de emergencia si fallan los nodos principales
    return {"url": f"https://inv.tux.pizza/latest_version?id={video_id}&itag=140&local=true"}
