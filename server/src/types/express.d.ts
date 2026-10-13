import type { Role } from '@career-log/shared';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role; name: string };
    }
  }
}

export {};
