import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { HttpError } from '../utils/httpError';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ message: `No route for ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      message: err.issues[0]?.message ?? 'Invalid input',
      issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message, code: err.code });
    return;
  }
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ message: `Invalid ${err.path}` });
    return;
  }
  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({ message: Object.values(err.errors)[0]?.message ?? 'Invalid data' });
    return;
  }
  if (typeof err === 'object' && err && 'code' in err && err.code === 11000) {
    res.status(409).json({ message: 'That already exists' });
    return;
  }
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on our side' });
}
