import json
import urllib.request
import urllib.parse
import re
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Inicializamos el servidor
app = FastAPI(title="FamiMusic Backend")

# === EL PUENTE MÁGICO (CORS) ===
# Esto le dice al servidor que permita la entrada a tu app de iOS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"status": "Servidor Fami Music Activo", "cors": "Habilitado"}

@app.get("/search/{query}")
def search_youtube(query: str):
    """Buscador optimizado que extrae los datos directamente sin consumir cuota de API"""
    try:
        search_url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(query)}"
        req = urllib.request.Request(search_url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        html = urllib.request.urlopen(req).read().decode('utf-8')
        
        # Extraer la base de datos interna de la página
        match = re.search(r'var ytInitialData = (.*?);</script>', html)
        if not match:
            return []
            
        data = json.loads(match.group(1))
        results = []
        
        contents = data['contents']['twoColumnSearchResultsRenderer']['primaryContents']['sectionListRenderer']['contents'][0]['itemSectionRenderer']['contents']
        
        for item in contents:
            if 'videoRenderer' in item:
                video = item['videoRenderer']
                vid_id = video['videoId']
                title = video['title']['runs'][0]['text']
                
                # Evitamos transmisiones en vivo filtrando solo videos con duración
                if 'lengthText' in video:
                    thumb = f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg"
                    results.append({
                        "id": vid_id,
                        "title": title,
                        "thumb": thumb
                    })
            if len(results) >= 20: # Límite de 20 resultados por búsqueda
                break
                
        return results
    except Exception as e:
        print("Error en búsqueda:", e)
        return []

@app.get("/audio/{video_id}")
def get_audio(video_id: str):
    """Extractor de audio puro que salta el bloqueo del servidor en la nube"""
    try:
        # Usamos una API libre para obtener los enlaces limpios sin que YouTube bloquee la IP de Render
        piped_url = f"https://pipedapi.kavin.rocks/streams/{video_id}"
        req = urllib.request.Request(piped_url, headers={'User-Agent': 'Mozilla/5.0'})
        res = urllib.request.urlopen(req).read().decode('utf-8')
        data = json.loads(res)
        
        audio_streams = data.get('audioStreams', [])
        if not audio_streams:
            return JSONResponse(status_code=404, content={"error": "Audio no disponible"})
        
        # El iPhone requiere preferentemente formato M4A para la reproducción en segundo plano
        best_audio = None
        for stream in audio_streams:
            if stream.get('format') == 'M4A':
                best_audio = stream['url']
                break
        
        # Fallback de seguridad por si no hay M4A
        if not best_audio:
            best_audio = audio_streams[0]['url']
            
        return {"url": best_audio}
        
    except Exception as e:
        print("Error al extraer audio:", e)
        return JSONResponse(status_code=500, content={"error": "Fallo en la red de extracción"})
