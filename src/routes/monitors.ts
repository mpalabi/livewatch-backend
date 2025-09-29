import { Router } from 'express';
import { Monitor, Check, User, NotificationChannel, MonitorNotification, MonitorShare } from '../db/models';
import { requireAuth } from '../middlewares/requireAuth';
import { Op, Sequelize } from 'sequelize';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const myMonitors = await Monitor.findAll({ where: { userId }, order: [['createdAt', 'DESC']] });
    let sharedIds: string[] = [];
    try {
      sharedIds = (await (MonitorShare as any).findAll({ where: { userId, status: 'accepted' }, attributes: ['monitorId'] })).map((s: any) => s.monitorId);
    } catch (_) {
      sharedIds = [];
    }
    const sharedMonitors = sharedIds.length ? await Monitor.findAll({ where: { id: sharedIds }, order: [['createdAt', 'DESC']] }) : [];
    const monitors = [...myMonitors, ...sharedMonitors];
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
    // requestor userId present via auth middleware
    const { type = 'web_app', name, url, method = 'GET', expectedStatus = 200, intervalSeconds = 60, timeoutMs = 10000, headers = null, isPaused = false, notifyEmails } = req.body || {};
    if (!name || !url) {
      return res.status(400).json({ error: 'name_and_url_required' });
    }
    const userId = (req as any).userId as string | undefined;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const monitor = await Monitor.create({
      userId,
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

    // Optional: create notification channels and link to this monitor
    let channelsCreated: any[] = [];
    if (notifyEmails) {
      const emails: string[] = Array.isArray(notifyEmails)
        ? notifyEmails
        : String(notifyEmails)
            .split(',')
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean);
      const unique = Array.from(new Set(emails));
      for (const email of unique) {
        const [channel] = await (NotificationChannel as any).findOrCreate({
          where: { userId, type: 'email', destination: email },
          defaults: { settings: null },
        });
        channelsCreated.push({ id: channel.id, destination: channel.destination });
        await (MonitorNotification as any).findOrCreate({
          where: { monitorId: monitor.id, channelId: channel.id },
          defaults: { notifyOn: 'down', thresholdMs: null },
        });
      }
    }
    res.status(201).json({ monitor, notifications: channelsCreated });
  } catch (err: any) {
    // Log full error for debugging
    // eslint-disable-next-line no-console
    console.error('failed_to_create_monitor', err);
    const message = err?.message || 'failed_to_create_monitor';
    res.status(500).json({ error: 'failed_to_create_monitor', message });
  }
});

// Update a monitor (owner only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const { id } = req.params as { id: string };
    const monitor = await Monitor.findOne({ where: { id, userId } });
    if (!monitor) return res.status(404).json({ error: 'not_found_or_forbidden' });

    const allowed: Array<keyof any> = [
      'type','name','url','method','expectedStatus','intervalSeconds','timeoutMs','headers','isPaused'
    ];
    const updates: any = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) {
        updates[key] = (req.body as any)[key];
      }
    }
    await (monitor as any).update(updates);

    // Optional: update notification email links
    const { notifyEmails } = req.body || {};
    let channelsUpdated: any[] = [];
    if (typeof notifyEmails !== 'undefined') {
      const emails: string[] = Array.isArray(notifyEmails)
        ? notifyEmails
        : String(notifyEmails || '')
            .split(',')
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean);
      const unique = Array.from(new Set(emails));

      // Ensure links exist for provided emails
      for (const email of unique) {
        const [channel] = await (NotificationChannel as any).findOrCreate({
          where: { userId, type: 'email', destination: email },
          defaults: { settings: null },
        });
        channelsUpdated.push({ id: channel.id, destination: channel.destination });
        await (MonitorNotification as any).findOrCreate({
          where: { monitorId: monitor.id, channelId: channel.id },
          defaults: { notifyOn: 'down', thresholdMs: null },
        });
      }
      // Optionally detach old links that are no longer in the list
      const existingLinks: any[] = await (MonitorNotification as any).findAll({ where: { monitorId: monitor.id } });
      for (const link of existingLinks) {
        const chan = await (NotificationChannel as any).findByPk(link.channelId);
        if (chan?.type === 'email' && chan?.userId === userId) {
          if (!unique.includes(String(chan.destination).toLowerCase())) {
            await (MonitorNotification as any).destroy({ where: { monitorId: monitor.id, channelId: chan.id } });
          }
        }
      }
    }

    return res.json({ monitor, notifications: channelsUpdated });
  } catch (err) {
    return res.status(500).json({ error: 'failed_to_update_monitor' });
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

// Uptime aggregation per day for a given month (YYYY-MM)
router.get('/:id/uptime', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const month = typeof req.query.month === 'string' ? req.query.month : undefined;
    const base = month ? new Date(`${month}-01T00:00:00.000Z`) : new Date();
    const year = base.getUTCFullYear();
    const m = base.getUTCMonth();
    const start = new Date(Date.UTC(year, m, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, m + 1, 1, 0, 0, 0));

    // Raw SQL for aggregation by day
    const sql = `
      SELECT
        to_char("createdAt" at time zone 'UTC', 'YYYY-MM-DD') AS day,
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) AS up,
        SUM(CASE WHEN status = 'down' THEN 1 ELSE 0 END) AS down
      FROM "Checks"
      WHERE "monitorId" = $1 AND "createdAt" >= $2 AND "createdAt" < $3
      GROUP BY day
      ORDER BY day ASC;
    `;
    const [rows]: any = await (Check as any).sequelize.query(sql, { bind: [id, start, end] });

    // Build a map for quick lookup
    const map = new Map<string, any>();
    for (const r of rows) {
      const total = Number(r.total) || 0;
      const up = Number(r.up) || 0;
      const down = Number(r.down) || 0;
      const uptime = total > 0 ? Math.round((up / total) * 100) : 0;
      map.set(r.day, { date: r.day, total, up, down, uptime });
    }

    // Ensure every day of month exists in the response
    const days: any[] = [];
    for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      const entry = map.get(key) || { date: key, total: 0, up: 0, down: 0, uptime: 0 };
      days.push(entry);
    }

    return res.json({ month: `${year}-${String(m + 1).padStart(2, '0')}`, days });
  } catch (err) {
    return res.status(500).json({ error: 'failed_to_get_uptime' });
  }
});

// Metrics: per-day aggregates and overall summary for a recent range (default 30 days)
router.get('/:id/metrics', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const range = typeof req.query.range === 'string' ? req.query.range : '30d';
    const days = Number((range || '').replace(/d$/,'')) || 30;
    const end = new Date();
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - days + 1);

    const sql = `
      SELECT
        to_char("createdAt" at time zone 'UTC', 'YYYY-MM-DD') AS day,
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) AS up,
        SUM(CASE WHEN status = 'down' THEN 1 ELSE 0 END) AS down,
        AVG("responseTimeMs") AS avg_ms
      FROM "Checks"
      WHERE "monitorId" = $1 AND "createdAt" >= $2 AND "createdAt" < $3
      GROUP BY day
      ORDER BY day ASC;
    `;
    const [rows]: any = await (Check as any).sequelize.query(sql, { bind: [id, start, end] });

    // Build day map covering full range
    const map = new Map<string, any>();
    for (const r of rows) {
      const total = Number(r.total) || 0;
      const up = Number(r.up) || 0;
      const down = Number(r.down) || 0;
      const avg = Math.round(Number(r.avg_ms) || 0);
      const uptime = total > 0 ? Math.round((up / total) * 100) : 0;
      map.set(r.day, { date: r.day, total, up, down, avgResponseMs: avg, uptime });
    }
    const daysOut: any[] = [];
    const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const endU = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()+1));
    for (; cur < endU; cur.setUTCDate(cur.getUTCDate()+1)) {
      const key = cur.toISOString().slice(0,10);
      const entry = map.get(key) || { date: key, total: 0, up: 0, down: 0, avgResponseMs: 0, uptime: 0 };
      daysOut.push(entry);
    }

    const tot = daysOut.reduce((a, d) => a + d.total, 0);
    const upTot = daysOut.reduce((a, d) => a + d.up, 0);
    const avgAll = Math.round(
      daysOut.filter(d => d.avgResponseMs > 0).reduce((a, d) => a + d.avgResponseMs, 0) /
      Math.max(1, daysOut.filter(d => d.avgResponseMs > 0).length)
    );
    const uptimePct = tot > 0 ? Math.round((upTot / tot) * 100) : 0;

    return res.json({ rangeDays: days, uptimePct, avgResponseMs: isFinite(avgAll) ? avgAll : 0, days: daysOut });
  } catch (err) {
    return res.status(500).json({ error: 'failed_to_get_metrics' });
  }
});

// Paginated checks with optional date range filters
router.get('/:id/checks', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const page = Math.max(0, Number(req.query.page) || 0);
    const offset = page * limit;
    const from = typeof req.query.from === 'string' ? new Date(`${req.query.from}T00:00:00.000Z`) : undefined;
    const toRaw = typeof req.query.to === 'string' ? new Date(`${req.query.to}T00:00:00.000Z`) : undefined;
    const to = toRaw ? new Date(toRaw.getTime() + 24*60*60*1000) : undefined; // inclusive day

    const where: any = { monitorId: id };
    if (from && to) where.createdAt = { [Op.gte]: from, [Op.lt]: to };
    else if (from) where.createdAt = { [Op.gte]: from };
    else if (to) where.createdAt = { [Op.lt]: to };

    const { rows, count } = await (Check as any).findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });
    res.json({ rows, total: count, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'failed_to_list_checks' });
  }
});


