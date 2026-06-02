require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { testConnection } = require('./db/pool');
const { initWebSocket } = require('./websocket');
const { connectMQTT } = require('./mqtt/client');
const routes = require('./routes');
const { seedAdmin } = require('./controllers/authController');

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.use('/api', routes);

app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

const PORT = process.env.PORT || 3000;

async function start() {
  await testConnection();
  await seedAdmin();
  initWebSocket(server);
  connectMQTT();

  server.listen(PORT, () => {
    console.log(`🚌 SIV Backend running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket on ws://localhost:${PORT}/ws`);
  });
}

start().catch((error) => {
  console.error('Failed to start backend:', error);
  process.exit(1);
});

