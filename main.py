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
    # EL NUEVO BUSCADOR BLINDADO: Usamos redes descentralizadas.
    # YouTube no puede bloquear esto porque Render jamás los contacta directamente.
    nodos_busqueda = [
        "https://pipedapi.kavin.rocks",
        "https://pipedapi.smnz.de",
        "https://pipedapi.tokhmi.xyz",
        "https://piped-api.lunar.icu"
    ]
    random.shuffle(nodos_busqueda)
    q_safe = urllib.parse.quote(q)
    
    for nodo in nodos_busqueda:
        try:
            req = urllib.request.Request(f"{nodo}/search?q={q_safe}&filter=all", headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5, context=ctx) as r:
                datos = json.loads(r.read().decode('utf-8'))
                resultados = []
                for item in datos.get('items', []):
                    # Filtramos para asegurarnos de que solo sean canciones o mixes reales
                    if item.get('type') == 'stream':
                        video_id = item['url'].replace('/watch?v=', '')
                        resultados.append({
                            "id": video_id,
                            "title": item['title'],
                            "thumb": item['thumbnail']
                        })
                        if len(resultados) >= 15: break
                if resultados: return resultados
        except Exception:
            continue
            
    return []

@app.get("/api/audio/{id}")
def proxy_audio(id: str):
    # El tubo directo hacia la memoria RAM de tu iPhone (El Método Extremo)
    nodos_audio = [
        "https://pipedapi.kavin.rocks",
        "https://pipedapi.smnz.de",
        "https://pipedapi.tokhmi.xyz"
    ]
    random.shuffle(nodos_audio)
    for nodo in nodos_audio:
        try:
            req = urllib.request.Request(f"{nodo}/streams/{id}", headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=4, context=ctx) as r:
                datos = json.loads(r.read())
                for stream in datos.get('audioStreams', []):
                    # M4A puro, el formato rey para Safari
                    if stream.get('format') == 'M4A':
                        return RedirectResponse(stream['url'])
        except:
            continue
            
    # Plan B
    nodos_inv = ["https://inv.tux.pizza", "https://invidious.nerdvpn.de"]
    return RedirectResponse(f"{random.choice(nodos_inv)}/latest_version?id={id}&itag=140&local=true")

@app.get("/api/video/{id}")
def proxy_video(id: str):
    nodos_inv = ["https://inv.tux.pizza", "https://invidious.nerdvpn.de", "https://invidious.jing.rocks"]
    return RedirectResponse(f"{random.choice(nodos_inv)}/latest_version?id={id}&itag=18&local=true")
