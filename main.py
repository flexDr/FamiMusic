import yt_dlp
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/")
def home(): 
    return FileResponse("templates/index.html")

@app.get("/search/{q}")
def search(q: str):
    # Solo buscamos los resultados a la velocidad de la luz, sin intentar descargar nada
    with yt_dlp.YoutubeDL({'extract_flat': True, 'quiet': True}) as ydl:
        info = ydl.extract_info(f"ytsearch15:{q} official audio", download=False)
        return [{"id": e['id'], "title": e['title'], "thumb": f"https://wsrv.nl/?url=https://img.youtube.com/vi/{e['id']}/mqdefault.jpg"} for e in info.get('entries', []) if e.get('id')]
