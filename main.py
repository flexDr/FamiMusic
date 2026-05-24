import yt_dlp
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/")
def home(): 
    return FileResponse("templates/index.html")

@app.get("/search/{q}")
def search(q: str):
    # BUSCADOR 100% SOUNDCLOUD (scsearch)
    try:
        with yt_dlp.YoutubeDL({'extract_flat': True, 'quiet': True}) as ydl:
            info = ydl.extract_info(f"scsearch15:{q}", download=False)
            resultados = []
            for e in info.get('entries', []):
                if e.get('url') and e.get('title'):
                    
                    # El seguro de la foto para que no se frise la pantalla
                    thumb = "https://ui-avatars.com/api/?name=Mix&background=2a2a2a&color=fff"
                    if e.get('thumbnails') and len(e['thumbnails']) > 0:
                        thumb = e['thumbnails'][0].get('url', thumb)
                    
                    resultados.append({
                        "id": e['url'], # Aquí guardamos el link directo de SoundCloud
                        "title": e['title'],
                        "thumb": thumb
                    })
            return resultados
    except Exception as e:
        return []

@app.get("/stream")
def stream(url: str):
    # EXTRACTOR 100% SOUNDCLOUD
    # Safari y el iPhone aman este formato. Entra directo y sin bloqueos de país.
    try:
        ydl_opts = {
            'format': 'bestaudio/best',
            'quiet': True,
            'no_warnings': True
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            audio_url = info.get('url')
            if audio_url:
                return RedirectResponse(audio_url)
    except:
        pass
    
    return RedirectResponse("/")
