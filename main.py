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
    with yt_dlp.YoutubeDL({'extract_flat': True, 'quiet': True}) as ydl:
        info = ydl.extract_info(f"ytsearch15:{q} official audio", download=False)
        return [{"id": e['id'], "title": e['title'], "thumb": f"https://wsrv.nl/?url=https://img.youtube.com/vi/{e['id']}/mqdefault.jpg"} for e in info.get('entries', []) if e.get('id')]

@app.get("/stream/{id}")
def stream(id: str):
    # 1. Intentamos Cobalt API (Servidores globales sin bloqueo de país)
    cobalt_api = "https://api.cobalt.tools/api/json"
    data = json.dumps({
        "url": f"https://www.youtube.com/watch?v={id}",
        "isAudioOnly": True,
        "aFormat": "mp3"
    }).encode('utf-8')
    
    try:
        req = urllib.request.Request(cobalt_api, data=data, headers={
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)'
        })
        with urllib.request.urlopen(req, timeout=4, context=ctx) as response:
            result = json.loads(response.read().decode('utf-8'))
            if 'url' in result:
                # El iPhone recibe un link MP3 universal y lo reproduce de inmediato
                return RedirectResponse(result['url'])
    except:
        pass
        
    # 2. Respaldo Invidious (Túneles europeos con proxy local)
    instances = [
        "https://inv.tux.pizza",
        "https://invidious.nerdvpn.de",
        "https://inv.nadeko.net"
    ]
    random.shuffle(instances) # Alternamos para no saturar uno solo
    
    for inst in instances:
        url = f"{inst}/latest_version?id={id}&itag=140&local=true"
        try:
            # Hacemos un ping rapidísimo para ver si el servidor europeo responde
            req = urllib.request.Request(url, method="HEAD", headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=2, context=ctx) as r:
                if r.status == 200:
                    return RedirectResponse(url)
        except:
            continue
            
    return {"error": "Red ocupada"}
