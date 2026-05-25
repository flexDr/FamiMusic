import json
import urllib.request
import urllib.parse
import ssl
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
    q_safe = urllib.parse.quote(q)
    nodos = [
        "https://inv.tux.pizza",
        "https://invidious.nerdvpn.de",
        "https://inv.nadeko.net",
        "https://invidious.jing.rocks"
    ]
    random.shuffle(nodos)
    
    for nodo in nodos:
        try:
            req = urllib.request.Request(f"{nodo}/api/v1/search?q={q_safe}&type=video", headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=3, context=ctx) as r:
                datos = json.loads(r.read().decode('utf-8'))
                resultados = []
                for item in datos:
                    if item.get('videoId'):
                        thumb = item.get('videoThumbnails', [{}])[0].get('url', f"https://wsrv.nl/?url=https://img.youtube.com/vi/{item['videoId']}/mqdefault.jpg")
                        resultados.append({"id": item['videoId'], "title": item['title'], "thumb": thumb})
                        if len(resultados) >= 15: break
                if resultados: return resultados
        except:
            continue

    # === EL SALVAVIDAS ===
    # Si YouTube nos bloquea, esto salva la aplicación de quedarse frisada en negro.
    return [
        {"id": "G8v8D-80qGk", "title": "El Alfa El Jefe - La Mama de la Mama", "thumb": "https://img.youtube.com/vi/G8v8D-80qGk/mqdefault.jpg"},
        {"id": "LvoRzYMuTZ0", "title": "Bryant Myers, Anuel AA - Bajen Pa Ca", "thumb": "https://img.youtube.com/vi/LvoRzYMuTZ0/mqdefault.jpg"},
        {"id": "fU9BNkGF_gM", "title": "Noriel - Diablita ft. Anuel AA", "thumb": "https://img.youtube.com/vi/fU9BNkGF_gM/mqdefault.jpg"},
        {"id": "kxV1xPj-WwQ", "title": "El Alfa - Los Aparatos", "thumb": "https://img.youtube.com/vi/kxV1xPj-WwQ/mqdefault.jpg"}
    ]

@app.get("/api/audio/{id}")
def proxy_audio(id: str):
    # Redirección directa para que el iPhone reciba el formato exacto sin esperas
    nodos = ["https://inv.tux.pizza", "https://invidious.nerdvpn.de", "https://inv.nadeko.net"]
    return RedirectResponse(f"{random.choice(nodos)}/latest_version?id={id}&itag=140&local=true")

@app.get("/api/video/{id}")
def proxy_video(id: str):
    nodos = ["https://inv.tux.pizza", "https://invidious.nerdvpn.de", "https://invidious.jing.rocks"]
    return RedirectResponse(f"{random.choice(nodos)}/latest_version?id={id}&itag=18&local=true")
