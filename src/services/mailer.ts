import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransport() {
  if (transporter) return transporter;
  const secureFromPort = Number(process.env.SMTP_PORT || 587) === 465;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true' || secureFromPort,
    auth: process.env.SMTP_USER && process.env.SMTP_PASS ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

export async function sendEmail(to: string, subject: string, text: string) {
  const tr = getTransport();
  const from = process.env.SMTP_FROM || 'no-reply@livewatch.local';
  await tr.sendMail({ from, to, subject, text });
}


