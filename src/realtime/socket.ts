import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
let ioRef: Server | null = null;
export function setupSocket(server: HttpServer) {
  const defaults = ['http://localhost:5173', 'https://livewatch-frontend.vercel.app'];
  const extra = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const allowList = Array.from(new Set([...defaults, ...extra]));
  const dynamicOrigin = (origin: string | undefined, cb: (err: Error | null, ok?: boolean) => void) => {
    if (!origin) return cb(null, true);
    if (allowList.includes(origin)) return cb(null, true);
    try {
      const host = new URL(origin).host;
      if (/^localhost(?::\d+)?$/i.test(host) || /\.vercel\.app$/i.test(host)) return cb(null, true);
    } catch {}
    return cb(new Error('Not allowed by CORS'));
  };
  const io = new Server(server, { cors: { origin: dynamicOrigin as any, methods: ['GET','POST'], credentials: true } });
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
