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

def get_piped_stream(video_id):
    # La red Piped: Más rápida, más estable y entrega el formato M4A exacto para el iPhone
    instances = [
        "https://pipedapi.kavin.rocks",
        "https://pipedapi.tokhmi.xyz",
        "https://pipedapi.smnz.de",
        "https://pipedapi.adminforge.de"
    ]
    for inst in instances:
        try:
            req = urllib.request.Request(f"{inst}/streams/{video_id}", headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=4, context=ctx) as response:
                data = json.loads(response.read().decode())
                if 'audioStreams' in data:
                    # Filtramos específicamente el M4A para complacer a Apple
                    for f in data['audioStreams']:
                        if f.get('format') == 'M4A':
                            return f['url'], 0
        except Exception:
            continue
    return None, 0

@app.get("/stream/{id}")
def stream(id: str, title: str = "", mode: str = "audio"):
    # Tu servidor de EE.UU. conecta directo con la red Piped
    url_piped, dur = get_piped_stream(id)
    
    if url_piped:
        return {"url": url_piped, "duracion": dur}
        
    return {"url": None}
