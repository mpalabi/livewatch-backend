import cron from 'node-cron';
import { Op } from 'sequelize';
import { Monitor, Check, User, NotificationChannel, MonitorNotification } from '../db/models';
import { renderEmailHtml, sendEmail } from './mailer';

type ReportWindow = {
  start: Date;
  end: Date;
  label: 'Morning' | 'Evening';
};

function getHoursConfig() {
  const morningHour = Math.max(0, Math.min(23, Number(process.env.REPORT_MORNING_HOUR || 8)));
  const eveningHour = Math.max(0, Math.min(23, Number(process.env.REPORT_EVENING_HOUR || 19)));
  const timezone = String(process.env.REPORT_TZ || 'UTC');
  return { morningHour, eveningHour, timezone };
}

export async function generateAndSendReports(window: ReportWindow) {
  const users = await User.findAll();
  for (const user of users) {
    // Find all monitors owned by the user
    const monitors = await Monitor.findAll({ where: { userId: (user as any).id } });
    if (!monitors.length) continue;

    // Find all email channels for this user that are linked to at least one of these monitors
    const monitorIds = monitors.map((m) => (m as any).id);
    const links: any[] = await (MonitorNotification as any).findAll({ where: { monitorId: { [Op.in]: monitorIds } } });
    if (!links.length) continue;

    const channelIds = Array.from(new Set(links.map((l) => (l as any).channelId)));
    const channels: any[] = await (NotificationChannel as any).findAll({ where: { id: { [Op.in]: channelIds }, type: 'email' } });
    const destinations = Array.from(new Set(channels.map((c) => (c as any).destination).filter(Boolean)));
    if (!destinations.length) continue;

    // Build report lines per monitor
    const lines: string[] = [];
    for (const monitor of monitors) {
      const whereRange: any = { monitorId: (monitor as any).id, createdAt: { [Op.gte]: window.start, [Op.lt]: window.end } };
      const [total, up, down] = await Promise.all([
        (Check as any).count({ where: whereRange }),
        (Check as any).count({ where: { ...whereRange, status: 'up' } }),
        (Check as any).count({ where: { ...whereRange, status: 'down' } }),
      ]);
      if (total === 0) continue;
      const uptime = total > 0 ? Math.round((up / total) * 100) : 0;
      if (down > 0) {
        lines.push(`${(monitor as any).name}: ${down} down checks, uptime ${uptime}%`);
      }
    }

    if (!lines.length) {
      // Nothing notable happened for this user in the window
      continue;
    }

    const title = window.label === 'Morning' ? 'Nightly Report' : 'Daytime Report';
    const subtitle = `${window.start.toISOString()} → ${window.end.toISOString()}`;
    const html = renderEmailHtml({ title, subtitle, lines, cta: { label: 'Open LiveWatch', url: (process.env.APP_URL || 'https://livewatch-frontend.vercel.app') } });
    const subject = `[LiveWatch] ${title}`;
    try {
      await sendEmail(destinations, subject, lines.join('\n'), html);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[reports] failed to send', (user as any).email, err);
    }
  }
}

export function startReportScheduler() {
  const { morningHour, eveningHour, timezone } = getHoursConfig();

  // Morning: cover the night window (previous eveningHour -> now)
  cron.schedule(`0 ${morningHour} * * *`, async () => {
    try {
      const now = new Date();
      const spanHours = (24 - eveningHour) + morningHour; // e.g., 19->8 = 13h
      const start = new Date(now.getTime() - spanHours * 60 * 60 * 1000);
      await generateAndSendReports({ start, end: now, label: 'Morning' });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[reports] morning job failed', err);
    }
  }, { timezone });

  // Evening: cover the day window (morningHour -> now)
  cron.schedule(`0 ${eveningHour} * * *`, async () => {
    try {
      const now = new Date();
      const spanHours = Math.max(1, eveningHour - morningHour); // e.g., 8->19 = 11h
      const start = new Date(now.getTime() - spanHours * 60 * 60 * 1000);
      await generateAndSendReports({ start, end: now, label: 'Evening' });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[reports] evening job failed', err);
    }
  }, { timezone });
}


