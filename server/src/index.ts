import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { initDatabase } from './db';
import { securityMiddleware } from './security';
import { apiRouter } from './routes';
import { setBroadcaster, CliStreamEvent } from './cli-runner';

const PORT = 3001;
const HOST = '127.0.0.1'; // strictly localhost

const app = express();

// 1. Core middlewares
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  credentials: true
}));

app.use(express.json());
app.use(securityMiddleware);

// 2. API Routes
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 3. HTTP Server
const server = http.createServer(app);

// 4. WebSocket Server for Real-Time Streaming
const wss = new WebSocketServer({ server, path: '/ws' });
const clients = new Set<WebSocket>();

wss.on('connection', (ws, req) => {
  console.log(`[WebSocket] Client connected from ${req.socket.remoteAddress}`);
  clients.add(ws);

  ws.send(JSON.stringify({ type: 'connected', message: 'Pixel Office WebSocket connected' }));

  ws.on('close', () => {
    clients.delete(ws);
    console.log('[WebSocket] Client disconnected');
  });

  ws.on('error', (err) => {
    console.error('[WebSocket] Error:', err);
    clients.delete(ws);
  });
});

// Connect CLI runner events to WebSocket broadcaster
setBroadcaster((event: CliStreamEvent) => {
  const payload = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch (err) {
        console.error('[WebSocket] Send error:', err);
      }
    }
  }
});

// 5. Initialize DB and Start Listening
initDatabase();

server.listen(PORT, HOST, () => {
  console.log(`====================================================`);
  console.log(`🏢 Pixel Office Server running on http://${HOST}:${PORT}`);
  console.log(`🔌 WebSocket Server ready at ws://${HOST}:${PORT}/ws`);
  console.log(`🔒 Security: Localhost binding and Origin enforcement active`);
  console.log(`====================================================`);
});
