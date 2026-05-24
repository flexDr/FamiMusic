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
    with yt_dlp.YoutubeDL({'extract_flat': True, 'quiet': True}) as ydl:
        info = ydl.extract_info(f"ytsearch15:{q} official audio", download=False)
        return [{"id": e['id'], "title": e['title'], "thumb": f"https://wsrv.nl/?url=https://img.youtube.com/vi/{e['id']}/mqdefault.jpg"} for e in info.get('entries', []) if e.get('id')]

@app.get("/stream/{id}")
def stream(id: str):
    # 1. Red Piped (Extrae la música limpia sin que YouTube bloquee la IP)
    instances = ["https://pipedapi.kavin.rocks", "https://pipedapi.smnz.de", "https://pipedapi.adminforge.de"]
    for inst in instances:
        try:
            req = urllib.request.Request(f"{inst}/streams/{id}", headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=3, context=ctx) as r:
                for f in json.loads(r.read()).get('audioStreams', []):
                    if f.get('format') == 'M4A':
                        # EL TRUCO: Redirigimos a Safari directo al archivo
                        return RedirectResponse(f['url'])
        except:
            continue

    # 2. Respaldo de yt-dlp
    try:
        with yt_dlp.YoutubeDL({'format': 'bestaudio[ext=m4a]/bestaudio/best', 'quiet': True}) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={id}", download=False)
            return RedirectResponse(info['url'])
    except:
        return {"error": "Bloqueo temporal"}
