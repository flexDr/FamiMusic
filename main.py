import json
import urllib.request
import ssl
import yt_dlp
import random
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
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
    # LA CARA: Buscamos en YouTube para tener fotos HD y el catálogo oficial completo
    with yt_dlp.YoutubeDL({'extract_flat': True, 'quiet': True}) as ydl:
        info = ydl.extract_info(f"ytsearch15:{q}", download=False)
        return [{"id": e['id'], "title": e['title'], "thumb": f"https://wsrv.nl/?url=https://img.youtube.com/vi/{e['id']}/mqdefault.jpg"} for e in info.get('entries', []) if e.get('id')]

@app.get("/stream")
def stream(title: str, id: str):
    # EL MOTOR 1: Tomamos el título oficial y sacamos el MP3 rápido de SoundCloud
    try:
        with yt_dlp.YoutubeDL({'extract_flat': True, 'quiet': True}) as ydl:
            busqueda = ydl.extract_info(f"scsearch1:{title}", download=False)
            if busqueda and busqueda.get('entries'):
                sc_url = busqueda['entries'][0]['url']
                with yt_dlp.YoutubeDL({'format': 'bestaudio/best', 'quiet': True}) as ydl2:
                    audio_info = ydl2.extract_info(sc_url, download=False)
                    if audio_info.get('url'):
                        return RedirectResponse(audio_info['url'])
    except:
        pass
        
    # EL MOTOR 2 (PLAN B): Si la canción no está en SoundCloud, usamos la red Piped (YouTube)
    nodos = [
        "https://pipedapi.kavin.rocks",
        "https://pipedapi.tokhmi.xyz",
        "https://pipedapi.smnz.de"
    ]
    random.shuffle(nodos)
    for nodo in nodos:
        try:
            req = urllib.request.Request(f"{nodo}/streams/{id}", headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=3, context=ctx) as r:
                datos = json.loads(r.read())
                for f in datos.get('audioStreams', []):
                    if f.get('format') == 'M4A':
                        return RedirectResponse(f['url'])
        except:
            continue
            
    return RedirectResponse("/")
