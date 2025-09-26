import { Router } from 'express';
import { Monitor, Check, User } from '@db/models';
import { requireAuth } from '@middlewares/requireAuth';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const monitors = await Monitor.findAll({ order: [['createdAt', 'DESC']] });
    const results = [] as Array<any>;
    for (const m of monitors) {
      const latest = await Check.findOne({ where: { monitorId: m.id }, order: [['createdAt', 'DESC']] });
      results.push({
        id: m.id,
        type: (m as any).type,
        name: m.name,
        url: m.url,
        method: m.method,
        expectedStatus: m.expectedStatus,
        intervalSeconds: m.intervalSeconds,
        timeoutMs: m.timeoutMs,
        isPaused: m.isPaused,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        latestCheck: latest ? {
          status: latest.status,
          httpStatus: latest.httpStatus,
          responseTimeMs: latest.responseTimeMs,
          error: latest.error,
          createdAt: latest.createdAt,
        } : null,
      });
    }
    res.json({ monitors: results });
  } catch (err) {
    res.status(500).json({ error: 'failed_to_list_monitors' });
  }
});

export default router;

router.post('/', requireAuth, async (req, res) => {
  try {
    const { type = 'web_app', name, url, method = 'GET', expectedStatus = 200, intervalSeconds = 60, timeoutMs = 10000, headers = null, isPaused = false } = req.body || {};
    if (!name || !url) {
      return res.status(400).json({ error: 'name_and_url_required' });
    }
    // Ensure a demo user exists for now (no auth yet)
    const [user] = await (User as any).findOrCreate({
      where: { email: 'demo@example.com' },
      defaults: { name: 'Demo', passwordHash: 'x' },
    });
    const monitor = await Monitor.create({
      userId: user.id,
      type,
      name,
      url,
      method,
      expectedStatus,
      intervalSeconds,
      timeoutMs,
      headers,
      isPaused,
    } as any);
    res.status(201).json({ monitor });
  } catch (err: any) {
    // Log full error for debugging
    // eslint-disable-next-line no-console
    console.error('failed_to_create_monitor', err);
    const message = err?.message || 'failed_to_create_monitor';
    res.status(500).json({ error: 'failed_to_create_monitor', message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const monitor = await Monitor.findByPk(id);
    if (!monitor) return res.status(404).json({ error: 'not_found' });
    const latest = await Check.findOne({ where: { monitorId: id }, order: [['createdAt', 'DESC']] });
    const checks = await Check.findAll({ where: { monitorId: id }, order: [['createdAt', 'DESC']], limit: 20 });
    res.json({
      monitor: {
        id: monitor.id,
        type: (monitor as any).type,
        name: monitor.name,
        url: monitor.url,
        method: monitor.method,
        expectedStatus: monitor.expectedStatus,
        intervalSeconds: monitor.intervalSeconds,
        timeoutMs: monitor.timeoutMs,
        headers: monitor.headers,
        isPaused: monitor.isPaused,
        createdAt: monitor.createdAt,
        updatedAt: monitor.updatedAt,
        latestCheck: latest ? {
          status: latest.status,
          httpStatus: latest.httpStatus,
          responseTimeMs: latest.responseTimeMs,
          error: latest.error,
          createdAt: latest.createdAt,
        } : null,
      },
      checks: checks.map(c => ({
        id: c.id,
        status: c.status,
        httpStatus: c.httpStatus,
        responseTimeMs: c.responseTimeMs,
        error: c.error,
        createdAt: c.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'failed_to_get_monitor' });
  }
});


