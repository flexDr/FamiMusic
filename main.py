import json
import random
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

app = FastAPI(title="FamiMusic Master Server v3")

# Permitir conexiones seguras desde tu iPhone
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REPOSITORIO GLOBAL DE TÚNELES (Nodos Espejo Piped e Invidious de Alta Velocidad)
# Aquí puedes expandir la lista a cientos de nodos públicos o tu URL de Proxy Residencial
NODOS_POOL = [
    {"tipo": "piped", "url": "https://pipedapi.kavin.rocks"},
    {"tipo": "piped", "url": "https://pipedapi.syncpundit.io"},
    {"tipo": "piped", "url": "https://pipedapi.smnz.de"},
    {"tipo": "piped", "url": "https://pipedapi.tokhmi.xyz"},
    {"tipo": "piped", "url": "https://piapi.pussthecat.org"},
    {"tipo": "piped", "url": "https://piped-api.garudalinux.org"},
    {"tipo": "invidious", "url": "https://invidious.jing.rocks"},
    {"tipo": "invidious", "url": "https://inv.tux.pizza"},
    {"tipo": "invidious", "url": "https://invidious.nerdvpn.de"},
    {"tipo": "invidious", "url": "https://invidious.flokinet.to"},
    {"tipo": "invidious", "url": "https://inv.tux.pizza"}
]

@app.get("/")
def check_status():
    nodos_vivos = len(NODOS_POOL)
    return {"status": "ONLINE", "tunes_activos": nodos_vivos, "seguridad": "Bypass-Nativo-Activo"}

@app.get("/search/{query}")
async def buscar_musica(query: str):
    """Buscador balanceado: Interroga a los nodos hasta que uno devuelva los resultados"""
    nodos_prueba = list(NODOS_POOL)
    random.shuffle(nodos_prueba) # Mezclamos para que YouTube nunca vea un patrón de IP
    
    async with httpx.AsyncClient(timeout=6.0) as client:
        for nodo in nodos_prueba:
            try:
                if nodo["tipo"] == "piped":
                    url = f"{nodo['url']}/search?q={httpx.internal_utils.urlencode(query)}&filter=videos"
                    res = await client.get(url)
                    if res.status_code == 200:
                        data = res.json()
                        resultados = []
                        for item in data.get("videos", []):
                            resultados.append({
                                "id": item["id"],
                                "title": item["title"],
                                "thumb": item["thumbnail"],
                                "uploader": item.get("uploaderName", "Fami Music")
                            })
                        return resultados
            except Exception:
                continue # Si un nodo falla o da timeout, salta al siguiente en microsegundos
                
    raise HTTPException(status_code=503, detail="Red de búsqueda saturada temporalmente")

@app.get("/stream/{video_id}")
async def tunel_de_transmision(video_id: str):
    """EL CEREBRO TRANSMISOR: Extrae el audio tras bambalinas y lo transmite al iPhone"""
    nodos_prueba = list(NODOS_POOL)
    random.shuffle(nodos_prueba)
    
    audio_url = None
    
    async with httpx.AsyncClient(timeout=5.0) as client:
        for nodo in nodos_prueba:
            try:
                endpoint = f"{nodo['url']}/streams/{video_id}" if nodo["tipo"] == "piped" else f"{nodo['url']}/api/v1/videos/{video_id}"
                res = await client.get(endpoint)
                if res.status_code != 200:
                    continue
                
                data = res.json()
                # Extracción de formato nativo de Apple (M4A / AAC)
                if nodo["tipo"] == "piped" and "audioStreams" in data:
                    streams = data["audioStreams"]
                    m4a = next((s for s in streams if s.get("format") == "M4A"), streams[0])
                    audio_url = m4a["url"]
                elif nodo["tipo"] == "invidious" and "formatStreams" in data:
                    streams = data["formatStreams"]
                    m4a = next((s for s in streams if s.get("itag") in ["140", 140]), None)
                    if m4a: audio_url = m4a["url"]
                    
                if audio_url:
                    break # ¡Enlace encontrado con éxito! Rompe el bucle.
            except Exception:
                continue

    if not audio_url:
        raise HTTPException(status_code=500, detail="Ningún túnel pudo descifrar el flujo")

    # AQUÍ OCURRE LA INFILTRACIÓN: Render descarga el flujo y se lo reenvía al iPhone en vivo
    async def generador_de_bytes():
        async with httpx.AsyncClient() as client:
            # Añadimos un encabezado de un navegador real para que los servidores no sospechen
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
