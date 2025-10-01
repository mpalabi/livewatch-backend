import cron from 'node-cron';
import fetch from 'node-fetch';
import { Monitor, Check } from '../db/models';
import { v4 as uuidv4 } from 'uuid';
import { literal } from 'sequelize';
function isWithinDaytimeOnlyCriticalWindow(date: Date) {
  const tz = String(process.env.REPORT_TZ || 'UTC');
  // Convert to target TZ by building components in that TZ using locale options
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, hour: '2-digit' });
  const hour = Number(fmt.format(date));
  const morningHour = Math.max(0, Math.min(23, Number(process.env.REPORT_MORNING_HOUR || 8)));
  const eveningHour = Math.max(0, Math.min(23, Number(process.env.REPORT_EVENING_HOUR || 19)));
  return hour >= morningHour && hour < eveningHour;
}

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
      // Look at last two checks before inserting the new one
      const prevTwo = await Check.findAll({ where: { monitorId: monitor.id }, order: [['createdAt', 'DESC']], limit: 2 });
      const prev1 = prevTwo[0];
      const prev2 = prevTwo[1];

      const check = await Check.create({ id: uuidv4() as any, monitorId: monitor.id, status, httpStatus, responseTimeMs, error } as any);
      emit('check:update', { monitorId: monitor.id, status, httpStatus, responseTimeMs, error, createdAt: check.createdAt });

      // Notify when two consecutive downs (including current) and previous-previous wasn't down (first alert burst)
      if (status === 'down' && prev1?.status === 'down' && (!prev2 || prev2.status !== 'down')) {
        await notify({ type: 'down', monitor });
      }
      // Notify recovery when two consecutive ups and previous-previous wasn't up
      // Only send recovery outside daytime window; during daytime we only send critical (down)
      if (status === 'up' && prev1?.status === 'up' && (!prev2 || prev2.status !== 'up')) {
        const suppressRecovery = isWithinDaytimeOnlyCriticalWindow(new Date());
        if (!suppressRecovery) {
          await notify({ type: 'recovery', monitor });
        }
      }
    }
  });
}
