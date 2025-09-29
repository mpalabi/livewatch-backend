import { Router } from 'express';
import { User } from '../db/models';
import sequelize from '../db/index';
import { literal } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { setSessionCookie, createSessionToken, clearSessionCookie } from '../middlewares/requireAuth';
import { requireAuth } from '../middlewares/requireAuth';
import { sendEmail } from '../services/mailer';

const router = Router();

router.post('/request', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email_required' });
    const emailNorm = String(email).trim().toLowerCase();
    // eslint-disable-next-line no-console
    console.log('[auth] request code', { email: emailNorm });
    const [user] = await (User as any).findOrCreate({ where: { email: emailNorm }, defaults: { name: emailNorm.split('@')[0], passwordHash: 'x' } });
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await sequelize.query(
      'INSERT INTO "OtpCodes" (id, "userId", code, "expiresAt", consumed, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, false, now(), now());',
      { bind: [uuidv4(), user.id, code, expiresAt] }
    );
    try {
      await sendEmail(emailNorm, 'Your LiveWatch login code', `Your code is ${code}. It expires in 10 minutes.`);
    } catch {}
    // eslint-disable-next-line no-console
    console.log('[auth] code generated', { email: emailNorm, code });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'otp_request_failed' });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code) return res.status(400).json({ error: 'email_and_code_required' });
    const emailNorm = String(email).trim().toLowerCase();
    const codeNorm = String(code).trim();
    // eslint-disable-next-line no-console
    console.log('[auth] verify code', { email: emailNorm });
    const user = await (User as any).findOne({ where: { email: emailNorm } });
    if (!user) return res.status(400).json({ error: 'invalid_user' });
    // First, lookup a valid code
    const [rows]: any = await sequelize.query(
      'SELECT id FROM "OtpCodes" WHERE "userId"=$1 AND code=$2 AND consumed=false AND "expiresAt">now() ORDER BY "createdAt" DESC LIMIT 1;',
      { bind: [user.id, codeNorm] }
    );
    if (!rows || !rows.length) {
      // In dev, log the latest code we have to help diagnose
      if (process.env.NODE_ENV !== 'production') {
        const [latest]: any = await sequelize.query(
          'SELECT code, consumed, "expiresAt" FROM "OtpCodes" WHERE "userId"=$1 ORDER BY "createdAt" DESC LIMIT 1;',
          { bind: [user.id] }
        );
        // eslint-disable-next-line no-console
        console.log('[auth] verify failed - latest on record', latest?.[0]);
      }
      return res.status(400).json({ error: 'invalid_code' });
    }
    const codeId = rows[0].id;
    await sequelize.query('UPDATE "OtpCodes" SET consumed=true, "updatedAt"=now() WHERE id=$1;', { bind: [codeId] });
    setSessionCookie(res, user.id);
    const token = createSessionToken(user.id);
    return res.json({ ok: true, token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    return res.status(500).json({ error: 'otp_verify_failed' });
  }
});

// SMTP test route removed

router.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  return res.json({ ok: true });
});

export default router;

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await (User as any).findByPk((req as any).userId);
    if (!user) return res.status(401).json({ error: 'unauthorized' });
    return res.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    return res.status(401).json({ error: 'unauthorized' });
  }
});


