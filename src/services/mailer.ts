import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransport() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secureFromPort = port === 465;
  const secureEnv = (process.env.SMTP_SECURE || '').toLowerCase() === 'true';
  const secure = secureEnv || secureFromPort;
  const requireTls = (process.env.SMTP_REQUIRE_TLS || '').toLowerCase() === 'true' || (!secure && port === 587);
  const debug = (process.env.SMTP_DEBUG || '').toLowerCase() === 'true';
  const connectionTimeout = Number(process.env.SMTP_CONN_TIMEOUT || 20000);
  const greetingTimeout = Number(process.env.SMTP_GREET_TIMEOUT || 20000);
  const socketTimeout = Number(process.env.SMTP_SOCKET_TIMEOUT || 30000);
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: requireTls,
    auth: process.env.SMTP_USER && (process.env.SMTP_PASS || process.env.EMAIL_PASSWORD)
      ? { user: process.env.SMTP_USER, pass: (process.env.SMTP_PASS || process.env.EMAIL_PASSWORD) as string }
      : undefined,
    logger: debug,
    debug,
    connectionTimeout,
    greetingTimeout,
    socketTimeout,
    tls: host ? { servername: host } : undefined,
  });
  return transporter;
}

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  const tr = getTransport();
  const from = process.env.SMTP_FROM || 'no-reply@livewatch.local';
  // eslint-disable-next-line no-console
  console.log('[smtp] sending', {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE || (Number(process.env.SMTP_PORT || 587) === 465),
    from,
    to,
    subject,
  });
  try {
    const info = await tr.sendMail({ from, to, subject, text, html });
    // eslint-disable-next-line no-console
    console.log('[smtp] sent', { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[smtp] send failed', err);
    throw err;
  }
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
      body { background:#0b0c0f; font-family: -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:#e5e7eb; padding:24px; }
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
        ${subtitle ? `<div class=\"st\">${escapeHtml(subtitle)}</div>` : ''}
      </div>
      <div class="ct">
        ${lines.map(l => `<div class=\"line\">${escapeHtml(l)}</div>`).join('')}
        ${cta ? `<a class=\"cta\" href=\"${encodeURI(cta.url)}\">${escapeHtml(cta.label)}</a>` : ''}
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
export async function verifySmtp() {
  try {
    const tr = getTransport();
    await tr.verify();
    // eslint-disable-next-line no-console
    console.log('[smtp] verified connection to', process.env.SMTP_HOST, process.env.SMTP_PORT);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[smtp] verification failed', err);
  }
}
