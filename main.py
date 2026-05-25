import json
import urllib.request
import ssl
import yt_dlp
import random
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse, StreamingResponse
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
    # LA CARA: Buscador oficial de YouTube para portadas HD y artistas reales
    with yt_dlp.YoutubeDL({'extract_flat': True, 'quiet': True}) as ydl:
        info = ydl.extract_info(f"ytsearch15:{q}", download=False)
        return [{"id": e['id'], "title": e['title'], "thumb": f"https://wsrv.nl/?url=https://img.youtube.com/vi/{e['id']}/mqdefault.jpg"} for e in info.get('entries', []) if e.get('id')]

@app.get("/api/audio/{id}")
def proxy_audio(id: str):
    # EL MÉTODO EXTREMO: Render se convierte en un tubo de descarga directa
    try:
        ydl_opts = {'format': 'bestaudio[ext=m4a]/bestaudio/best', 'quiet': True, 'nocheckcertificate': True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={id}", download=False)
            url_real = info['url']
        
        req = urllib.request.Request(url_real, headers={'User-Agent': 'Mozilla/5.0'})
        respuesta = urllib.request.urlopen(req, context=ctx)
        
        def tubo_de_datos():
            while True:
                pedazo = respuesta.read(65536) # Mandamos 64KB por paquete a la RAM del celular
                if not pedazo: break
                yield pedazo
                
        return StreamingResponse(tubo_de_datos(), media_type="audio/mp4")
    except Exception as e:
        return RedirectResponse(f"https://inv.tux.pizza/latest_version?id={id}&itag=140&local=true")

@app.get("/api/video/{id}")
def proxy_video(id: str):
    # El video es muy pesado para el Tubo RAM, usamos la red europea blindada
    nodos = ["https://inv.tux.pizza", "https://invidious.nerdvpn.de", "https://invidious.jing.rocks"]
    return RedirectResponse(f"{random.choice(nodos)}/latest_version?id={id}&itag=18&local=true")
