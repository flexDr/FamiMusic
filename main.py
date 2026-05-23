import json
import urllib.request
import ssl
import yt_dlp
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

@app.get("/")
def home(): 
    return FileResponse("templates/index.html")

@app.get("/search/{q}")
def search(q: str):
    # Seguimos usando yt-dlp solo para buscar los nombres (eso nunca lo bloquean)
    busqueda_limpia = f"{q} official audio"
    with yt_dlp.YoutubeDL({'extract_flat': True, 'quiet': True}) as ydl:
        info = ydl.extract_info(f"ytsearch15:{busqueda_limpia}", download=False)
        resultados = []
        if 'entries' in info:
            for e in info['entries']:
                if e.get('id') and e.get('title'):
                    resultados.append({
                        "id": e['id'], 
                        "title": e['title'], 
                        "thumb": f"https://wsrv.nl/?url=https://img.youtube.com/vi/{e['id']}/mqdefault.jpg"
                    })
        return resultados

@app.get("/stream/{id}")
def stream(id: str, title: str = "", mode: str = "audio"):
    # EL NUEVO MOTOR: COBALT API (Adiós a los bloqueos)
    url_video = f"https://www.youtube.com/watch?v={id}"
    cobalt_api = "https://api.cobalt.tools/api/json"
    
    # Le ordenamos a la API que nos entregue un MP3 perfecto para Apple
    data = json.dumps({
        "url": url_video,
        "isAudioOnly": True,
        "aFormat": "mp3" 
    }).encode('utf-8')
    
    req = urllib.request.Request(cobalt_api, data=data, headers={
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
    })
    
    try:
        with urllib.request.urlopen(req, timeout=10, context=ctx) as response:
            result = json.loads(response.read().decode('utf-8'))
            if 'url' in result:
                # El enlace directo de Cobalt va hacia tu iPhone
                return {"url": result['url'], "duracion": 0}
    except Exception as e:
        print(f"Error de Cobalt: {e}")
        
    return {"url": None}
