import cron from 'node-cron';
import fetch from 'node-fetch';
import { Monitor, Check } from '@db/models';
import { literal } from 'sequelize';
export function startMonitorScheduler(notify: (payload: any) => Promise<void>, emit: (event: string, data: any) => void) {
  cron.schedule('*/4 * * * *', async () => {
    console.log('[scheduler] tick (every 4 minutes)');
    const monitors = await Monitor.findAll({ where: { isPaused: false } });
    for (const monitor of monitors) {
      const start = Date.now();
      let status: 'up' | 'down' = 'down';
      let httpStatus: number | null = null;
      let error: string | null = null;
      try {
        const res = await fetch(monitor.url, { method: monitor.method });
        httpStatus = res.status as number;
        status = httpStatus === monitor.expectedStatus ? 'up' : 'down';
      } catch (e: any) {
        error = e?.message || 'request_failed';
        status = 'down';
      }
      const responseTimeMs = Date.now() - start;
      const check = await Check.create({ id: literal('gen_random_uuid()') as any, monitorId: monitor.id, status, httpStatus, responseTimeMs, error } as any);
      emit('check:update', { monitorId: monitor.id, status, httpStatus, responseTimeMs, error, createdAt: check.createdAt });
      if (status === 'down') { await notify({ type: 'down', monitor }); }
    }
  });
}
