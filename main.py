import json
import urllib.request
import urllib.parse
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI(title="FamiMusic")

app.mount("/static", StaticFiles(directory="static"), name="static")

# ================== TU API KEY ==================
YOUTUBE_API_KEY = "AIzaSyAqJjbwNKW8n15qslhnwhIooZ6T-6LAH4w"   # ← Asegúrate que esté correcta

@app.get("/")
def home():
    return FileResponse("templates/index.html")

@app.get("/search/{q}")
def search(q: str):
    if YOUTUBE_API_KEY == "TU_CLAVE_REAL_AQUI":
        return JSONResponse({"error": "Falta API Key"}, status_code=400)
    
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
                    resultados.append({
                        "id": vid,
                        "title": item['snippet']['title'],
                        "thumb": item['snippet']['thumbnails'].get('high', item['snippet']['thumbnails']['medium'])['url']
                    })
            return JSONResponse(content=resultados)
    except Exception as e:
        print("Error YouTube:", e)
        return JSONResponse(content=[])

@app.get("/api/play/{video_id}")
def play(video_id: str):
    return JSONResponse({
        "embed_url": f"https://www.youtube.com/embed/{video_id}?autoplay=1&enablejsapi=1"
    })
