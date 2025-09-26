import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'lw_session';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const SESSION_MS = 3 * 60 * 60 * 1000; // 3 hours
const isProd = process.env.NODE_ENV === 'production';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    let token = req.cookies?.[COOKIE_NAME] as string | undefined;
    if (!token) {
      const auth = req.headers['authorization'];
      if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) {
        token = auth.slice('Bearer '.length);
      }
    }
    if (!token) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.log('[auth] missing session cookie');
      }
      return res.status(401).json({ error: 'unauthorized' });
    }
    const payload = jwt.verify(token, JWT_SECRET) as any;
    (req as any).userId = payload.sub;
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('[auth] session ok', { userId: payload.sub });
    }
    // refresh cookie on activity
    const refreshed = jwt.sign({ sub: payload.sub }, JWT_SECRET, { expiresIn: Math.floor(SESSION_MS / 1000) });
    res.cookie(COOKIE_NAME, refreshed, {
      httpOnly: true,
      secure: isProd,
      sameSite: (isProd ? 'none' : 'lax') as any,
      maxAge: SESSION_MS,
    });
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'unauthorized' });
  }
}

export function createSessionToken(userId: string) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: Math.floor(SESSION_MS / 1000) });
}

export function setSessionCookie(res: Response, userId: string) {
  const token = createSessionToken(userId);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? 'none' : 'lax') as any,
    maxAge: SESSION_MS,
  });
}


