import json
import urllib.request
import urllib.parse
import ssl
import random
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="FamiMusic")

app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

@app.get("/")
def home():
    return FileResponse("templates/index.html")

# Mejores instancias Piped actuales (Mayo 2026)
PIPED_NODES = [
    "https://pipedapi.kavin.rocks",
    "https://pipedapi.tokhmi.xyz",
    "https://api-piped.mha.fi",
    "https://piped-api.garudalinux.org",
    "https://pipedapi.moomoo.me",
    "https://pipedapi.syncpundit.io",
    "https://pipedapi.leptons.xyz"
]

@app.get("/search/{q}")
def search(q: str):
    q_safe = urllib.parse.quote(q)
    headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}

    print(f"🔍 Buscando: {q}")

    for nodo in PIPED_NODES * 2:  # Doble intento
        try:
            url = f"{nodo}/search?q={q_safe}&filter=music_videos"
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=10, context=ctx) as r:
                data = json.loads(r.read().decode('utf-8'))
                
                resultados = []
                for item in data.get('items', []):
                    if item.get('type') in ['stream', 'video']:
                        url_part = item.get('url', item.get('videoId', ''))
                        video_id = url_part.split('v=')[-1].split('&')[0] if 'v=' in url_part else url_part
                        if len(video_id) == 11:
                            resultados.append({
                                "id": video_id,
                                "title": item.get('title', 'Sin título'),
                                "thumb": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
                            })
                            if len(resultados) >= 12:
                                break
                
                if len(resultados) >= 3:
                    print(f"✅ Éxito con {nodo} → {len(resultados)} resultados")
                    return JSONResponse(content=resultados)
        except Exception as e:
            print(f"Error with {nodo}: {type(e).__name__}")
            continue

    # Fallback final
    print("⚠️ Todos los nodos fallaron - usando fallback")
    fallback = [
        {"id": "G8v8D-80qGk", "title": "El Alfa - La Mama de la Mama", "thumb": "https://img.youtube.com/vi/G8v8D-80qGk/hqdefault.jpg"},
        {"id": "LvoRzYMuTZ0", "title": "Bryant Myers, Anuel AA - Bajen Pa Ca", "thumb": "https://img.youtube.com/vi/LvoRzYMuTZ0/hqdefault.jpg"},
        {"id": "fU9BNkGF_gM", "title": "Noriel - Diablita ft. Anuel AA", "thumb": "https://img.youtube.com/vi/fU9BNkGF_gM/hqdefault.jpg"},
        {"id": "kxV1xPj-WwQ", "title": "El Alfa - Los Aparatos", "thumb": "https://img.youtube.com/vi/kxV1xPj-WwQ/hqdefault.jpg"}
    ]
    return JSONResponse(content=fallback)

@app.get("/api/audio/{video_id}")
def get_audio(video_id: str):
    INV_NODES = [
        "https://inv.nadeko.net",
        "https://invidious.nerdvpn.de",
        "https://invidious.tiekoetter.com",
        "https://yt.chocolatemoo53.com",
        "https://inv.thepixora.com"
    ]
    nodo = random.choice(INV_NODES)
    url = f"{nodo}/latest_version?id={video_id}&itag=140&local=true"
    return RedirectResponse(url)
