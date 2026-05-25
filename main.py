import json
import urllib.request
import urllib.parse
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI(title="FamiMusic")

app.mount("/static", StaticFiles(directory="static"), name="static")

# ←←← PON AQUÍ TU API KEY ←←←
YOUTUBE_API_KEY = "AIzaSyAqJjbwNKW8n15qslhnwhIooZ6T-6LAH4w"

@app.get("/")
def home():
    return FileResponse("templates/index.html")

@app.get("/search/{q}")
def search(q: str):
    q_safe = urllib.parse.quote(q)
    
    url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q={q_safe}&type=video&videoCategoryId=10&key={YOUTUBE_API_KEY}"
    
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read().decode('utf-8'))
            
            resultados = []
            for item in data.get('items', []):
                video_id = item['id']['videoId']
                resultados.append({
                    "id": video_id,
                    "title": item['snippet']['title'],
                    "thumb": item['snippet']['thumbnails']['high']['url']
                })
            return JSONResponse(content=resultados)
    except Exception as e:
        print("Error API YouTube:", e)
        # Fallback pequeño
        fallback = [
            {"id": "G8v8D-80qGk", "title": "El Alfa - La Mama de la Mama", "thumb": "https://img.youtube.com/vi/G8v8D-80qGk/hqdefault.jpg"}
        ]
        return JSONResponse(content=fallback)

@app.get("/api/audio/{video_id}")
def get_audio(video_id: str):
    # Por ahora usamos iframe (más estable)
    return JSONResponse({"url": f"https://www.youtube.com/embed/{video_id}?autoplay=1"})
