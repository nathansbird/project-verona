import colyseus from 'colyseus';
import wsTransport from '@colyseus/ws-transport';
const { Server } = colyseus;
const { WebSocketTransport } = wsTransport;
import express from 'express';
import { createServer } from 'http';
import { ArenaRoom } from './ArenaRoom.js';

const port = Number(process.env.PORT ?? 2567);
const app = express();
const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define('arena', ArenaRoom);

httpServer.listen(port, () => {
  console.log(`[glide-server] listening on :${port}`);
});
