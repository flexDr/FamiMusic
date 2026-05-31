import random
import httpx
import urllib.parse
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse

app = FastAPI(title="FamiMusic CDN v4 - Red Masiva")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === EL ARSENAL DE FUEGO ===
PROXIES_POOL = []

# Base de túneles espejo robustos (Se pueden agregar más aquí)
NODOS_POOL = [
    {"url": "https://pipedapi.kavin.rocks"},
    {"url": "https://pipedapi.syncpundit.io"},
    {"url": "https://pipedapi.smnz.de"},
    {"url": "https://pipedapi.tokhmi.xyz"},
    {"url": "https://piapi.pussthecat.org"}
]

# === EL CAZADOR AUTOMÁTICO (Scraping de Proxies al iniciar) ===
@app.on_event("startup")
async def cargar_arsenal_fantasma():
    """Descarga miles de proxies gratuitos frescos cada vez que el servidor despierta"""
    print("Iniciando raspado de proxies gratuitos globales...")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Proxyscrape API: Nos da una lista de texto puro con miles de IPs libres
            res = await client.get("https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=all&ssl=all&anonymity=all")
            if res.status_code == 200:
                lista_cruda = res.text.strip().split("\r\n")
                global PROXIES_POOL
                PROXIES_POOL = [f"http://{p}" for p in lista_cruda if p]
                print(f"🔥 ÉXITO: {len(PROXIES_POOL)} proxies inyectados en la memoria.")
    except Exception as e:
        print(f"Error en el scraping inicial, operando con túneles base: {e}")

# RUTA PRINCIPAL
@app.get("/")
def cargar_interfaz():
    return FileResponse("templates/index.html")

# RUTA DE ESTADO
@app.get("/status")
def check_status():
    return {
        "status": "ONLINE", 
        "tuneles_espejo": len(NODOS_POOL), 
        "proxies_fantasma": len(PROXIES_POOL),
        "defensa": "Nivel Máximo"
    }

# BÚSQUEDA CAMUFLADA (Usa los 1,000 proxies para evitar bloqueos)
@app.get("/search/{query}")
async def buscar_musica(query: str):
    nodos_prueba = list(NODOS_POOL)
    random.shuffle(nodos_prueba) 
    
    # Selecciona un proxy al azar de los miles que raspamos
    proxy_elegido = random.choice(PROXIES_POOL) if len(PROXIES_POOL) > 0 else None
    proxies_config = {"http://": proxy_elegido, "https://": proxy_elegido} if proxy_elegido else None
    
    # Inyectamos el proxy en el motor HTTPX
    async with httpx.AsyncClient(proxies=proxies_config, timeout=8.0) as client:
        for nodo in nodos_prueba:
            try:
                query_codificado = urllib.parse.quote(query)
                url = f"{nodo['url']}/search?q={query_codificado}&filter=videos"
                res = await client.get(url)
                
                if res.status_code == 200:
                    data = res.json()
                    resultados = []
                    
                    for item in data.get("items", []):
                        video_url = item.get("url", "")
                        video_id = video_url.replace("/watch?v=", "")
                        
                        if video_id and item.get("type") == "stream":
                            resultados.append({
                                "id": video_id,
                                "title": item.get("title", "Desconocido"),
                                "thumb": item.get("thumbnail", ""),
                                "uploader": item.get("uploaderName", "Fami Music")
                            })
                    
                    if len(resultados) > 0:
                        return resultados
            except Exception:
                continue 
                
    raise HTTPException(status_code=503, detail="Red saturada. Los proxies están rotando, intenta en 1 segundo.")

# TRANSMISOR DE ALTA VELOCIDAD (Conexión directa del servidor para evitar cortes de audio)
@app.get("/stream/{video_id}")
async def tunel_de_transmision(video_id: str):
    nodos_prueba = list(NODOS_POOL)
    random.shuffle(nodos_prueba)
    audio_url = None
    
    async with httpx.AsyncClient(timeout=8.0) as client:
        for nodo in nodos_prueba:
            try:
                endpoint = f"{nodo['url']}/streams/{video_id}"
                res = await client.get(endpoint)
                
                if res.status_code == 200:
                    data = res.json()
                    if "audioStreams" in data:
                        streams = data["audioStreams"]
                        m4a = next((s for s in streams if s.get("format") == "M4A"), None)
                        if not m4a and len(streams) > 0:
                            m4a = streams[0]
                        if m4a:
                            audio_url = m4a.get("url")
                            break
            except Exception:
                continue

    if not audio_url:
        raise HTTPException(status_code=500, detail="Ningún túnel pudo descifrar el flujo")

    async def generador_de_bytes():
        async with httpx.AsyncClient() as client:
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
