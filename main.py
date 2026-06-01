import random
import httpx
import urllib.parse
import asyncio
import yt_dlp
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse

app = FastAPI(title="FamiMusic V6 - Motor Nativo")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Nodos solo para búsqueda (son rápidos para encontrar texto, no para extraer audio pesado)
NODOS_POOL = [
    {"url": "https://pipedapi.kavin.rocks"},
    {"url": "https://pipedapi.syncpundit.io"},
    {"url": "https://pipedapi.smnz.de"},
    {"url": "https://pipedapi.tokhmi.xyz"},
    {"url": "https://piapi.pussthecat.org"}
]

@app.get("/")
def cargar_interfaz():
    return FileResponse("templates/index.html")

@app.get("/status")
def check_status():
    return {"status": "ONLINE", "motor_extraccion": "yt-dlp Activo"}

@app.get("/search/{query}")
async def buscar_musica(query: str):
    nodos_prueba = list(NODOS_POOL)
    random.shuffle(nodos_prueba) 
    
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

@app.get("/stream/{video_id}")
async def tunel_de_transmision(video_id: str):
    # === MAGIA: Render extrae el audio directamente sin usar intermediarios ===
    def extraer_url_directa():
        opciones = {
            'format': 'm4a/bestaudio/best',
            'quiet': True,
            'nocheckcertificate': True
        }
        with yt_dlp.YoutubeDL(opciones) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            return info['url']

    try:
        # Ejecutamos la extracción en un proceso seguro
        audio_url = await asyncio.to_thread(extraer_url_directa)
    except Exception as e:
        print(f"Error en yt-dlp: {e}")
        raise HTTPException(status_code=500, detail="Fallo al desencriptar el audio")

    # Infiltración y envío al iPhone
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
