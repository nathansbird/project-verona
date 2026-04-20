import colyseus from 'colyseus';
import wsTransport from '@colyseus/ws-transport';
const { Server } = colyseus;
const { WebSocketTransport } = wsTransport;
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { ArenaRoom } from './ArenaRoom.js';

const port = Number(process.env.PORT ?? 2567);
const app = express();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define('arena', ArenaRoom);

httpServer.listen(port, () => {
  console.log(`[glide-server] listening on :${port}`);
});
