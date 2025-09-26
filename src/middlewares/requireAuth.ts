import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'lw_session';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const SESSION_MS = 3 * 60 * 60 * 1000; // 3 hours

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.status(401).json({ error: 'unauthorized' });
    const payload = jwt.verify(token, JWT_SECRET) as any;
    (req as any).userId = payload.sub;
    // refresh cookie on activity
    const refreshed = jwt.sign({ sub: payload.sub }, JWT_SECRET, { expiresIn: Math.floor(SESSION_MS / 1000) });
    res.cookie(COOKIE_NAME, refreshed, {
      httpOnly: true,
      secure: true, // user requested secure in all envs
      sameSite: 'none',
      maxAge: SESSION_MS,
    });
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'unauthorized' });
  }
}

export function setSessionCookie(res: Response, userId: string) {
  const token = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: Math.floor(SESSION_MS / 1000) });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true, // requested secure flag in all envs
    sameSite: 'none',
    maxAge: SESSION_MS,
  });
}


