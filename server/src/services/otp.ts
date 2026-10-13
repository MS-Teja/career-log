import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Otp } from '../models/Otp';
import { HttpError, badRequest } from '../utils/httpError';
import { sendOtpEmail } from './mailer';

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function issueOtp(email: string, name: string, purpose: 'verify' | 'reset' = 'verify') {
  const existing = await Otp.findOne({ email }).sort({ createdAt: -1 }).lean();
  if (existing && Date.now() - existing.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    throw new HttpError(429, 'Please wait a minute before requesting another code', 'OTP_COOLDOWN');
  }
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  await Otp.deleteMany({ email });
  await Otp.create({
    email,
    codeHash: await bcrypt.hash(code, 10),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });
  await sendOtpEmail(email, name, code, purpose);
}

export async function consumeOtp(email: string, code: string) {
  const otp = await Otp.findOne({ email });
  if (!otp || otp.expiresAt.getTime() < Date.now()) {
    throw badRequest('This code has expired. Request a new one.', 'OTP_EXPIRED');
  }
  if (otp.attempts >= MAX_ATTEMPTS) {
    await otp.deleteOne();
    throw new HttpError(429, 'Too many wrong attempts. Request a new code.', 'OTP_LOCKED');
  }
  const ok = await bcrypt.compare(code, otp.codeHash);
  if (!ok) {
    otp.attempts += 1;
    await otp.save();
    throw badRequest(`Incorrect code. ${MAX_ATTEMPTS - otp.attempts} attempts left.`, 'OTP_INVALID');
  }
  await otp.deleteOne();
}
