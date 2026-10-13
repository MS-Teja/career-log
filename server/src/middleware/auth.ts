import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@career-log/shared';
import { env } from '../config/env';
import { User } from '../models/User';
import { forbidden, unauthorized } from '../utils/httpError';

interface TokenPayload {
  sub: string;
}

export function signToken(userId: string) {
  return jwt.sign({ sub: userId } satisfies TokenPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

async function resolveUser(req: Request) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  let payload: TokenPayload;
  try {
    payload = jwt.verify(header.slice(7), env.JWT_SECRET) as TokenPayload;
  } catch {
    throw unauthorized('Your session has expired. Please sign in again.', 'TOKEN_INVALID');
  }
  // Load from the DB so role changes and deletions take effect immediately.
  const user = await User.findById(payload.sub).select('name role isVerified').lean();
  if (!user || !user.isVerified) throw unauthorized('Account not found or not verified', 'TOKEN_INVALID');
  return { id: String(user._id), role: user.role as Role, name: user.name };
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const user = await resolveUser(req);
  if (!user) throw unauthorized();
  req.user = user;
  next();
}

/** Attaches req.user when a valid token is present, but never rejects. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    req.user = (await resolveUser(req)) ?? undefined;
  } catch {
    req.user = undefined;
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw unauthorized();
    if (!roles.includes(req.user.role)) throw forbidden();
    next();
  };
}
