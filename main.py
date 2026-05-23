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
    # yt-dlp solo lo usamos para buscar los nombres, que es súper rápido y no lo bloquean
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

def get_invidious_stream(video_id):
    # Lista ampliada de servidores europeos de alta velocidad
    instances = [
        "https://inv.tux.pizza",
        "https://invidious.nerdvpn.de",
        "https://inv.nadeko.net",
        "https://invidious.jing.rocks",
        "https://invidious.fdn.fr"
    ]
    for inst in instances:
        try:
            req = urllib.request.Request(f"{inst}/api/v1/videos/{video_id}", headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=3, context=ctx) as response:
                data = json.loads(response.read().decode())
                if 'adaptiveFormats' in data:
                    for f in data['adaptiveFormats']:
                        if 'audio/mp4' in f.get('type', '') or 'm4a' in f.get('type', ''):
                            url = f['url']
                            if url.startswith('/'): url = inst + url
                            # Esto es clave: obliga al servidor europeo a proxy la música para evadir CORS
                            if 'local=true' not in url: url += '&local=true' if '?' in url else '?local=true'
                            return url, data.get('lengthSeconds', 0)
        except Exception:
            continue
    return None, 0

@app.get("/stream/{id}")
def stream(id: str, title: str = "", mode: str = "audio"):
    # Saltamos el bloqueo de EE.UU. y vamos directo al túnel europeo en 1 segundo
    url_inv, segundos = get_invidious_stream(id)
    
    if url_inv:
        return {"url": url_inv, "duracion": segundos}
        
    return {"url": None}
