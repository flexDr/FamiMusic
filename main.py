import json
import urllib.request
import urllib.parse
import ssl
import random
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="FamiMusic - Apple Music Style with DJ")

app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SSL context for proxies
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

@app.get("/")
def home(): 
    return FileResponse("templates/index.html")

@app.get("/search/{q}")
def search(q: str):
    q_safe = urllib.parse.quote(q)
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
    }

    # Updated Piped instances for 2026
    piped_nodes = [
        "https://pipedapi.kavin.rocks",
        "https://pipedapi.tokhmi.xyz",
        "https://pipedapi.moomoo.me",
        "https://pipedapi.syncpundit.io",
        "https://pipedapi.mint.lgbt"
    ]
    random.shuffle(piped_nodes)
    
    for nodo in piped_nodes:
        try:
            url = f"{nodo}/search?q={q_safe}&filter=music_videos"
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=8, context=ctx) as r:
                data = json.loads(r.read().decode('utf-8'))
                
                resultados = []
                for item in data.get('items', []):
                    if item.get('type') in ['stream', 'video', 'music']:
                        video_url = item.get('url', '')
                        video_id = video_url.split('v=')[-1].split('&')[0] if 'v=' in video_url else video_url.replace('/watch?v=', '')
                        resultados.append({
                            "id": video_id,
                            "title": item.get('title'),
                            "thumb": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
                            "duration": item.get('duration')
                        })
                        if len(resultados) >= 15:
                            break
                if resultados:
                    return JSONResponse(content=resultados)
        except Exception as e:
            print(f"Error with {nodo}: {e}")
            continue

    # Salvavidas
    salvavidas = [
        {"id": "G8v8D-80qGk", "title": "El Alfa - La Mama de la Mama", "thumb": "https://img.youtube.com/vi/G8v8D-80qGk/hqdefault.jpg"},
        {"id": "LvoRzYMuTZ0", "title": "Bryant Myers, Anuel AA - Bajen Pa Ca", "thumb": "https://img.youtube.com/vi/LvoRzYMuTZ0/hqdefault.jpg"},
        {"id": "fU9BNkGF_gM", "title": "Noriel - Diablita", "thumb": "https://img.youtube.com/vi/fU9BNkGF_gM/hqdefault.jpg"}
    ]
    return JSONResponse(content=salvavidas)

@app.get("/api/audio/{video_id}")
def get_audio(video_id: str):
    """Proxy de audio para reproducción con control total (ideal para crossfade y DJ IA)"""
    invidious_nodes = [
        "https://inv.nadeko.net",
        "https://invidious.nerdvpn.de",
        "https://invidious.tiekoetter.com",
        "https://yt.chocolatemoo53.com",
        "https://invidious.privacyredirect.com"
    ]
    nodo = random.choice(invidious_nodes)
    
    stream_url = f"{nodo}/latest_version?id={video_id}&itag=140&local=true"
    return RedirectResponse(stream_url, status_code=302)

@app.get("/api/video/{video_id}")
def get_video(video_id: str):
    """Proxy de video si necesitas fallback"""
    invidious_nodes = [
        "https://inv.nadeko.net",
        "https://invidious.nerdvpn.de"
    ]
    nodo = random.choice(invidious_nodes)
    stream_url = f"{nodo}/latest_version?id={video_id}&itag=18&local=true"
    return RedirectResponse(stream_url, status_code=302)

print("FamiMusic backend cargado - Listo para DJ IA y Crossfade")