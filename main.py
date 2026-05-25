import json
import urllib.request
import urllib.parse
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI(title="FamiMusic")

# Servir archivos estáticos (CSS, JS, etc.)
app.mount("/static", StaticFiles(directory="static"), name="static")

# ========== VARIABLES DE ENTORNO (configúralas en Render) ==========
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")
# Si quieres IA, también necesitarás:
# GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

@app.get("/")
def home():
    return FileResponse("templates/index.html")

@app.get("/search/{q}")
def search(q: str):
    if not YOUTUBE_API_KEY:
        return JSONResponse({"error": "API Key no configurada"}, status_code=400)
    
    q_safe = urllib.parse.quote(q)
    url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q={q_safe}&type=video&videoCategoryId=10&regionCode=DO&key={YOUTUBE_API_KEY}"
    
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read().decode('utf-8'))
            
            resultados = []
            for item in data.get('items', []):
                if item['id'].get('videoId'):
                    vid = item['id']['videoId']
                    thumb = item['snippet']['thumbnails'].get('high', item['snippet']['thumbnails']['medium'])['url']
                    resultados.append({
                        "id": vid,
                        "title": item['snippet']['title'],
                        "thumb": thumb
                    })
            return JSONResponse(content=resultados)
    except Exception as e:
        print("Error YouTube:", e)
        return JSONResponse(content=[])

# (Opcional) Endpoint para IA - lo añades si quieres
# @app.get("/recommend/{video_id}")
# ... (código que te puse antes)
