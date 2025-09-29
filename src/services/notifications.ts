import { Monitor, MonitorNotification, NotificationChannel } from '../db/models';
import { renderEmailHtml, sendEmail as send } from './mailer';

export async function notify(payload: any) {
  const monitor = payload.monitor as any;
  const type = payload.type as 'down' | 'recovery';
  const title = type === 'down' ? `Monitor is DOWN` : `Monitor is back UP`;
  const subtitle = `${monitor.name}`;
  const lines = [
    `URL: ${monitor.url}`,
    type === 'down' ? 'We have detected consecutive failures.' : 'We have detected consecutive successful checks.',
  ];
  const html = renderEmailHtml({ title, subtitle, lines, cta: { label: 'Open LiveWatch', url: (process.env.APP_URL || 'https://livewatch-frontend.vercel.app') } });

  // Find all email channels linked to this monitor
  const links: any[] = await (MonitorNotification as any).findAll({ where: { monitorId: monitor.id } });
  if (!links.length) return;
  for (const link of links) {
    const chan = await (NotificationChannel as any).findByPk(link.channelId);
    if (chan && chan.type === 'email' && chan.destination) {
      try {
        await send(chan.destination, `[LiveWatch] ${title}: ${monitor.name}`, lines.join('\n'), html);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[notify] send failed', chan.destination, err);
      }
    }
  }
}
