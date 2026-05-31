import json
import urllib.request
import urllib.parse
import re
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="FamiMusic Backend")

# Le abre las puertas a tu iPhone sin bloqueos de seguridad
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"status": "Servidor Activo", "motor": "cobalt-blindado"}

@app.get("/search/{query}")
def search_youtube(query: str):
    """Buscador directo (Este no lo bloquean porque solo lee texto)"""
    try:
        search_url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(query)}"
        req = urllib.request.Request(search_url, headers={'User-Agent': 'Mozilla/5.0'})
        html = urllib.request.urlopen(req).read().decode('utf-8')
        
        match = re.search(r'var ytInitialData = (.*?);</script>', html)
        if not match: return []
            
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
            if len(results) >= 20: break
        return results
    except Exception:
        return []

@app.get("/audio/{video_id}")
def get_audio(video_id: str):
    """Arquitectura de 3 niveles para que el audio jamás se cuelgue"""
    
    # 1. Motor Principal: Cobalt (El más rápido y antibloqueos)
    try:
        url = "https://co.wuk.sh/api/json"
        datos = json.dumps({
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "isAudioOnly": True,
            "aFormat": "mp3"
        }).encode('utf-8')
        req = urllib.request.Request(url, data=datos, headers={"Content-Type": "application/json", "Accept": "application/json"})
        res = urllib.request.urlopen(req, timeout=5).read().decode('utf-8')
        return {"url": json.loads(res)["url"]}
    except Exception as e:
        print("Fallo Cobalt:", e)
        
    # 2. Respaldo Nivel 1: Invidious Directo
    try:
        req = urllib.request.Request(f"https://invidious.jing.rocks/api/v1/videos/{video_id}")
        res = urllib.request.urlopen(req, timeout=4).read().decode('utf-8')
        for f in json.loads(res).get("formatStreams", []):
            if f.get("itag") == "140":
                return {"url": f["url"]}
    except Exception as e:
        print("Fallo Invidious:", e)
        
    # 3. Respaldo Nivel 2: Red Piped
    try:
        req = urllib.request.Request(f"https://pipedapi.kavin.rocks/streams/{video_id}")
        res = urllib.request.urlopen(req, timeout=4).read().decode('utf-8')
        for s in json.loads(res).get("audioStreams", []):
            if s.get("format") == "M4A":
                return {"url": s["url"]}
    except Exception as e:
        print("Fallo Piped:", e)

    return JSONResponse(status_code=500, content={"error": "Bloqueo total de la red"})
