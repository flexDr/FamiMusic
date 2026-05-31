import json
import urllib.request
import urllib.parse
import os
import ssl
import random
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware # <--- LÍNEA NUEVA

app = FastAPI(title="FamiMusic")

# === ESTO ES LO QUE LE ABRE LA PUERTA AL IPHONE (NUEVO) ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # El * significa "deja entrar a mi app del iPhone"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ==========================================================

app.mount("/static", StaticFiles(directory="static"), name="static")

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")

# ... (De aquí en adelante dejas todo tu código exactamente igual) ...
