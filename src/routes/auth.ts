import { Router } from 'express';
import { User } from '@db/models';
import sequelize from '@db/index';
import { literal } from 'sequelize';
import { setSessionCookie } from '@middlewares/requireAuth';
import { requireAuth } from '@middlewares/requireAuth';
import { sendEmail } from '@src/services/mailer';

const router = Router();

router.post('/request', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email_required' });
    const [user] = await (User as any).findOrCreate({ where: { email }, defaults: { name: email.split('@')[0], passwordHash: 'x' } });
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await sequelize.query(
      'INSERT INTO "OtpCodes" (id, "userId", code, "expiresAt", consumed, "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, false, now(), now());',
      { bind: [user.id, code, expiresAt] }
    );
    try {
      await sendEmail(email, 'Your LiveWatch login code', `Your code is ${code}. It expires in 10 minutes.`);
    } catch {}
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'otp_request_failed' });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code) return res.status(400).json({ error: 'email_and_code_required' });
    const user = await (User as any).findOne({ where: { email } });
    if (!user) return res.status(400).json({ error: 'invalid_user' });
    const [result] = await sequelize.query(
      'UPDATE "OtpCodes" SET consumed=true, "updatedAt"=now() WHERE "userId"=$1 AND code=$2 AND consumed=false AND "expiresAt">now() RETURNING id;',
      { bind: [user.id, code] }
    );
    // @ts-ignore
    if (!result?.rows?.length) return res.status(400).json({ error: 'invalid_code' });
    setSessionCookie(res, user.id);
    return res.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    return res.status(500).json({ error: 'otp_verify_failed' });
  }
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


