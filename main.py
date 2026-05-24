import json
import urllib.request
import ssl
import yt_dlp
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
    # Volvemos a YouTube: Busca a la velocidad de la luz y nunca deja la pantalla vacía
    with yt_dlp.YoutubeDL({'extract_flat': True, 'quiet': True}) as ydl:
        info = ydl.extract_info(f"ytsearch15:{q} mix", download=False)
        return [{"id": e['id'], "title": e['title'], "thumb": f"https://wsrv.nl/?url=https://img.youtube.com/vi/{e['id']}/mqdefault.jpg"} for e in info.get('entries', []) if e.get('id')]

@app.get("/stream/{id}")
def stream(id: str):
    # API COBALT CON FIRMAS DE SEGURIDAD (Genera un MP3 directo para tu celular)
    url_api = "https://api.cobalt.tools/api/json"
    datos = json.dumps({
        "url": f"https://www.youtube.com/watch?v={id}",
        "isAudioOnly": True,
        "aFormat": "mp3"
    }).encode('utf-8')

    cabeceras = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Origin": "https://cobalt.tools",
        "Referer": "https://cobalt.tools/",
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)"
    }

    try:
        req = urllib.request.Request(url_api, data=datos, headers=cabeceras)
        with urllib.request.urlopen(req, timeout=8, context=ctx) as respuesta:
            res = json.loads(respuesta.read().decode())
            if "url" in res:
                # Redirige a tu celular al MP3 directo, sin pasar por los bloqueos
                return RedirectResponse(res["url"])
    except:
        pass

    # PLAN B: Red Piped (Por si Cobalt se satura)
    try:
        req2 = urllib.request.Request(f"https://pipedapi.kavin.rocks/streams/{id}", headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req2, timeout=4, context=ctx) as r:
            datos_piped = json.loads(r.read())
            for f in datos_piped.get('audioStreams', []):
                if f.get('format') == 'M4A':
                    return RedirectResponse(f['url'])
    except:
        pass

    return RedirectResponse("/")
