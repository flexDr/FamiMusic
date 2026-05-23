import os
import json
import urllib.request
import ssl
import yt_dlp
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from urllib.parse import unquote, quote

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Creamos una bóveda secreta en el servidor para guardar las canciones
if not os.path.exists("temp_audio"):
    os.makedirs("temp_audio")

@app.get("/")
def home(): 
    return FileResponse("templates/index.html")

@app.get("/search/{q}")
def search(q: str):
    busqueda_limpia = f"{q} official audio"
    with yt_dlp.YoutubeDL({'extract_flat': True, 'quiet': True}) as ydl:
        info = ydl.extract_info(f"ytsearch15:{busqueda_limpia}", download=False)
        resultados = []
        if 'entries' in info:
            for e in info['entries']:
                if e.get('id') and e.get('title'):
                    resultados.append({
                        "id": e['id'], 
                        "title": e['title'], 
                        "thumb": f"https://wsrv.nl/?url=https://img.youtube.com/vi/{e['id']}/mqdefault.jpg"
                    })
        return resultados

def get_invidious_stream(video_id):
    instances = [
        "https://inv.tux.pizza",
        "https://invidious.nerdvpn.de",
        "https://inv.nadeko.net",
        "https://invidious.jing.rocks"
    ]
    for inst in instances:
        try:
            req = urllib.request.Request(f"{inst}/api/v1/videos/{video_id}", headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=4, context=ctx) as response:
                data = json.loads(response.read().decode())
                if 'adaptiveFormats' in data:
                    for f in data['adaptiveFormats']:
                        if 'audio/mp4' in f.get('type', '') or 'm4a' in f.get('type', ''):
                            url = f['url']
                            if url.startswith('/'): url = inst + url
                            if 'local=true' not in url: url += '&local=true' if '?' in url else '?local=true'
                            return url, data.get('lengthSeconds', 0)
        except Exception:
            continue
    return None, 0

# === EL NUEVO MOTOR DE DESCARGA ULTRARRÁPIDA ===
@app.get("/proxy_stream")
def proxy_stream(id: str):
    filepath = f"temp_audio/{id}.m4a"
    
    # 1. Si la canción ya está en la bóveda, el iPhone la toca al instante
    if os.path.exists(filepath):
        return FileResponse(filepath, media_type="audio/mp4")
        
    # 2. Si no, Render la descarga a máxima velocidad evadiendo restricciones
    ydl_opts = {
        'format': 'bestaudio[ext=m4a]/bestaudio/best',
        'outtmpl': filepath,
        'quiet': True,
        'nocheckcertificate': True,
        'extractor_args': {'youtube': ['player_client=ios,android']}
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([f"https://www.youtube.com/watch?v={id}"])
        
        # FileResponse es la magia: Le dice al iPhone exactamente lo que quiere escuchar
        return FileResponse(filepath, media_type="audio/mp4")
        
    except Exception:
        # 3. Plan de emergencia: Si YouTube se pone imposible, mandamos al iPhone a Europa
        url_inv, _ = get_invidious_stream(id)
        if url_inv:
            return RedirectResponse(url_inv)
        return {"error": "Bloqueo total"}

@app.get("/stream/{id}")
def stream(id: str, title: str = "", mode: str = "audio"):
    # Engañamos a tu app.js para que busque la canción localmente en el servidor
    return {"url": f"/proxy_stream?id={id}", "duracion": 0}
