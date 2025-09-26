import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
let ioRef: Server | null = null;
export function setupSocket(server: HttpServer) {
  const io = new Server(server, { cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:5173', methods: ['GET','POST'], credentials: true } });
  ioRef = io;
  io.on('connection', (socket) => {
    console.log('socket connected', socket.id);
    socket.emit('connected', { ok: true });
    socket.on('disconnect', (reason) => {
      console.log('socket disconnected', socket.id, reason);
    });
  });
  return io;
}

export function getSocketStats() {
  const clients = ioRef ? ioRef.engine.clientsCount : 0;
  return { clients };
}
