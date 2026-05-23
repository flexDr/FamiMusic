import json
import urllib.request
import ssl
import yt_dlp
from fastapi import FastAPI, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
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
def stream_info(id: str):
    # Engañamos al app.js para que pase por nuestro nuevo túnel en vivo
    return {"url": f"/proxy/{id}", "duracion": 0}

# === EL TÚNEL MATEMÁTICO PARA EL iPHONE ===
@app.get("/proxy/{id}")
def proxy(req: Request, id: str):
    url_real = None
    
    # 1. Buscamos el enlace fuente en 0.5 segundos usando redes privadas
    instances = ["https://pipedapi.kavin.rocks", "https://pipedapi.smnz.de", "https://pipedapi.adminforge.de"]
    for inst in instances:
        try:
            req_api = urllib.request.Request(f"{inst}/streams/{id}", headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req_api, timeout=2, context=ctx) as r:
                datos = json.loads(r.read())
                for f in datos.get('audioStreams', []):
                    if f.get('format') == 'M4A':
                        url_real = f['url']
                        break
            if url_real: break
        except: continue

    # Plan de respaldo por si fallan las redes privadas
    if not url_real:
        ydl_opts = {'format': 'bestaudio[ext=m4a]/bestaudio/best', 'quiet': True, 'nocheckcertificate': True}
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f"https://www.youtube.com/watch?v={id}", download=False)
                url_real = info.get('url')
        except:
            return Response(status_code=400)

    if not url_real:
        return Response(status_code=400)

    # 2. INTERCEPTAMOS LA PETICIÓN DEL iPHONE
    headers_enviados = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    rango = req.headers.get('range') # Aquí atrapamos la regla de Apple
    if rango:
        headers_enviados['Range'] = rango

    try:
        req_final = urllib.request.Request(url_real, headers=headers_enviados)
        resp_final = urllib.request.urlopen(req_final, context=ctx)
    except Exception:
        return Response(status_code=400)

    # 3. Transmitimos la música en vivo, sin descargarla (0 esperas)
    def iterfile():
        while True:
            chunk = resp_final.read(65536) # Paquetes de 64 KB
            if not chunk: break
            yield chunk

    # 4. Le devolvemos a Safari los códigos exactos que exige para dejarte escuchar
    headers_respuesta = {
        "Accept-Ranges": "bytes",
        "Content-Type": "audio/mp4"
    }
    if "Content-Length" in resp_final.headers:
        headers_respuesta["Content-Length"] = resp_final.headers["Content-Length"]
    if "Content-Range" in resp_final.headers:
        headers_respuesta["Content-Range"] = resp_final.headers["Content-Range"]

    estado = 206 if rango else 200

    return StreamingResponse(iterfile(), status_code=estado, headers=headers_respuesta)
