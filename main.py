import httpx
import asyncio
import yt_dlp
import urllib.parse
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse

app = FastAPI(title="FamiMusic V8 - Deezer Hybrid Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def cargar_interfaz():
    return FileResponse("templates/index.html")

@app.get("/status")
def check_status():
    return {"status": "ONLINE", "motor_busqueda": "Deezer API", "motor_audio": "yt-dlp"}

# === EL CEREBRO: BÚSQUEDA INSTANTÁNEA CON DEEZER ===
@app.get("/search/{query}")
async def buscar_musica(query: str):
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            # Usamos la API oficial y abierta de Deezer (Cero bloqueos, velocidad extrema)
            query_limpio = urllib.parse.quote(query)
            res = await client.get(f"https://api.deezer.com/search?q={query_limpio}&limit=15")
            
            if res.status_code == 200:
                data = res.json()
                resultados = []
                
                for item in data.get("data", []):
                    resultados.append({
                        "id": str(item["id"]), # Guardamos el ID oficial de Deezer
                        "title": item["title"],
                        "thumb": item["album"]["cover_xl"], # Portada en altísima calidad
                        "uploader": item["artist"]["name"]
                    })
                
                if len(resultados) > 0:
                    return resultados
                raise HTTPException(status_code=404, detail="No se encontró música")
        except Exception as e:
            print(f"Error en Deezer API: {e}")
            raise HTTPException(status_code=503, detail="Error de conexión con el catálogo")

# === EL MÚSCULO: EXTRACCIÓN DE AUDIO INVISIBLE ===
@app.get("/stream/{deezer_id}")
async def tunel_de_transmision(deezer_id: str):
    
    # 1. Le preguntamos a Deezer cómo se llama la canción exactamente
    async with httpx.AsyncClient() as client:
        res = await client.get(f"https://api.deezer.com/track/{deezer_id}")
        if res.status_code != 200:
            raise HTTPException(status_code=404, detail="Track no encontrado en el catálogo")
        
        track_data = res.json()
        titulo = track_data.get("title", "")
        artista = track_data.get("artist", {}).get("name", "")
        busqueda_exacta = f"{titulo} {artista} audio"

    # 2. Cazamos el audio con yt-dlp usando la información perfecta de Deezer
    def extraer_audio_oculto():
        opciones = {
            'format': 'm4a/bestaudio/best',
            'quiet': True,
            'extract_flat': False,
            'nocheckcertificate': True
        }
        with yt_dlp.YoutubeDL(opciones) as ydl:
            # ytsearch1 busca el primer resultado que coincida y extrae el link de una vez
            info = ydl.extract_info(f"ytsearch1:{busqueda_exacta}", download=False)
            if 'entries' in info and len(info['entries']) > 0:
                return info['entries'][0]['url']
            return None

    try:
        audio_url = await asyncio.to_thread(extraer_audio_oculto)
        if not audio_url:
            raise Exception("No se pudo generar el túnel de audio")
    except Exception as e:
        print(f"Fallo en la extracción del músculo: {e}")
        raise HTTPException(status_code=500, detail="Fallo al desencriptar el audio final")

    # 3. Retransmisión en vivo al iPhone
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
