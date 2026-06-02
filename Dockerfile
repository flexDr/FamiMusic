# Usamos un sistema operativo más moderno (Bookworm) que ya trae Python 3.11
FROM node:20-bookworm-slim

# Instalamos Python 3, FFmpeg y wget
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Descargamos e instalamos la última versión oficial de yt-dlp
RUN wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Nos ubicamos en la carpeta de trabajo
WORKDIR /app

# Instalamos la librería Express
COPY package.json .
RUN npm install

# Copiamos todo el proyecto (tu PWA, cookies y servidor)
COPY . .

# Comando de arranque
CMD ["npm", "start"]
