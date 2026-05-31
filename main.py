import json
import random
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse

app = FastAPI(title="FamiMusic Master Server v3")

# Permitir conexiones seguras
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REPOSITORIO GLOBAL DE TÚNELES (Rotación automática)
NODOS_POOL = [
    {"tipo": "piped", "url": "https://pipedapi.kavin.rocks"},
    {"tipo": "piped", "url": "https://pipedapi.syncpundit.io"},
    {"tipo": "piped", "url": "https://pipedapi.smnz.de"},
    {"tipo": "piped", "url": "https://pipedapi.tokhmi.xyz"},
    {"tipo": "piped", "url": "https://piapi.pussthecat.org"},
    {"tipo": "piped", "url": "https://piped-api.garudalinux.org"},
    {"tipo": "invidious", "url": "https://invidious.jing.rocks"},
    {"tipo": "invidious", "url": "https://inv.tux.pizza"},
    {"tipo": "invidious", "url": "https://invidious.nerdvpn.de"},
    {"tipo": "invidious", "url": "https://invidious.flokinet.to"}
]

# RUTA PRINCIPAL: Muestra tu página web
@app.get("/")
def cargar_interfaz():
    # Render irá a buscar el archivo HTML en tu carpeta "templates"
    return FileResponse("templates/index.html")

# RUTA DE ESTADO: Para verificar si los túneles están vivos
@app.get("/status")
def check_status():
    nodos_vivos = len(NODOS_POOL)
    return {"status": "ONLINE", "tunes_activos": nodos_vivos, "seguridad": "Bypass-Nativo-Activo"}

# RUTA DE BÚSQUEDA
@app.get("/search/{query}")
async def buscar_musica(query: str):
    """Buscador balanceado con rotación de túneles"""
    nodos_prueba = list(NODOS_POOL)
    random.shuffle(nodos_prueba) 
    
    async with httpx.AsyncClient(timeout=6.0) as client:
        for nodo in nodos_prueba:
            try:
                if nodo["tipo"] == "piped":
                    url = f"{nodo['url']}/search?q={httpx.internal_utils.urlencode(query)}&filter=videos"
                    res = await client.get(url)
                    if res.status_code == 200:
                        data = res.json()
                        resultados = []
                        for item in data.get("videos", []):
                            resultados.append({
                                "id": item["id"],
                                "title": item["title"],
                                "thumb": item["thumbnail"],
                                "uploader": item.get("uploaderName", "Fami Music")
                            })
                        return resultados
            except Exception:
                continue 
                
    raise HTTPException(status_code=503, detail="Red de búsqueda saturada temporalmente")

# RUTA DE STREAMING (El bypass de audio)
@app.get("/stream/{video_id}")
async def tunel_de_transmision(video_id: str):
    """Extrae el audio y lo transmite al iPhone sin bloqueos"""
    nodos_prueba = list(NODOS_POOL)
    random.shuffle(nodos_prueba)
    
    audio_url = None
    
    async with httpx.AsyncClient(timeout=5.0) as client:
        for nodo in nodos_prueba:
            try:
                endpoint = f"{nodo['url']}/streams/{video_id}" if nodo["tipo"] == "piped" else f"{nodo['url']}/api/v1/videos/{video_id}"
                res = await client.get(endpoint)
                if res.status_code != 200:
                    continue
                
                data = res.json()
                if nodo["tipo"] == "piped" and "audioStreams" in data:
                    streams = data["audioStreams"]
                    m4a = next((s for s in streams if s.get("format") == "M4A"), streams[0])
                    audio_url = m4a["url"]
                elif nodo["tipo"] == "invidious" and "formatStreams" in data:
                    streams = data["formatStreams"]
                    m4a = next((s for s in streams if s.get("itag") in ["140", 140]), None)
                    if m4a: audio_url = m4a["url"]
                    
                if audio_url:
                    break
            except Exception:
                continue

    if not audio_url:
        raise HTTPException(status_code=500, detail="Ningún túnel pudo descifrar el flujo")

    async def generador_de_bytes():
        async with httpx.AsyncClient() as client:
            headers = {"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15"}
            async with client.stream("GET", audio_url, headers=headers, timeout=None) as response:
                async for chunk in response.iter_bytes(chunk_size=4096 * 4):
                    yield chunk

    return StreamingResponse(
        generador_de_bytes(), 
        media_type="audio/mp4",
        headers={
            "Accept-Ranges": "bytes",
            "Access-Control-Allow-Origin": "*",
            "Content-Disposition": "inline"
        }
    )
