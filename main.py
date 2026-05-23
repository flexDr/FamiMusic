import os
import json
import urllib.request
import ssl
import yt_dlp
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from urllib.parse import unquote, quote

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

# === EL PUENTE INVISIBLE (PROXY DE AUDIO) ===
@app.get("/proxy_stream")
def proxy_stream(url: str):
    try:
        # El servidor engaña a YouTube pidiendo los datos él mismo
        req = urllib.request.Request(
            unquote(url), 
            headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}
        )
        response = urllib.request.urlopen(req, context=ctx)
        
        # Le pasamos la música al celular en pedacitos (Streaming) para no gastar la memoria de Render
        def iterfile():
            with response:
                while True:
                    chunk = response.read(32768) # 32 KB por paquete
                    if not chunk:
                        break
                    yield chunk
                    
        return StreamingResponse(iterfile(), media_type="audio/mp4")
    except Exception as e:
        return {"error": str(e)}
# ============================================

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

@app.get("/stream/{id}")
def stream(id: str, title: str = "", mode: str = "audio"):
    formato = 'best[height<=720]/best' if mode == "video" else 'bestaudio[ext=m4a]/bestaudio/best'
    ydl_opts = {
        'format': formato, 
        'quiet': True, 
        'nocheckcertificate': True, 
        'noplaylist': True,
        'extractor_args': {'youtube': ['player_client=ios,android']}
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={id}", download=False)
            url = info.get('url')
            if not url and 'formats' in info:
                for f in reversed(info['formats']):
                    if f.get('url'): url = f['url']; break
            if url: 
                # Mandamos la URL original a través de nuestro túnel
                return {"url": f"/proxy_stream?url={quote(url)}", "duracion": info.get('duration')}
            raise Exception("Bloqueo de IP")
            
    except Exception as e:
        error_msg = str(e).lower()
        
        # Detector de contenido explícito (Dembow/Trap)
        if "age" in error_msg or "inappropriate" in error_msg or "sign in" in error_msg or "bot" in error_msg:
            url_inv, segundos = get_invidious_stream(id)
            if url_inv:
                return {"url": f"/proxy_stream?url={quote(url_inv)}", "duracion": segundos}
            return {"url": None}

        # Rescate con letras
        if title:
            try:
                titulo_limpio = unquote(title)
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info_fb = ydl.extract_info(f"ytsearch1:{titulo_limpio} audio lyric", download=False)
                    if 'entries' in info_fb and len(info_fb['entries']) > 0:
                        entry = info_fb['entries'][0]
                        if entry and entry.get('url'):
                            return {"url": f"/proxy_stream?url={quote(entry['url'])}", "duracion": entry.get('duration')}
            except Exception:
                pass

        # Rescate europeo total
        url_inv, segundos = get_invidious_stream(id)
        if url_inv:
            return {"url": f"/proxy_stream?url={quote(url_inv)}", "duracion": segundos}
        
        return {"url": None}    with yt_dlp.YoutubeDL(opts) as ydl:
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
            with urllib.request.urlopen(req, timeout=3, context=ctx) as response:
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


@app.get("/stream/{id}")
def stream(id: str, title: str = "", mode: str = "audio"):
    formato = 'best[height<=720]/best' if mode == "video" else 'bestaudio/best'
    ydl_opts = {
        'format': formato,
        'quiet': True,
        'nocheckcertificate': True,
        'noplaylist': True
    }

    try:
        # PLAN A: Intento Normal
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={id}", download=False)
            url = info.get('url')
            if not url and 'formats' in info:
                for f in reversed(info['formats']):
                    if f.get('url'): url = f['url']; break
            if url: return {"url": url, "duracion": info.get('duration')}
            raise Exception("URL fallida")

    except Exception as e:
        error_msg = str(e).lower()

        # --- DETECTOR DE RESTRICCIÓN DE EDAD (TRAP / DEMBOW EXPLICITO) ---
        if "age" in error_msg or "inappropriate" in error_msg or "sign in" in error_msg:
            print(f"🔞 Restricción de edad para: {title}. Saltando directo a Europa...")
            url_inv, segundos = get_invidious_stream(id)
            if url_inv:
                return {"url": url_inv, "duracion": segundos}
            return {"url": None}
        # -----------------------------------------------------------------

        print(f"⚠️ Error regular. Buscando Lyric para: {title}")
        if title:
            try:
                titulo_limpio = unquote(title)
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info_fb = ydl.extract_info(f"ytsearch1:{titulo_limpio} audio lyric", download=False)
                    if 'entries' in info_fb and len(info_fb['entries']) > 0:
                        entry = info_fb['entries'][0]
                        if entry and entry.get('url'):
                            return {"url": entry['url'], "duracion": entry.get('duration')}
            except Exception:
                pass

        print("⚠️ Plan Lyric falló. Conectando a Europa...")
        url_inv, segundos = get_invidious_stream(id)
        if url_inv:
            return {"url": url_inv, "duracion": segundos}

        return {"url": None}
