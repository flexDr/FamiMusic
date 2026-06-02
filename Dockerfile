FROM python:3.10-slim
# Instalar FFmpeg a nivel de sistema operativo
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Render usa la variable de entorno $PORT dinámicamente
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}
