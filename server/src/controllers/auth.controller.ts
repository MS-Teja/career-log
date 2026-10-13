import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import type { LoginInput, RegisterInput, ResetPasswordInput, VerifyOtpInput } from '@career-log/shared';
import { allowedDomains, isAllowedEmail } from '../config/env';
import { signToken } from '../middleware/auth';
import { User } from '../models/User';
import { consumeOtp, issueOtp } from '../services/otp';
import { badRequest, conflict, forbidden, notFound, unauthorized } from '../utils/httpError';

export async function register(req: Request, res: Response) {
  const body = req.body as RegisterInput;
  if (!isAllowedEmail(body.email)) {
    throw badRequest(`Use your college email (${allowedDomains.map((d) => '@' + d).join(', ')})`, 'DOMAIN_NOT_ALLOWED');
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  const existing = await User.findOne({ email: body.email });
  if (existing?.isVerified) throw conflict('An account with this email already exists. Sign in instead.');

  // Everyone starts as a junior; seniors request access from Settings.
  const fields = { name: body.name, passwordHash, branch: body.branch, gradYear: body.gradYear };
  if (existing) {
    // Unverified account: let the person retry registration with fresh details.
    existing.set(fields);
    await existing.save();
  } else {
    await User.create({ ...fields, email: body.email, role: 'junior' });
  }

  await issueOtp(body.email, body.name);
  res.status(201).json({ email: body.email, message: 'We sent a 6-digit code to your email' });
}

export async function verifyOtp(req: Request, res: Response) {
  const { email, code } = req.body as VerifyOtpInput;
  const user = await User.findOne({ email });
  if (!user) throw notFound('No account for this email');
  await consumeOtp(email, code);
  if (!user.isVerified) {
    user.isVerified = true;
    await user.save();
  }
  res.json({ token: signToken(String(user._id)), user });
}

export async function resendOtp(req: Request, res: Response) {
  const { email } = req.body as { email: string };
  const user = await User.findOne({ email });
  // Don't reveal whether the account exists.
  if (user && !user.isVerified) await issueOtp(email, user.name);
  res.json({ message: 'If that account is awaiting verification, a new code is on its way' });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as LoginInput;
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw unauthorized('Incorrect email or password', 'BAD_CREDENTIALS');
  }
  if (!user.isVerified) {
    await issueOtp(email, user.name).catch(() => undefined); // cooldown errors are fine here
    throw forbidden('Verify your email first. We sent you a code.', 'UNVERIFIED');
  }
  res.json({ token: signToken(String(user._id)), user });
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body as { email: string };
  const user = await User.findOne({ email });
  // Same response either way so the endpoint can't be used to discover accounts.
  if (user)
    await issueOtp(email, user.name, 'reset').catch((err) => {
      if (err?.code !== 'OTP_COOLDOWN') throw err;
    });
  res.json({ message: 'If an account exists for that email, a reset code is on its way' });
}

export async function resetPassword(req: Request, res: Response) {
  const { email, code, password } = req.body as ResetPasswordInput;
  const user = await User.findOne({ email });
  if (!user) throw badRequest('This code has expired. Request a new one.', 'OTP_EXPIRED');
  await consumeOtp(email, code);
  user.passwordHash = await bcrypt.hash(password, 10);
  // Receiving the code proves the email works, so this also verifies the account.
  user.isVerified = true;
  await user.save();
  res.json({ token: signToken(String(user._id)), user });
}

export async function me(req: Request, res: Response) {
  const user = await User.findById(req.user!.id);
  if (!user) throw notFound();
  res.json({ user });
}

export async function config(_req: Request, res: Response) {
  res.json({ allowedDomains });
}
