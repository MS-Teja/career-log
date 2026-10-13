import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { HttpError } from '../utils/httpError';

const transporter =
  env.SMTP_USER && env.SMTP_PASS
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      })
    : null;

if (!transporter && env.NODE_ENV !== 'test') {
  console.log('[mail] SMTP not configured, emails will be printed to this console');
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function layout(name: string, bodyHtml: string) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto;color:#1C1B19">
      <h2 style="font-family:Georgia,serif;font-weight:600">Career Log</h2>
      <p>Hi ${escapeHtml(name)},</p>
      ${bodyHtml}
    </div>`;
}

interface Mail {
  to: string;
  name: string;
  subject: string;
  text: string;
  html: string;
}

async function send(mail: Mail, { critical }: { critical: boolean }) {
  if (!transporter || env.NODE_ENV === 'development') {
    if (env.NODE_ENV !== 'test') console.log(`[mail] to ${mail.to}: ${mail.subject}\n       ${mail.text.split('\n').join('\n       ')}`);
  }
  if (!transporter) return;
  try {
    await transporter.sendMail({
      from: `"Career Log" <${env.SMTP_USER}>`,
      to: mail.to,
      subject: mail.subject,
      text: `Hi ${mail.name},\n\n${mail.text}`,
      html: layout(mail.name, mail.html),
    });
  } catch (err) {
    console.error('[mail] failed to send', err);
    if (critical && env.NODE_ENV === 'production') throw new HttpError(502, 'Could not send the email. Try again shortly.');
  }
}

export function sendOtpEmail(to: string, name: string, code: string, purpose: 'verify' | 'reset' = 'verify') {
  const what = purpose === 'reset' ? 'password reset code' : 'verification code';
  return send(
    {
      to,
      name,
      subject: `${code} is your Career Log ${what}`,
      text: `Your Career Log ${what} is ${code}. It expires in 10 minutes.\n\nIf you didn't request this, you can ignore this email.`,
      html: `<p>Your ${what} is</p>
        <p style="font-size:32px;letter-spacing:8px;font-weight:700;font-family:monospace">${code}</p>
        <p style="color:#6B665E">It expires in 10 minutes. If you didn't request this, ignore this email.</p>`,
    },
    { critical: true },
  );
}

/** Non-critical notification; failures are logged, never surfaced to the request. */
export function sendNotice(to: string, name: string, subject: string, lines: string[], link?: string) {
  const url = link ? `${env.CLIENT_URL.split(',')[0]!.trim()}${link}` : undefined;
  const text = [...lines, url ? `\n${url}` : ''].join('\n');
  const html =
    lines.map((l) => `<p>${escapeHtml(l)}</p>`).join('') +
    (url ? `<p><a href="${url}" style="color:#4F46E5;font-weight:600">Open Career Log</a></p>` : '');
  void send({ to, name, subject, text, html }, { critical: false });
}
