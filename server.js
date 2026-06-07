const express = require('express');
const path = require('path');
const app = express();

// Entregamos los archivos visuales respetando tus carpetas
app.use('/static', express.static(path.join(__dirname, 'static')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'templates', 'index.html')));
app.get('/sw.js', (req, res) => res.sendFile(path.join(__dirname, 'static', 'sw.js')));
app.get('/manifest.json', (req, res) => res.sendFile(path.join(__dirname, 'static', 'manifest.json')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor Estático Front-End rugiendo en el puerto ${PORT}`));
