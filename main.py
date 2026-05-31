import json
import urllib.request
import urllib.parse
import re
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="FamiMusic Backend")

# Habilita la entrada para tu app de iPhone
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"status": "Servidor Fami Music Activo", "motor": "multi-nodos"}

@app.get("/search/{query}")
def search_youtube(query: str):
    """Buscador directo para evitar cuotas de API"""
    try:
        search_url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(query)}"
        req = urllib.request.Request(search_url, headers={'User-Agent': 'Mozilla/5.0'})
        html = urllib.request.urlopen(req).read().decode('utf-8')
        
        match = re.search(r'var ytInitialData = (.*?);</script>', html)
        if not match:
            return []
            
        data = json.loads(match.group(1))
        results = []
        
        contents = data['contents']['twoColumnSearchResultsRenderer']['primaryContents']['sectionListRenderer']['contents'][0]['itemSectionRenderer']['contents']
        
        for item in contents:
            if 'videoRenderer' in item:
                video = item['videoRenderer']
                if 'lengthText' in video:
                    results.append({
                        "id": video['videoId'],
                        "title": video['title']['runs'][0]['text'],
                        "thumb": f"https://i.ytimg.com/vi/{video['videoId']}/hqdefault.jpg"
                    })
            if len(results) >= 20: 
                break
                
        return results
    except Exception as e:
        print("Error en búsqueda:", e)
        return []

@app.get("/audio/{video_id}")
def get_audio(video_id: str):
    """Sistema de alta disponibilidad: Busca entre múltiples servidores hasta obtener el link"""
    servidores_piped = [
        "https://pipedapi.kavin.rocks",
        "https://pipedapi.syncpundit.io",
        "https://piped-api.garudalinux.org",
        "https://piapi.pussthecat.org",
        "https://pipedapi.smnz.de"
    ]
    
    for servidor in servidores_piped:
        try:
            url = f"{servidor}/streams/{video_id}"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            # Le damos 4 segundos máximo a cada servidor para responder
            res = urllib.request.urlopen(req, timeout=4).read().decode('utf-8')
            data = json.loads(res)
            
            audio_streams = data.get('audioStreams', [])
            if audio_streams:
                best_audio = None
                for stream in audio_streams:
                    # Buscamos específicamente M4A (el formato nativo perfecto para iPhone)
                    if stream.get('format') == 'M4A':
                        best_audio = stream['url']
                        break
                
                # Si no hay M4A, agarramos el primer audio disponible
                if not best_audio:
                    best_audio = audio_streams[0]['url']
                    
                return {"url": best_audio}
        except Exception as e:
            # Si un servidor falla, el ciclo ignora el error y prueba con el siguiente de la lista
            continue
            
    # Si los 5 servidores fallan, devuelve un error controlado
    return JSONResponse(status_code=500, content={"error": "Todos los servidores espejo fallaron"})
