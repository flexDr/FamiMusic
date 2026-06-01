import httpx
import asyncio
import yt_dlp
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse

app = FastAPI(title="FamiMusic V7 - 100% Independiente")

# Permitir conexiones seguras desde tu PWA
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
    return {"status": "ONLINE", "motor": "yt-dlp Autonomo"}

# BÚSQUEDA NATIVA (Sin usar Piped, directamente con yt-dlp)
@app.get("/search/{query}")
async def buscar_musica(query: str):
    def buscar_en_yt():
        opciones = {
            'format': 'bestaudio/best',
            'quiet': True,
            'extract_flat': True, # Fundamental para que la búsqueda sea instantánea
            'nocheckcertificate': True
        }
        with yt_dlp.YoutubeDL(opciones) as ydl:
            # ytsearch15 extrae los primeros 15 resultados rápido
            return ydl.extract_info(f"ytsearch15:{query}", download=False)

    try:
        # Ejecutamos en un hilo separado para no bloquear el servidor
        info = await asyncio.to_thread(buscar_en_yt)
        resultados_crudos = info.get('entries', [])
        
        resultados = []
        for item in resultados_crudos:
            if item.get("id"):
                # Forzamos la creación de la miniatura oficial
                thumb_url = f"https://i.ytimg.com/vi/{item.get('id')}/hqdefault.jpg"
                resultados.append({
                    "id": item.get("id"),
                    "title": item.get("title", "Desconocido"),
                    "thumb": thumb_url,
                    "uploader": item.get("uploader", item.get("channel", "Fami Music"))
                })
                
        if len(resultados) > 0:
            return resultados
        raise HTTPException(status_code=404, detail="No se encontraron temas")
    except Exception as e:
        print(f"Error de búsqueda: {e}")
        raise HTTPException(status_code=503, detail="Motor de búsqueda en reinicio")

# TRANSMISIÓN NATIVA
@app.get("/stream/{video_id}")
async def tunel_de_transmision(video_id: str):
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
        audio_url = await asyncio.to_thread(extraer_url_directa)
    except Exception as e:
        print(f"Fallo en desencriptación: {e}")
        raise HTTPException(status_code=500, detail="Fallo al desencriptar el audio")

    # Retransmisión en vivo al iPhone
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
