const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');

const app = express();

// ─── CORS (solo permite tu dominio en producción) ────────────────────────────
const originesPermitidos = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000'];

app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? originesPermitidos : '*',
    methods: ['GET']
}));

// ─── CACHÉ EN MEMORIA (evita llamar al mismo audio 2 veces) ──────────────────
const cache = new Map();
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutos

function cacheGet(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL_MS) { cache.delete(key); return null; }
    return entry.value;
}

function cacheSet(key, value) {
    // Limitar caché a 200 entradas para no agotar RAM en Render
    if (cache.size >= 200) {
        const primerKey = cache.keys().next().value;
        cache.delete(primerKey);
    }
    cache.set(key, { value, ts: Date.now() });
}

// ─── ARCHIVOS ESTÁTICOS ───────────────────────────────────────────────────────
app.use('/static', express.static(path.join(__dirname, 'static')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'templates', 'index.html')));
app.get('/sw.js', (req, res) => {
    res.setHeader('Service-Worker-Allowed', '/');
    res.sendFile(path.join(__dirname, 'static', 'sw.js'));
});
app.get('/manifest.json', (req, res) => res.sendFile(path.join(__dirname, 'static', 'manifest.json')));

// ─── NODOS DE AUDIO (Invidious + Piped) ──────────────────────────────────────
const NODOS = [
    { type: 'invidious', url: 'https://invidious.nerdvpn.de' },
    { type: 'invidious', url: 'https://inv.tux.pizza' },
    { type: 'invidious', url: 'https://invidious.fdn.fr' },
    { type: 'invidious', url: 'https://yt.artemislena.eu' },
    { type: 'piped',     url: 'https://pipedapi.kavin.rocks' },
    { type: 'piped',     url: 'https://pipedapi.tokhmi.xyz' },
    { type: 'piped',     url: 'https://pipedapi.smnz.de' },
    { type: 'piped',     url: 'https://api.piped.yt' }
];

// Mezclar aleatoriamente los nodos para distribuir la carga
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

async function extraerConInvidious(nodo, query) {
    const searchRes = await axios.get(
        `${nodo.url}/api/v1/search?q=${encodeURIComponent(query)}&type=video`,
        { timeout: 8000 }
    );
    if (!searchRes.data?.length) return null;

    const videoId = searchRes.data[0].videoId;
    // itag 140 = audio M4A 128kbps (compatible iPhone/Android)
    const audioUrl = `${nodo.url}/latest_version?id=${videoId}&itag=140`;
    return audioUrl;
}

async function extraerConPiped(nodo, query) {
    const searchRes = await axios.get(
        `${nodo.url}/search?q=${encodeURIComponent(query)}&filter=music_songs`,
        { timeout: 8000 }
    );
    if (!searchRes.data?.items?.length) return null;

    const videoUrl = searchRes.data.items[0].url;
    const videoId = videoUrl.split('?v=')[1];
    if (!videoId) return null;

    const streamRes = await axios.get(`${nodo.url}/streams/${videoId}`, { timeout: 8000 });
    if (!streamRes.data?.audioStreams?.length) return null;

    // Priorizar M4A para compatibilidad con iPhone
    const stream =
        streamRes.data.audioStreams.find(s => s.mimeType?.includes('mp4')) ||
        streamRes.data.audioStreams.find(s => s.mimeType?.includes('m4a')) ||
        streamRes.data.audioStreams[0];

    return stream.url || null;
}

// ─── ENDPOINT PRINCIPAL ───────────────────────────────────────────────────────
app.get('/api/get-audio', async (req, res) => {
    const query = req.query.q?.trim();
    if (!query) return res.status(400).json({ error: 'Falta el parámetro q' });

    // Revisar caché primero
    const cached = cacheGet(query);
    if (cached) {
        console.log(`[CACHÉ] Hit para: ${query}`);
        return res.json({ url: cached, cached: true });
    }

    const nodosBarajados = shuffle([...NODOS]);

    for (const nodo of nodosBarajados) {
        try {
            let url = null;

            if (nodo.type === 'invidious') {
                url = await extraerConInvidious(nodo, query);
            } else if (nodo.type === 'piped') {
                url = await extraerConPiped(nodo, query);
            }

            if (url) {
                cacheSet(query, url);
                console.log(`[ÉXITO] ${nodo.type} / ${nodo.url} → ${query}`);
                return res.json({ url });
            }

        } catch (err) {
            console.log(`[FALLO] ${nodo.url} — ${err.message}`);
            continue;
        }
    }

    console.error(`[DERROTA] Ningún nodo funcionó para: ${query}`);
    res.status(503).json({ error: 'No se pudo obtener el audio. Intenta de nuevo.' });
});

// ─── HEALTH CHECK (para Render) ───────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', cacheSize: cache.size }));

// ─── ARRANQUE ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🎵 FamiMusic corriendo en puerto ${PORT}`));
