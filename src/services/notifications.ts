import nodemailer from 'nodemailer';
export async function notify(payload: any) {
  if (payload.type === 'down') { await sendEmail(`Monitor ${payload.monitor.name} is DOWN`, `URL: ${payload.monitor.url}`); }
}
async function sendEmail(subject: string, text: string) {
  const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: false, auth: process.env.SMTP_USER && process.env.SMTP_PASS ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined });
  if (!process.env.NOTIFY_EMAIL_TO) return;
  await transporter.sendMail({ from: process.env.SMTP_FROM || 'no-reply@livewatch.local', to: process.env.NOTIFY_EMAIL_TO, subject, text });
}
