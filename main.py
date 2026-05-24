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
    # ¡NUEVO SISTEMA! Buscamos en SoundCloud (scsearch) en lugar de YouTube.
    # Cero bloqueos de país y el mejor catálogo de Dembow y Mixes.
    with yt_dlp.YoutubeDL({'extract_flat': True, 'quiet': True}) as ydl:
        info = ydl.extract_info(f"scsearch15:{q}", download=False)
        resultados = []
        for e in info.get('entries', []):
            if e.get('url') and e.get('title'):
                # Extraemos la portada oficial o ponemos una por defecto
                thumb = "https://ui-avatars.com/api/?name=Musica&background=random"
                if e.get('thumbnails'):
                    thumb = e.get('thumbnails')[0].get('url', thumb)

                resultados.append({
                    "id": e['url'], # Guardamos el enlace directo del track
                    "title": e['title'],
                    "thumb": thumb
                })
        return resultados

@app.get("/stream")
def stream(url: str):
    # Extraemos el MP3 puro. Safari ama este formato y arranca de una vez.
    try:
        with yt_dlp.YoutubeDL({'format': 'bestaudio', 'quiet': True}) as ydl:
            info = ydl.extract_info(url, download=False)
            audio_url = info.get('url')
            if audio_url:
                return RedirectResponse(audio_url)
    except:
        pass
    return {"error": "No se pudo obtener el audio"}
