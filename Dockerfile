# Usa la imagen oficial de Python como base
FROM python:3.11-slim

# Instala ffmpeg en el contenedor (¡Esta es la clave!)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos de dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia el resto del código de la aplicación
COPY . .

# Expone el puerto en el que tu app correrá
EXPOSE 8000

# Comando para ejecutar la aplicación con Uvicorn
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
