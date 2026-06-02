# Usamos un sistema operativo ligero con Node.js preinstalado
FROM node:18-bullseye-slim

# Instalamos Python, FFmpeg y herramientas de red en el sistema
RUN apt-get update && apt-get install -y \
    python3 \
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

# Copiamos todo el proyecto (incluyendo tu static, templates y cookies.txt)
COPY . .

# Comando de arranque
CMD ["npm", "start"]
