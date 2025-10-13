import { Resend } from 'resend';
import { renderEmailHtml, EmailTemplateOptions } from '../templates/email';

const resend = new Resend(process.env.RESEND_API_KEY || '');

export async function sendEmail(to: string | string[], subject: string, text: string, html?: string, template?: EmailTemplateOptions) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set');
  }
  const from = process.env.RESEND_FROM || 'LiveWatch <no-reply@livewatch.local>';
  const toList = Array.isArray(to) ? to : [to];

  // eslint-disable-next-line no-console
  console.log('[resend] sending', { from, to: toList, subject });

  const htmlBody = html || renderEmailHtml(
    template || {
      title: subject,
      subtitle: '',
      lines: (text || '').split('\n').filter(Boolean),
      cta: null,
    }
  );

  const { data, error } = await resend.emails.send({
    from,
    to: toList,
    subject,
    text,
    html: htmlBody,
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[resend] send failed', error);
    throw error;
  }

  // eslint-disable-next-line no-console
  console.log('[resend] sent', { id: (data as any)?.id || null });
}
export { renderEmailHtml };