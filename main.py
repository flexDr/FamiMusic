import json
import urllib.request
import urllib.parse
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI(title="FamiMusic")
app.mount("/static", StaticFiles(directory="static"), name="static")

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")
if not YOUTUBE_API_KEY:
    print("⚠️ ADVERTENCIA: No se encontró YOUTUBE_API_KEY en variables de entorno")

@app.get("/")
def home():
    return FileResponse("templates/index.html")

@app.get("/search/{q}")
def search(q: str):
    if not YOUTUBE_API_KEY:
        return JSONResponse(
            content={"error": "API Key de YouTube no configurada en el servidor"},
            status_code=500
        )
    
    # Codificar query y construir URL (quitamos regionCode para evitar restricciones)
    q_safe = urllib.parse.quote(q)
    url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q={q_safe}&type=video&key={YOUTUBE_API_KEY}"
    
    print(f"🔍 Buscando: {q}")
    print(f"📡 URL: {url.replace(YOUTUBE_API_KEY, '****')}")
    
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read().decode('utf-8'))
            
            resultados = []
            for item in data.get('items', []):
                if item['id'].get('videoId'):
                    vid = item['id']['videoId']
                    thumb = item['snippet']['thumbnails'].get('high', {}).get('url')
                    if not thumb:
                        thumb = item['snippet']['thumbnails'].get('medium', {}).get('url', '')
                    resultados.append({
                        "id": vid,
                        "title": item['snippet']['title'],
                        "thumb": thumb
                    })
            
            print(f"✅ Encontrados {len(resultados)} resultados")
            
            # Si no hay resultados, devolver un array vacío (el frontend usará el fallback)
            return JSONResponse(content=resultados)
            
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"❌ Error HTTP {e.code}: {error_body}")
        return JSONResponse(
            content={"error": f"Error de YouTube API: {e.code}", "detail": error_body},
            status_code=500
        )
    except Exception as e:
        print(f"❌ Error general: {str(e)}")
        return JSONResponse(
            content={"error": "Error interno al buscar", "detail": str(e)},
            status_code=500
        )
