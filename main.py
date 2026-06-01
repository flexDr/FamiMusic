import random
import httpx
import urllib.parse
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse

app = FastAPI(title="FamiMusic V9 - Deezer Premium Pass")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# TÚNELES PARA EXTRACCIÓN INVISIBLE DE AUDIO
NODOS_POOL = [
    "https://pipedapi.kavin.rocks",
    "https://pipedapi.syncpundit.io",
    "https://pipedapi.smnz.de",
    "https://pipedapi.tokhmi.xyz",
    "https://piapi.pussthecat.org",
    "https://piped-api.garudalinux.org"
]

@app.get("/")
def cargar_interfaz():
    return FileResponse("templates/index.html")

@app.get("/status")
def check_status():
    return {"status": "ONLINE", "motor": "Deezer + Piped Core v9"}

# 1. BÚSQUEDA ULTRA RÁPIDA CON DEEZER
@app.get("/search/{query}")
async def buscar_musica(query: str):
    async with httpx.AsyncClient(timeout=6.0) as client:
        try:
            query_limpio = urllib.parse.quote(query)
            res = await client.get(f"https://api.deezer.com/search?q={query_limpio}&limit=15")
            if res.status_code == 200:
                data = res.json()
                resultados = []
                for item in data.get("data", []):
                    resultados.append({
                        "id": str(item["id"]),
                        "title": item["title"],
                        "thumb": item["album"]["cover_xl"],
                        "uploader": item["artist"]["name"]
                    })
                return resultados
        except Exception as e:
            raise HTTPException(status_code=503, detail="Error de catálogo")

# 2. EL TÚNEL SECRETO DE AUDIO (Bypass total a los bloqueos de Render)
@app.get("/stream/{deezer_id}")
async def tunel_de_transmision(deezer_id: str):
    # Paso A: Obtener el nombre exacto de la canción desde Deezer
    async with httpx.AsyncClient() as client:
        res = await client.get(f"https://api.deezer.com/track/{deezer_id}")
        if res.status_code != 200:
            raise HTTPException(status_code=404, detail="Track no encontrado")
        track_data = res.json()
        busqueda_exacta = f"{track_data.get('title', '')} {track_data.get('artist', {}).get('name', '')}"

    # Paso B: Buscar el video de forma camuflada usando la red de túneles
    nodos_prueba = list(NODOS_POOL)
    random.shuffle(nodos_prueba)
    
    video_id = None
    audio_url = None
    query_encoded = urllib.parse.quote(busqueda_exacta)

    async with httpx.AsyncClient(timeout=7.0) as client:
        # Buscamos el ID del video a través de la red espejo
        for nodo in nodos_prueba:
            try:
                search_res = await client.get(f"{nodo}/search?q={query_encoded}&filter=videos")
                if search_res.status_code == 200:
                    items = search_res.json().get("items", [])
                    if items:
                        video_id = items[0].get("url", "").replace("/watch?v=", "")
                        if video_id:
                            # Si encontramos el ID, usamos este mismo nodo para sacar el link de audio
                            stream_res = await client.get(f"{nodo}/streams/{video_id}")
                            if stream_res.status_code == 200:
                                streams = stream_res.json().get("audioStreams", [])
                                m4a = next((s for s in streams if s.get("format") == "M4A"), None)
                                if not m4a and streams: m4a = streams[0]
                                if m4a:
                                    audio_url = m4a.get("url")
                                    break
            except Exception:
                continue

    if not audio_url:
        raise HTTPException(status_code=500, detail="La red global está recalculando rutas, intenta de nuevo.")

    # Paso C: Retransmisión de bytes limpia al iPhone
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
