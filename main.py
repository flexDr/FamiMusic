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

# Las APIs de búsqueda y audio fueron eliminadas. 
# Ahora el celular y la Mac harán todo el trabajo solos para evitar los bloqueos de Render.
