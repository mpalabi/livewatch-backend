import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Express } from 'express';
export function applySecurity(app: Express) {
  app.use(helmet());
  const defaults = ['http://localhost:5173', 'https://livewatch-frontend.vercel.app'];
  const extra = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const allowList = Array.from(new Set([...defaults, ...extra]));
  const patterns = [/^https?:\/\/localhost(?::\d+)?$/i, /\.vercel\.app$/i];
  app.use(cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (allowList.includes(origin)) return cb(null, true);
      try {
        const host = new URL(origin).host;
        if (patterns.some((re) => re.test(host))) return cb(null, true);
      } catch {}
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }));
  app.use(rateLimit({ windowMs: 60_000, max: 120 }));
}
