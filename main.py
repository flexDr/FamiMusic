import json
import urllib.request
import urllib.parse
import ssl
import random
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse, JSONResponse
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
    # Anti-caché para Safari
    headers = {"Cache-Control": "no-cache, no-store, must-revalidate"}

    # Motor 1: Piped API (A prueba de bloqueos de IP)
    nodos = ["https://pipedapi.kavin.rocks", "https://pipedapi.smnz.de", "https://pipedapi.tokhmi.xyz"]
    random.shuffle(nodos)
    
    for nodo in nodos:
        try:
            req = urllib.request.Request(f"{nodo}/search?q={q_safe}&filter=all", headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=4, context=ctx) as r:
                datos = json.loads(r.read().decode('utf-8'))
                resultados = []
                for item in datos.get('items', []):
                    if item.get('type') == 'stream':
                        video_id = item['url'].replace('/watch?v=', '')
                        thumb = f"https://img.youtube.com/vi/{video_id}/mqdefault.jpg"
                        resultados.append({"id": video_id, "title": item['title'], "thumb": thumb})
                        if len(resultados) >= 15: break
                if resultados: return JSONResponse(content=resultados, headers=headers)
        except:
            continue

    # EL SALVAVIDAS INMORTAL (Si todo falla, jamás habrá pantalla negra)
    salvavidas = [
        {"id": "G8v8D-80qGk", "title": "El Alfa El Jefe - La Mama de la Mama", "thumb": "https://img.youtube.com/vi/G8v8D-80qGk/mqdefault.jpg"},
        {"id": "LvoRzYMuTZ0", "title": "Bryant Myers, Anuel AA - Bajen Pa Ca", "thumb": "https://img.youtube.com/vi/LvoRzYMuTZ0/mqdefault.jpg"},
        {"id": "fU9BNkGF_gM", "title": "Noriel - Diablita ft. Anuel AA", "thumb": "https://img.youtube.com/vi/fU9BNkGF_gM/mqdefault.jpg"},
        {"id": "kxV1xPj-WwQ", "title": "El Alfa - Los Aparatos", "thumb": "https://img.youtube.com/vi/kxV1xPj-WwQ/mqdefault.jpg"}
    ]
    return JSONResponse(content=salvavidas, headers=headers)

@app.get("/api/audio/{id}")
def proxy_audio(id: str):
    # Redirige el reproductor al archivo M4A nativo de Apple
    nodos_inv = ["https://inv.tux.pizza", "https://invidious.nerdvpn.de", "https://invidious.jing.rocks", "https://inv.nadeko.net"]
    nodo = random.choice(nodos_inv)
    return RedirectResponse(f"{nodo}/latest_version?id={id}&itag=140&local=true")

@app.get("/api/video/{id}")
def proxy_video(id: str):
    nodos_inv = ["https://inv.tux.pizza", "https://invidious.nerdvpn.de", "https://invidious.jing.rocks", "https://inv.nadeko.net"]
    nodo = random.choice(nodos_inv)
    return RedirectResponse(f"{nodo}/latest_version?id={id}&itag=18&local=true")
