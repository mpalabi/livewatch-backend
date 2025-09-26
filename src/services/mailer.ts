import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransport() {
  if (transporter) return transporter;
  const secureFromPort = Number(process.env.SMTP_PORT || 587) === 465;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true' || secureFromPort,
    auth: process.env.SMTP_USER && (process.env.SMTP_PASS || process.env.EMAIL_PASSWORD)
      ? { user: process.env.SMTP_USER, pass: (process.env.SMTP_PASS || process.env.EMAIL_PASSWORD) as string }
      : undefined,
  });
  return transporter;
}

export async function sendEmail(to: string, subject: string, text: string) {
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
    const info = await tr.sendMail({ from, to, subject, text });
    // eslint-disable-next-line no-console
    console.log('[smtp] sent', { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[smtp] send failed', err);
    throw err;
  }
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
