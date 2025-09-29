import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || '');

export async function sendEmail(to: string | string[], subject: string, text: string, html?: string) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set');
  }
  const from = process.env.RESEND_FROM || 'LiveWatch <no-reply@livewatch.local>';
  const toList = Array.isArray(to) ? to : [to];

  // eslint-disable-next-line no-console
  console.log('[resend] sending', { from, to: toList, subject });

  const { data, error } = await resend.emails.send({
    from,
    to: toList,
    subject,
    text,
    html: html || `<pre>${escapeHtml(text)}</pre>`,
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[resend] send failed', error);
    throw error;
  }

  // eslint-disable-next-line no-console
  console.log('[resend] sent', { id: (data as any)?.id || null });
}

export function renderEmailHtml(opts: { title: string; subtitle?: string; lines?: string[]; cta?: { label: string; url: string } | null }) {
  const title = opts.title;
  const subtitle = opts.subtitle || '';
  const lines = opts.lines || [];
  const cta = opts.cta || null;
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <style>
      body { background:#0b0c0f; font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:#e5e7eb; padding:24px; }
      .card { max-width:560px; margin:0 auto; background:#111827; border:1px solid #1f2937; border-radius:12px; overflow:hidden; }
      .hd { padding:20px 20px 0 20px; }
      .tt { font-size:18px; font-weight:600; color:#f9fafb; }
      .st { color:#9ca3af; margin-top:6px; }
      .ct { padding:16px 20px 24px 20px; }
      .line { margin:8px 0; color:#d1d5db; }
      .cta { display:inline-block; margin-top:16px; background:#10b981; color:#052e1b; text-decoration:none; padding:10px 14px; border-radius:8px; font-weight:600; }
      .ft { padding:14px 20px; border-top:1px solid #1f2937; color:#9ca3af; font-size:12px; }
      .badge { display:inline-block; background:#0ea5e9; color:#00121a; padding:2px 8px; border-radius:999px; font-weight:700; font-size:11px; letter-spacing:.04em; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="hd">
        <span class="badge">LiveWatch</span>
        <div class="tt">${escapeHtml(title)}</div>
        ${subtitle ? `<div class="st">${escapeHtml(subtitle)}</div>` : ''}
      </div>
      <div class="ct">
        ${lines.map(l => `<div class="line">${escapeHtml(l)}</div>`).join('')}
        ${cta ? `<a class="cta" href="${encodeURI(cta.url)}">${escapeHtml(cta.label)}</a>` : ''}
      </div>
      <div class="ft">You are receiving this because you are subscribed to monitor alerts.</div>
    </div>
  </body>
  </html>`;
}

function escapeHtml(input: string) {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}