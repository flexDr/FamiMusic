import json
import urllib.request
import urllib.parse
import re
import random
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
    return {"status": "Servidor Fami Music Activo", "motor": "espejos-directos"}

@app.get("/search/{query}")
def search_youtube(query: str):
    """Buscador directo (Este funciona perfecto y no lo bloquean)"""
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
    """Bypass total: Enlaces directos M4A desde nodos espejo"""
    # Lista de servidores espejo descentralizados
    espejos = [
        f"https://inv.tux.pizza/latest_version?id={video_id}&itag=140",
        f"https://invidious.jing.rocks/latest_version?id={video_id}&itag=140",
        f"https://invidious.nerdvpn.de/latest_version?id={video_id}&itag=140"
    ]
    
    # Elegimos uno al azar para no saturarlos
    url_directa = random.choice(espejos)
    
    return {"url": url_directa}
