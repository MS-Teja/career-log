import { Types } from 'mongoose';
import { badRequest } from './httpError';

export function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function toObjectId(id: unknown, label = 'id') {
  if (typeof id !== 'string' || !Types.ObjectId.isValid(id)) throw badRequest(`Invalid ${label}`);
  return new Types.ObjectId(id);
}
