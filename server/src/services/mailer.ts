import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { HttpError } from '../utils/httpError';

interface OutgoingMail {
  to: string;
  toName: string;
  subject: string;
  text: string;
  html: string;
}
type Transport = (mail: OutgoingMail) => Promise<void>;

/** Brevo's transactional email API over HTTPS. */
function brevoTransport(apiKey: string, from: string): Transport {
  return async (mail) => {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Career Log', email: from },
        to: [{ email: mail.to, name: mail.toName }],
        subject: mail.subject,
        textContent: mail.text,
        htmlContent: mail.html,
      }),
    });
    if (!res.ok) throw new Error(`Brevo responded ${res.status}: ${await res.text()}`);
  };
}

function smtpTransport(user: string, pass: string): Transport {
  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
  return async (mail) => {
    await transporter.sendMail({ from: `"Career Log" <${user}>`, to: mail.to, subject: mail.subject, text: mail.text, html: mail.html });
  };
}

const transport: Transport | null =
  env.BREVO_API_KEY && (env.MAIL_FROM ?? env.SMTP_USER)
    ? brevoTransport(env.BREVO_API_KEY, (env.MAIL_FROM ?? env.SMTP_USER)!)
    : env.SMTP_USER && env.SMTP_PASS
      ? smtpTransport(env.SMTP_USER, env.SMTP_PASS)
      : null;

if (env.NODE_ENV !== 'test') {
  if (env.BREVO_API_KEY && !transport) console.warn('[mail] BREVO_API_KEY is set but MAIL_FROM is missing; emails will not be sent');
  console.log(
    transport
      ? `[mail] sending via ${env.BREVO_API_KEY ? 'Brevo API' : 'Gmail SMTP'}`
      : '[mail] no email provider configured, emails will be printed to this console',
  );
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
  if (!transport || env.NODE_ENV === 'development') {
    if (env.NODE_ENV !== 'test') console.log(`[mail] to ${mail.to}: ${mail.subject}\n       ${mail.text.split('\n').join('\n       ')}`);
  }
  if (!transport) return;
  try {
    await transport({
      to: mail.to,
      toName: mail.name,
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
