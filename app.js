require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3315;

// DB pool (callbacks) - usa tu db.js ya ajustado a Railway
const db = require('./db');

// Rutas
const bancoRoutes = require('./routes/Banco.routes');

// Middlewares
app.disable('x-powered-by');
app.set('trust proxy', 1);     // Recomendado en Railway
app.use(cors({ origin: '*'})); // Ajusta origin si quieres restringir
app.use(express.json());

// Endpoints
app.use('/api', bancoRoutes);

// Healthchecks
app.get('/', (req, res) => res.send('API Banco OK'));
app.get('/health', (req, res) => {
  db.query('SELECT 1 AS ok', (err, rows) => {
    if (err) return res.status(500).json({ status: 'error', db: false, message: err.message });
    res.json({ status: 'ok', db: rows && rows[0] && rows[0].ok === 1 });
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Arranque + ping de DB para logs
app.listen(port, () => {
  console.log(`🚀 API Banco escuchando en puerto ${port}`);
  db.query('SELECT 1', (err) => {
    if (err) console.error('❌ Error conectando a MySQL:', err.message);
    else console.log('✅ Conectado a MySQL (Railway)');
  });
});
