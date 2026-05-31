import random
import httpx
import urllib.parse
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse

app = FastAPI(title="FamiMusic V5 - Alta Velocidad")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === TÚNELES ESPEJO PREMIUM (Ya actúan como camuflaje ante YouTube) ===
NODOS_POOL = [
    {"url": "https://pipedapi.kavin.rocks"},
    {"url": "https://pipedapi.syncpundit.io"},
    {"url": "https://pipedapi.smnz.de"},
    {"url": "https://pipedapi.tokhmi.xyz"},
    {"url": "https://piapi.pussthecat.org"}
]

# RUTA PRINCIPAL (Interfaz Gráfica)
@app.get("/")
def cargar_interfaz():
    return FileResponse("templates/index.html")

# RUTA DE ESTADO
@app.get("/status")
def check_status():
    return {"status": "ONLINE", "tunes_activos": len(NODOS_POOL), "velocidad": "Maxima"}

# BÚSQUEDA DIRECTA Y VELOZ
@app.get("/search/{query}")
async def buscar_musica(query: str):
    nodos_prueba = list(NODOS_POOL)
    random.shuffle(nodos_prueba) 
    
    # Timeout corto para que si un nodo está lento, salte al siguiente rápido
    async with httpx.AsyncClient(timeout=4.0) as client:
        for nodo in nodos_prueba:
            try:
                query_codificado = urllib.parse.quote(query)
                url = f"{nodo['url']}/search?q={query_codificado}&filter=videos"
                res = await client.get(url)
                
                if res.status_code == 200:
                    data = res.json()
                    resultados = []
                    
                    for item in data.get("items", []):
                        video_url = item.get("url", "")
                        video_id = video_url.replace("/watch?v=", "")
                        
                        if video_id and item.get("type") == "stream":
                            resultados.append({
                                "id": video_id,
                                "title": item.get("title", "Desconocido"),
                                "thumb": item.get("thumbnail", ""),
                                "uploader": item.get("uploaderName", "Fami Music")
                            })
                    
                    if len(resultados) > 0:
                        return resultados
            except Exception:
                continue 
                
    raise HTTPException(status_code=503, detail="Túneles ocupados, intenta de nuevo.")

# TRANSMISOR DE AUDIO ININTERRUMPIDO
@app.get("/stream/{video_id}")
async def tunel_de_transmision(video_id: str):
    nodos_prueba = list(NODOS_POOL)
    random.shuffle(nodos_prueba)
    audio_url = None
    
    async with httpx.AsyncClient(timeout=6.0) as client:
        for nodo in nodos_prueba:
            try:
                endpoint = f"{nodo['url']}/streams/{video_id}"
                res = await client.get(endpoint)
                
                if res.status_code == 200:
                    data = res.json()
                    if "audioStreams" in data:
                        streams = data["audioStreams"]
                        # Buscamos el formato de Apple
                        m4a = next((s for s in streams if s.get("format") == "M4A"), None)
                        if not m4a and len(streams) > 0:
                            m4a = streams[0]
                        if m4a:
                            audio_url = m4a.get("url")
                            break
            except Exception:
                continue

    if not audio_url:
        raise HTTPException(status_code=500, detail="Fallo al extraer el audio")

    # Envío del flujo directo al iPhone
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
